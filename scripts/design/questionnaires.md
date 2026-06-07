# Catalog CSV 脚本问答（Questionnaires）

运营与开发在使用 offering / instance CSV 工具链时的常见问题。规格详见 `offering-csv-import.md`、`instance-csv-import.md`。

---

## Q: `bootstrap-offering-csv.js` 是做什么用的？`export-offerings.js` 是做什么用的？它们有什么不同？

**日期：** 2026-06-04

两个脚本底层都调用同一个核心函数 `exportOfferingsForType()`（`scripts/lib/import-offerings-common.js`），但定位不同：**一个是批量初始化 + 自检，一个是单 type 日常导出**。

### `export-offerings.js` — 单 type 导出

**用途：** 从当前 Supabase 库把**某一个** offering type 的 `v2_offering` 导出成 schema CSV + manifest，供编辑后再用 `import-offerings.js` 导入。

**典型用法：**

```bash
# 导出 camp 产品（默认 → scripts/output/Blaze-Offerings-camp.csv + -schema.json）
node scripts/export-offerings.js --type camp

# 只生成空模板（含示例行）
node scripts/export-offerings.js --type camp --write-template

# 可选：按 status 过滤、自定义输出路径
node scripts/export-offerings.js --type camp --status published --out my.csv
```

**特点：**

- **必须** `--type camp|course|…`
- 一次只处理 **1 个 type**
- 默认输出：`scripts/output/Blaze-Offerings-{code}.csv` + 同目录 manifest
- 模板模式输出：`scripts/templates/offerings-{code}-template.csv`
- 不做 dry-run 验证、不生成清单、不遍历全部 type

**适合：** 日常运维 — 「我要改 camp 产品表，先从 DB 拉一份最新 CSV」。

---

### `bootstrap-offering-csv.js` — 全 type 批量 bootstrap + 验证

**用途：** 对**所有 active** 的 `v2_offering_type` 做一轮「模板生成 +（有数据时）导出 + dry-run 往返验证 + 清单」，相当于 catalog 导入体系的**健康检查 / 首次搭建**。

**典型用法：**

```bash
node scripts/bootstrap-offering-csv.js --list            # 列出全部 active type 及数量
node scripts/bootstrap-offering-csv.js                   # 完整流程
node scripts/bootstrap-offering-csv.js --templates-only  # 只刷新 templates
node scripts/bootstrap-offering-csv.js --verify-only     # 只验证（不重新写 template）
```

**对每个 active type 会：**

1. **写模板** → `scripts/templates/offerings-{code}-template.csv` + manifest（与 `export-offerings.js --write-template` 同类）
2. **若库里有该 type 的产品** → 再 export 到 `scripts/output/bootstrap/Blaze-Offerings-{code}.csv`，并对该文件跑 **dry-run import** 验证 export/import 闭环
3. **汇总** → `scripts/output/offering-types-inventory.json` / `.md`，以及 bootstrap 报告 JSON
4. （默认）**更新** `scripts/design/offering-csv-import.md` 里的 type 清单表

**特点：**

- **不需要** `--type`，自动遍历全部 active type
- 带 **verify**（round-trip dry-run），失败会 exit 1
- 验证用 export 落在 `scripts/output/bootstrap/`（与 `export-offerings.js` 默认的 `scripts/output/` 不同）
- 更像 **DevOps / 首次配置 / schema 变更后** 用的批处理工具

**适合：** 新环境、改了 `offering_schema`、想确认所有 type 的 CSV 列与导入逻辑是否一致。

---

### 对比一览


|                | `export-offerings.js`                             | `bootstrap-offering-csv.js`                |
| -------------- | ------------------------------------------------- | ------------------------------------------ |
| 范围             | 单个 `--type`                                       | 全部 active offering type                    |
| 主要动作           | DB → CSV（或写 template）                             | template + export + dry-run 验证 + inventory |
| 默认 CSV 路径      | `scripts/output/Blaze-Offerings-{code}.csv`       | 验证用 export 在 `scripts/output/bootstrap/`   |
| 模板路径           | `scripts/templates/offerings-{code}-template.csv` | 同上（批量生成）                                   |
| 是否验证导入         | 否                                                 | 是（有数据时 dry-run）                            |
| 是否生成 inventory | 否                                                 | 是                                          |
| 典型场景           | 日常编辑某一 type                                       | 首次使用 / schema 变更 / 全量自检                    |


---

### 怎么选？

