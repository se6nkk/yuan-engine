use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};

use serde::Deserialize;
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;

/// 应用状态：用户选择的 Obsidian 同步目录（持久化到配置文件）
struct AppState {
    sync_dir: Mutex<Option<PathBuf>>,
}

#[derive(Deserialize)]
struct ObsidianFile {
    name: String,
    content: String,
}

/// 打开系统文件夹选择器（异步，不阻塞主线程），返回选中的目录路径并持久化
#[tauri::command]
async fn select_sync_dir(app: tauri::AppHandle) -> Option<String> {
    let app_clone = app.clone();
    let folder = tauri::async_runtime::spawn_blocking(move || {
        app_clone.dialog().file().blocking_pick_folder()
    })
    .await
    .ok()
    .flatten()?;
    let p = PathBuf::from(folder.to_string());

    if let Ok(cfg) = app.path().app_config_dir() {
        let _ = fs::create_dir_all(&cfg);
        let json = serde_json::json!({ "dir": p.to_string_lossy().to_string() });
        let _ = fs::write(cfg.join("sync_dir.json"), serde_json::to_string_pretty(&json).unwrap_or_default());
    }

    *app.state::<AppState>().sync_dir.lock().unwrap() = Some(p.clone());
    Some(p.to_string_lossy().to_string())
}

/// 返回当前已记录的同步目录（无则返回 null）
#[tauri::command]
fn get_sync_dir(app: tauri::AppHandle) -> Option<String> {
    app.state::<AppState>()
        .sync_dir
        .lock()
        .unwrap()
        .clone()
        .map(|p| p.to_string_lossy().to_string())
}

/// 把一组 .md 文件写入已选择的同步目录
#[tauri::command]
fn write_obsidian_files(app: tauri::AppHandle, files: Vec<ObsidianFile>) -> String {
    let dir = app.state::<AppState>().sync_dir.lock().unwrap().clone();
    let dir = match dir {
        Some(d) => d,
        None => return "NO_DIR".to_string(),
    };

    let mut written = 0usize;
    for f in files {
        // 文件名里不允许出现路径分隔符，避免越界写入
        let safe = f.name.replace(['/', '\\'], "_");
        let path = dir.join(safe);
        match fs::write(&path, f.content.as_bytes()) {
            Ok(_) => written += 1,
            Err(e) => return format!("ERR:{e}"),
        }
    }
    format!("OK:{written}|dir:{}", dir.to_string_lossy())
}

/// 诊断日志路径：在 .setup() 里解析为本机正确的「应用配置目录/diag.log」，
/// 避免写死开发者机器路径导致他人机器上日志失效。
static DIAG_PATH: OnceLock<PathBuf> = OnceLock::new();

/// 把诊断日志追加写入文件（macOS GUI 应用的 stdout 被路由到 os_log，故走文件通道才可靠）
fn log_to_file(s: &str) {
    // 路径尚未解析（run() 最早那次调用）时回退到临时目录，不影响启动
    let path = DIAG_PATH
        .get()
        .cloned()
        .unwrap_or_else(|| std::env::temp_dir().join("元引擎_diag.log"));
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(&path) {
        let _ = writeln!(f, "{}", s);
    }
}

/// 接收前端诊断日志并写入文件（用于无界面环境下排查 WebView 行为）
#[tauri::command]
fn frontend_log(msg: String) {
    log_to_file(&format!("[FRONTEND] {}", msg));
}

/// 通用 HTTP 代理：从 Rust 后端发起请求，规避 WebView 的 CORS 和网络墙限制
/// 返回 JSON：{ "status": 200, "body": "...", "content_type": "..." } 或 { "error": "..." }
#[tauri::command]
async fn proxy_fetch(url: String) -> serde_json::Value {
    let client = match reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)")
        .timeout(std::time::Duration::from_secs(10))
        .build()
    {
        Ok(c) => c,
        Err(e) => return serde_json::json!({ "error": e.to_string() })
    };

    let resp = match client.get(&url).send().await {
        Ok(r) => r,
        Err(e) => return serde_json::json!({ "error": e.to_string() })
    };

    let status = resp.status().as_u16();
    let content_type = resp.headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();

    let body = match resp.text().await {
        Ok(b) => b,
        Err(e) => return serde_json::json!({ "status": status, "content_type": content_type, "error": e.to_string() })
    };

    serde_json::json!({
        "status": status,
        "body": body,
        "content_type": content_type,
    })
}

