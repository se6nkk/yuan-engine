import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Vite + Tauri 单文件管线：app.js 作为 ES module 打包后，由 vite-plugin-singlefile
// 全部内联进单个 dist/index.html。Tauri WebView 不加载外部 <script src>，必须内联。
// base: './' 保证产物在 Tauri 的 asset 协议下以相对路径加载，dev/prod 完全一致。
export default defineConfig({
  root: '.',
  base: './',
  plugins: [viteSingleFile()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    assetsInlineLimit: 0,
    rollupOptions: {
      input: 'index.html',
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