- **只维护 camp 或 course 一份表** → `export-offerings.js --type camp`
- **刚 clone 仓库、空库或刚跑完 v2 DDL** → 先 `bootstrap-offering-csv.js --list`，再 `bootstrap-offering-csv.js` 生成各 type 模板；有数据后会顺带验证
- **Admin 改了 offering type 的 schema 字段** → 两个都可以刷新 CSV 列；想确认所有 type 都没问题就用 bootstrap

两者导出的 CSV 格式相同，都可以用 `import-offerings.js --type {code} --file …` 导入；差别在于 bootstrap 是**批量 + 自检**，export 是**单 type、轻量、日常**。

---

### 相关脚本（instance 侧类比）


| Offering                    | Instance                    |
| --------------------------- | --------------------------- |
| `export-offerings.js`       | `export-instances.js`       |
| `bootstrap-offering-csv.js` | `bootstrap-instance-csv.js` |
| `import-offerings.js`       | `import-instances.js`       |


Instance 侧逻辑与上表相同，只是表为 `v2_instance`、列来自 `instance_schema`。

---

## Q: `offerings-course-template-schema.json` 这个文件是干什么用的？

**日期：** 2026-06-04

它是 `**offerings-course-template.csv` 的 companion manifest（列 / schema 快照）**，在 export 或 bootstrap 写模板时与 CSV **成对**自动生成。

**文件里主要包含：**

- `offering_type_code` / `offering_type_id` — 对应 `v2_offering_type` 的 `course`
- `schema_hash` — 导出时 DB 里 `offering_schema` 的哈希，用于检测 schema 是否已变更
- `fixed_columns` — 固定列（`id`, `Title`, `Program (tag)`, `Status` 等）
- `columns` — 动态列：CSV 表头（如 `content|description`）、写入 JSON 的路径、类型、是否必填等

**作用：**

1. **描述 CSV 列结构** — 说明 course 产品在表格里应有哪些列、如何映射到 `type_config_data`
2. **导入时做 schema drift 对比** — 与当前数据库里的 schema 比较，不一致时输出警告（Admin 改过字段定义后常见）
3. **不含业务数据** — 只有元数据，不是产品行本身

**命名规则：** `{csv 文件名去掉 .csv}-schema.json`


| CSV                             | Manifest                                |
| ------------------------------- | --------------------------------------- |
| `offerings-course-template.csv` | `offerings-course-template-schema.json` |
| `Blaze-Offerings-course.csv`    | `Blaze-Offerings-course-schema.json`    |


Admin 修改 course 的 offering schema 后，应重新 `export-offerings.js --type course --write-template` 或 `bootstrap-offering-csv.js --templates-only`，同时刷新 CSV 与 manifest。

---

## Q: 做 import 时要同时用到 schema json 吗？和数据文件必须放在同一个目录下吗？

**日期：** 2026-06-04

**默认找法：** 与 CSV **同目录**，文件名为 `{CSV basename}-schema.json`（见 `defaultManifestPath` / `defaultInstanceManifestPath`）。

**是否强制 — offering 与 instance 不同：**


|             | `import-offerings.js`                     | `import-instances.js`                     |
| ----------- | ----------------------------------------- | ----------------------------------------- |
| manifest 缺失 | **不退出**；跳过 drift 检查，仍用 DB 现网 schema 导入    | **exit 1**；必须存在 manifest 文件               |
| manifest 用途 | mainly schema drift 警告                    | mainly schema drift 警告                    |
| 列解析来源       | 始终来自 DB `preflight`（现网 `offering_schema`） | 始终来自 DB `preflight`（现网 `instance_schema`） |


**结论：**

- **Offering 导入：** schema json **建议有**（便于 drift 提示），**没有也能跑**。
- **Instance 导入：** schema json **必须有文件**；缺了会报 `Schema manifest not found`。
- **目录：** 默认要求 CSV 与 manifest **同目录、basename 配对**；若分开存放，可用 `--manifest /path/to/file-schema.json` 显式指定。

**实践建议：**

1. Export 后 **CSV 与 `-schema.json` 一起拷贝**，不要只挪 CSV。
2. 重新 export / bootstrap 会成对生成，最省心。
3. Clone 后直接 import 仓库内 `scripts/output/Blaze-*.csv` 常会失败（缺 sibling manifest 或 UUID 来自别的库）— 应先对自己的 DB 做 bootstrap / export。

**示例（manifest 不在同目录时）：**

```bash
node scripts/import-offerings.js --type course \
  --file /path/to/my-offerings.csv \
  --manifest /other/path/my-offerings-schema.json

node scripts/import-instances.js --type camp \
  --file /path/to/instances.csv \
  --manifest /other/path/instances-schema.json
```

