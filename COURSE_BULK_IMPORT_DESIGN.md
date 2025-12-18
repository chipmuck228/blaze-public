# Course Bulk Import Design

## 1. 概述

设计一个批量导入课程的系统，允许管理员通过文件上传的方式一次性导入多个课程。

## 2. 文件格式选择

### 推荐格式：CSV (Comma-Separated Values)
- **优点**：
  - 简单易用，Excel、Google Sheets 等工具都支持
  - 易于编辑和验证
  - 文件大小小
  - 跨平台兼容性好
- **缺点**：
  - 不支持多行文本（需要特殊处理）
  - 不支持富文本格式

### 备选格式：Excel (.xlsx)
- **优点**：
  - 支持多行文本
  - 更好的数据验证和格式化
  - 支持多个工作表
- **缺点**：
  - 需要额外的库解析（如 `xlsx`）
  - 文件大小较大

### 备选格式：JSON
- **优点**：
  - 结构化数据，支持复杂类型
  - 易于程序处理
- **缺点**：
  - 不适合非技术人员编辑

**推荐使用 CSV 格式**，因为最易用且满足需求。

## 3. CSV 模板设计

### 3.1 字段定义

| 列名 | 字段名 | 类型 | 必填 | 说明 | 示例 |
|------|--------|------|------|------|------|
| Course Name | name | string | ✅ | 课程名称 | Introduction to Robotics with VEX GO |
| Slug | slug | string | ❌ | URL友好的标识符，留空则自动生成 | introduction-to-robotics-vex-go |
| Description | description | text | ❌ | 课程描述（支持多行，用 `\n` 分隔） | Learn the basics of robotics... |
| Target Audience | target_audience | text | ❌ | 目标受众描述 | Students interested in STEM |
| Learning Outcomes | outcomes | text | ❌ | 学习成果（支持多行，用 `\n` 分隔） | 1. Understand robotics concepts\n2. Build basic robots |
| Prerequisites | prerequisites | text | ❌ | 先修要求 | Basic math skills |
| Cancellation Policy | cancellation_policy | text | ❌ | 取消政策 | Full refund if cancelled 7 days before |
| Number of Sessions | number_of_sessions | number | ❌ | 课程节数 | 10 |
| Target Age Min | target_age_min | number | ❌ | 最小年龄 | 8 |
| Target Age Max | target_age_max | number | ❌ | 最大年龄 | 12 |
| Target Grades | target_grades | string | ❌ | 目标年级，多个用分号分隔 | K-2;3-5 |
| Base Price | base_price | number | ❌ | 基础价格 | 299.99 |
| Currency | currency | string | ❌ | 货币代码，默认 USD | USD |
| Status | status | string | ❌ | 课程状态：draft/published/suspended/archived，默认 draft | draft |
| Subcategories | subcategories | string | ❌ | 子类别标签，多个用分号分隔（使用 display_name） | RoboQuests;LaunchPad |

### 3.2 CSV 模板示例

```csv
Course Name,Slug,Description,Target Audience,Learning Outcomes,Prerequisites,Cancellation Policy,Number of Sessions,Target Age Min,Target Age Max,Target Grades,Base Price,Currency,Status,Subcategories
Introduction to Robotics with VEX GO,introduction-to-robotics-vex-go,"Learn the basics of robotics using VEX GO kits. Students will build and program robots to complete various challenges.","Students aged 8-12 interested in STEM","1. Understand basic robotics concepts\n2. Learn to build robots using VEX GO\n3. Program robots to complete tasks","Basic math skills, no prior programming experience required","Full refund if cancelled 7 days before start date",10,8,12,"K-2;3-5",299.99,USD,draft,"RoboQuests;LaunchPad"
Advanced VEX IQ Programming,advanced-vex-iq-programming,"Advanced programming techniques for VEX IQ robots.","Students who have completed Introduction to Robotics","1. Master advanced programming concepts\n2. Build complex robot behaviors\n3. Compete in robot challenges","Introduction to Robotics with VEX GO or equivalent",,12,10,14,"6-8",399.99,USD,draft,"RoboChamps"
```

### 3.3 特殊字段处理

1. **多行文本字段**（Description, Learning Outcomes 等）：
   - 在 CSV 中用双引号包裹
   - 换行符用 `\n` 表示
   - 如果包含双引号，用两个双引号 `""` 转义