/// 通过 Rust 后端代理百度百科 API 请求（绕过 WebView CORS 限制）
/// 返回 JSON：{ "summary": "...", "title": "...", "url": "..." } 或 null
#[tauri::command]
async fn fetch_baidu_baike(concept: String) -> Result<serde_json::Value, String> {
    let url = format!(
        "https://baike.baidu.com/api/search/word?word={}",
        urlencoding(&concept)
    );
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Ok(serde_json::Value::Null);
    }
    let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    let mut summary = String::new();
    let mut title = concept.clone();
    let mut lemma_url = String::new();

    if let Some(data) = body.get("data") {
        // 直接命中
        if let Some(desc) = data.get("lemmaDesc").and_then(|v| v.as_str()) {
            summary = desc.to_string();
        }
        if let Some(t) = data.get("lemmaTitle").and_then(|v| v.as_str()) {
            title = t.to_string();
        }
        // 多义词列表
        if summary.is_empty() {
            if let Some(list) = data.get("lemmaList").and_then(|v| v.as_array()) {
                if let Some(first) = list.first() {
                    if let Some(desc) = first.get("lemmaDesc").and_then(|v| v.as_str()) {
                        summary = desc.to_string();
                    }
                    if let Some(t) = first.get("lemmaTitle").and_then(|v| v.as_str()) {
                        title = t.to_string();
                    }
                    if let Some(id) = first.get("lemmaId") {
                        lemma_url = format!("https://baike.baidu.com/item/{}/{}", title, id);
                    }
                }
            }
        }
    }

    if summary.is_empty() {
        Ok(serde_json::Value::Null)
    } else {
        Ok(serde_json::json!({
            "summary": truncate_str(&summary, 600),
            "title": title,
            "url": lemma_url,
        }))
    }
}

/// 简单 URL 编码（仅编码中文和特殊字符，保持字母数字不变）
fn urlencoding(s: &str) -> String {
    let mut result = String::with_capacity(s.len() * 3);
    for &b in s.as_bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => result.push(b as char),
            _ => {
                result.push('%');
                result.push_str(&format!("{:02X}", b));
            }
        }
    }
    result
}

/// 按字符边界截断 UTF-8 字符串
fn truncate_str(s: &str, max_bytes: usize) -> &str {
    if s.len() <= max_bytes { return s; }
    let mut end = max_bytes;
    while end > 0 && !s.is_char_boundary(end) {
        end -= 1;
    }
    &s[..end]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    log_to_file("[APP] run() entered");
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            sync_dir: Mutex::new(None),
        })
        .setup(|app| {
            // 启动时解析本机正确的应用配置目录，并缓存诊断日志路径
            if let Ok(cfg) = app.path().app_config_dir() {
                let _ = fs::create_dir_all(&cfg);
                let _ = DIAG_PATH.set(cfg.join("diag.log"));
                // 启动时从配置文件恢复上次选择的同步目录
                if let Ok(s) = fs::read_to_string(cfg.join("sync_dir.json")) {
                    if let Ok(v) = serde_json::from_str::<serde_json::Value>(&s) {
                        if let Some(d) = v.get("dir").and_then(|d| d.as_str()) {
                            *app.state::<AppState>().sync_dir.lock().unwrap() = Some(PathBuf::from(d));
                        }
                    }
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            select_sync_dir,
            get_sync_dir,
            write_obsidian_files,
            frontend_log,
            fetch_baidu_baike,
            proxy_fetch
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
