---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: 22e8dddf4009c774170e452776050085_d74ebb8c89b511f1be80525400f8a581
    ReservedCode1: jGtifw7vBdQxQv2PQaoC/OiaOTx/mD/spWljZWQZ+3xQDN78lZeCw1iAzByIxxMNhSW2SJ4u2nb0udHvcRh5WFqijqoK846zkyKKusdpIm6g8hTYyGtGW1Boujpn33/toZb2jDC9R3RKOCI935JjtRkCZsKAPLhv6p8NqbFay7e3uWjorXEpO+YOS28=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: 22e8dddf4009c774170e452776050085_d74ebb8c89b511f1be80525400f8a581
    ReservedCode2: jGtifw7vBdQxQv2PQaoC/OiaOTx/mD/spWljZWQZ+3xQDN78lZeCw1iAzByIxxMNhSW2SJ4u2nb0udHvcRh5WFqijqoK846zkyKKusdpIm6g8hTYyGtGW1Boujpn33/toZb2jDC9R3RKOCI935JjtRkCZsKAPLhv6p8NqbFay7e3uWjorXEpO+YOS28=
---

# 交接区使用说明

| 你是谁 | 看哪个目录 | 什么时候行动 |
|--------|-----------|-------------|
| **Trae** | `marvis_outbox/pending/` 取任务 → 完成后写 `trae_outbox/pending/` | pending 里有新文件 |
| **WB**   | `trae_outbox/pending/` 取交付 → 完成后写 `wb_outbox/pending/` | pending 里有新文件 |
| **Marvis** | `wb_outbox/pending/` 取报告 → 审阅后更新文档 | pending 里有新文件 |

## 规则

1. 接任务时先读 `../status.json` 确认无冲突
2. 处理中的任务移到各自 `pending/` 并在文件内标记 `status: in_progress`
3. 完成后移到 `archived/`，同时在对方收件箱放结果
4. 不要直接编辑别人的 outbox
*（内容由AI生成，仅供参考）*