2. **数组字段**（Target Grades, Subcategories）：
   - 多个值用分号 `;` 分隔
   - 示例：`K-2;3-5;6-8`

3. **空值处理**：
   - 可选字段可以留空
   - 空值会被设置为 `null` 或使用默认值

## 4. 数据验证规则

### 4.1 必填字段验证
- `name`：不能为空，长度 1-200 字符

### 4.2 数据类型验证
- `number_of_sessions`：必须是正整数
- `target_age_min`、`target_age_max`：必须是正整数，且 `target_age_min <= target_age_max`
- `base_price`：必须是正数（可以有小数）
- `currency`：必须是有效的 ISO 4217 货币代码（如 USD, CAD, EUR）
- `status`：必须是 `draft`、`published`、`suspended`、`archived` 之一

### 4.3 业务逻辑验证
- `slug`：如果提供，必须是 URL 友好的（只包含小写字母、数字、连字符）
- `target_grades`：格式必须正确（如 `K-2`、`3-5`、`6-8`）
- `subcategories`：必须匹配系统中已存在的子类别 `display_name`

### 4.4 唯一性验证
- `slug`：如果提供，必须唯一（不与其他课程重复）

## 5. 导入流程设计

### 5.1 前端流程

1. **文件上传**
   - 用户点击 "Bulk Import Courses" 按钮
   - 打开文件选择对话框
   - 只允许选择 `.csv` 文件
   - 显示文件大小限制（如 5MB）

2. **文件预览**
   - 解析 CSV 文件
   - 显示前 5 行数据预览
   - 显示字段映射确认
   - 显示预计导入的课程数量

3. **验证**
   - 客户端预验证（快速反馈）
   - 显示验证结果：
     - ✅ 通过的行数
     - ⚠️ 警告的行数（有可选字段问题）
     - ❌ 错误的行数（有必填字段或格式问题）
   - 显示详细的错误信息（行号、字段、错误原因）

4. **导入确认**
   - 显示导入摘要：
     - 总行数
     - 有效行数
     - 错误行数
     - 警告行数
   - 用户确认后开始导入

5. **导入进度**
   - 显示进度条
   - 显示当前处理的课程
   - 显示成功/失败计数

6. **导入结果**
   - 显示导入摘要：
     - 成功导入的课程数量
     - 失败的课程数量
     - 跳过的课程数量（如 slug 重复）
   - 提供错误报告下载（CSV 格式，包含错误详情）
   - 提供成功导入的课程列表

### 5.2 后端流程

1. **文件接收**
   - 接收上传的 CSV 文件
   - 验证文件类型和大小

2. **文件解析**
   - 使用 CSV 解析库（如 `papaparse`）解析文件
   - 处理编码问题（UTF-8 with BOM）
   - 处理特殊字符和换行符

3. **数据验证**
   - 逐行验证数据
   - 收集所有验证错误
   - 返回详细的验证报告

4. **批量创建**
   - 使用事务确保数据一致性
   - 逐行创建课程（可以批量优化）
   - 处理子类别标签关联
   - 记录每个课程的成功/失败状态

5. **结果返回**
   - 返回导入结果摘要
   - 返回错误详情（如果有）
   - 返回成功创建的课程 ID 列表

## 6. API 设计

### 6.1 验证 API

```
POST /api/admin/courses/bulk-import/validate
Content-Type: multipart/form-data

Request:
- file: File (CSV file)

Response:
{
  "valid": boolean,
  "totalRows": number,
  "validRows": number,
  "errorRows": number,
  "warningRows": number,
  "errors": [
    {
      "row": number,
      "field": string,
      "message": string,
      "value": any
    }
  ],
  "warnings": [
    {
      "row": number,
      "field": string,
      "message": string,
      "value": any
    }
  ],
  "preview": [
    {
      "row": number,
      "data": Course
    }
  ]
}
```

### 6.2 导入 API

```
POST /api/admin/courses/bulk-import
Content-Type: multipart/form-data

Request:
- file: File (CSV file)
- skipErrors: boolean (是否跳过错误行继续导入)

Response:
{
  "success": boolean,
  "totalRows": number,
  "imported": number,
  "failed": number,
  "skipped": number,
  "results": [
    {
      "row": number,
      "status": "success" | "failed" | "skipped",
      "courseId": string | null,
      "errors": string[]
    }
  ],
  "errors": [
    {
      "row": number,
      "field": string,
      "message": string
    }
  ]
}
```

## 7. UI/UX 设计

### 7.1 导入按钮位置
- 在 Admin Courses 页面顶部，与 "Add Course" 按钮并排
- 按钮文本："Bulk Import Courses"
- 图标：Upload 或 FileText

### 7.2 导入对话框
- 使用 Dialog 组件
- 步骤指示器（Stepper）：
  1. 上传文件
  2. 预览和验证
  3. 导入确认
  4. 导入进度
  5. 导入结果

### 7.3 错误显示
- 使用表格显示错误详情
- 可排序和筛选
- 点击错误行可以查看完整数据
- 提供导出错误报告功能

### 7.4 成功反馈
- 显示成功导入的课程列表
- 提供链接直接跳转到课程详情
- 显示导入统计信息

## 8. 错误处理策略

### 8.1 文件级别错误
- 文件格式错误：提示用户下载模板
- 文件过大：提示文件大小限制
- 编码问题：自动检测并转换编码

### 8.2 数据级别错误
- 必填字段缺失：标记为错误，不导入
- 数据类型错误：标记为错误，不导入
- 业务逻辑错误（如 slug 重复）：标记为跳过，不导入
- 可选字段格式问题：标记为警告，使用默认值继续导入

### 8.3 系统级别错误
- 数据库连接失败：回滚所有更改
- 部分导入失败：记录失败的行，继续处理其他行
- 提供详细的错误日志

## 9. 性能优化

### 9.1 批量处理
- 使用数据库批量插入（如果支持）
- 分批处理（如每批 50 条）
- 使用事务确保一致性

### 9.2 异步处理
- 对于大量数据（>100 条），考虑使用后台任务
- 使用 WebSocket 或轮询更新进度
- 提供导入历史记录

### 9.3 缓存优化
- 缓存子类别列表（避免重复查询）
- 缓存验证规则

## 10. 模板文件

### 10.1 提供下载模板
- 在导入对话框中提供 "Download Template" 按钮
- 模板文件包含：
  - 所有字段的列头
  - 示例数据行
  - 字段说明注释（CSV 注释行或单独说明文档）

### 10.2 模板文件位置
- 存储在 `public/templates/course-import-template.csv`
- 或通过 API 动态生成

## 11. 安全考虑

### 11.1 文件验证
- 验证文件类型（MIME type 和扩展名）
- 验证文件大小
- 扫描恶意内容（如果可能）

### 11.2 权限控制
- 只有 admin 角色可以导入
- 记录导入操作日志（谁、何时、导入了什么）

### 11.3 数据清理
- 清理上传的临时文件
- 防止路径遍历攻击
- 验证所有输入数据

## 12. 测试用例

### 12.1 正常流程
- 上传有效的 CSV 文件
- 验证所有字段正确解析
- 确认所有课程成功创建

### 12.2 错误处理
- 上传格式错误的文件
- 上传包含错误数据的文件
- 上传包含重复 slug 的文件
- 上传超大文件

### 12.3 边界情况
- 空文件
- 只有表头的文件
- 包含特殊字符的数据
- 包含多行文本的数据
- 包含大量数据的文件（性能测试）

## 13. 实施优先级

### Phase 1: 基础功能
1. CSV 文件上传和解析
2. 基本数据验证
3. 批量创建课程
4. 简单的错误报告

### Phase 2: 增强功能
1. 文件预览
2. 详细的验证报告
3. 导入进度显示
4. 错误报告导出

### Phase 3: 高级功能
1. 异步批量处理
2. 导入历史记录
3. 模板自定义
4. 数据映射配置

## 14. 依赖库

- `papaparse`：CSV 解析库
- `xlsx`（可选）：Excel 文件支持
- `zod` 或 `yup`：数据验证

## 15. 文件结构

```
src/
  app/
    api/
      admin/
        courses/
          bulk-import/
            route.ts          # 导入 API
            validate/
              route.ts        # 验证 API
  components/
    admin/
      BulkImportCoursesDialog.tsx  # 导入对话框组件
      ImportPreview.tsx             # 预览组件
      ImportResults.tsx             # 结果组件
  lib/
    csv-parser.ts            # CSV 解析工具
    course-validator.ts      # 课程数据验证
public/
  templates/
    course-import-template.csv  # 模板文件
```

