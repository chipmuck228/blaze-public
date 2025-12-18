# Course Import Template Guide

## 快速开始

1. 下载模板文件：`course-import-template.csv`
2. 使用 Excel、Google Sheets 或其他 CSV 编辑器打开
3. 按照下面的说明填写数据
4. 保存为 CSV 格式
5. 在 Admin Portal 中使用 "Bulk Import Courses" 功能上传

## 字段说明

### 必填字段

#### Course Name (课程名称)
- **类型**：文本
- **长度**：1-200 字符
- **说明**：课程的完整名称
- **示例**：`Introduction to Robotics with VEX GO`

### 可选字段

#### Slug (URL 标识符)
- **类型**：文本
- **格式**：只包含小写字母、数字、连字符
- **说明**：如果留空，系统会根据课程名称和目标年级自动生成
- **示例**：`introduction-to-robotics-vex-go`

#### Description (课程描述)
- **类型**：多行文本
- **说明**：课程的详细描述，支持多行（在 CSV 中用 `\n` 表示换行）
- **示例**：`"Learn the basics of robotics using VEX GO kits.\nStudents will build and program robots."`

#### Target Audience (目标受众)
- **类型**：文本
- **说明**：描述课程适合的学员群体
- **示例**：`Students aged 8-12 interested in STEM`

#### Learning Outcomes (学习成果)
- **类型**：多行文本
- **说明**：学员完成课程后能够达到的学习目标，支持多行（用 `\n` 分隔）
- **示例**：`"1. Understand basic robotics concepts\n2. Learn to build robots\n3. Program robots"`

#### Prerequisites (先修要求)
- **类型**：文本
- **说明**：学习本课程前需要具备的知识或技能
- **示例**：`Basic math skills, no prior programming experience required`

#### Cancellation Policy (取消政策)
- **类型**：文本
- **说明**：课程取消和退款政策
- **示例**：`Full refund if cancelled 7 days before start date`

#### Number of Sessions (课程节数)
- **类型**：整数
- **说明**：课程包含的总节数
- **示例**：`10`

#### Target Age Min (最小年龄)
- **类型**：整数
- **说明**：课程适合的最小年龄
- **示例**：`8`

#### Target Age Max (最大年龄)
- **类型**：整数
- **说明**：课程适合的最大年龄
- **要求**：必须 >= Target Age Min
- **示例**：`12`

#### Target Grades (目标年级)
- **类型**：文本（多个值用分号分隔）
- **格式**：年级范围，如 `K-2`、`3-5`、`6-8`
- **说明**：多个年级范围用分号 `;` 分隔
- **示例**：`K-2;3-5` 或 `6-8`

#### Base Price (基础价格)
- **类型**：数字（可以有小数）
- **说明**：课程的基础价格
- **示例**：`299.99`

#### Currency (货币)
- **类型**：文本（ISO 4217 货币代码）
- **默认值**：`USD`
- **说明**：价格使用的货币代码
- **示例**：`USD`、`CAD`、`EUR`

#### Status (课程状态)
- **类型**：文本（枚举值）
- **可选值**：
  - `draft`：草稿（默认值）
  - `published`：已发布
  - `suspended`：已暂停
  - `archived`：已归档
- **默认值**：`draft`
- **示例**：`draft`

#### Subcategories (子类别标签)
- **类型**：文本（多个值用分号分隔）
- **说明**：课程的标签分类，使用系统中已存在的子类别 `display_name`
- **要求**：必须匹配系统中已存在的子类别名称
- **示例**：`RoboQuests;LaunchPad` 或 `RoboChamps`

## 填写示例

### 示例 1：基础课程

```csv
Course Name,Slug,Description,Target Audience,Learning Outcomes,Prerequisites,Cancellation Policy,Number of Sessions,Target Age Min,Target Age Max,Target Grades,Base Price,Currency,Status,Subcategories
Introduction to Robotics,intro-robotics,"Learn robotics basics","Ages 8-12","1. Build robots\n2. Program robots","None","7 days notice",10,8,12,"K-2;3-5",299.99,USD,draft,"RoboQuests"
```

### 示例 2：高级课程

```csv
Course Name,Slug,Description,Target Audience,Learning Outcomes,Prerequisites,Cancellation Policy,Number of Sessions,Target Age Min,Target Age Max,Target Grades,Base Price,Currency,Status,Subcategories
Advanced Programming,advanced-prog,"Advanced robot programming","Ages 10-14","1. Complex behaviors\n2. Competition prep","Intro course required","14 days notice",12,10,14,"6-8",399.99,USD,draft,"RoboChamps"
```

## 常见问题

### Q: 如何输入多行文本？
A: 在 CSV 文件中，多行文本需要用双引号包裹，换行用 `\n` 表示。例如：
```
"Line 1\nLine 2\nLine 3"
```

### Q: 如何输入多个年级或标签？
A: 使用分号 `;` 分隔多个值。例如：
```
K-2;3-5;6-8
RoboQuests;LaunchPad
```

### Q: Slug 字段必须填写吗？
A: 不是必须的。如果留空，系统会根据课程名称和目标年级自动生成。

### Q: 如何查看系统中已有的子类别？
A: 在 Admin Portal 的 "Subcategories" 页面查看所有可用的子类别 `display_name`。

### Q: 如果导入失败怎么办？
A: 系统会提供详细的错误报告，包括：
- 错误行号
- 错误字段
- 错误原因
- 建议的修复方法

### Q: 可以导入多少课程？
A: 建议每次导入不超过 100 门课程。对于大量数据，可以分批导入。

### Q: 导入的课程默认状态是什么？
A: 默认状态是 `draft`（草稿），可以在导入后批量修改状态。

## 数据验证规则

### 必填字段
- ✅ Course Name：不能为空

### 数据类型
- ✅ Number of Sessions：必须是正整数
- ✅ Target Age Min/Max：必须是正整数
- ✅ Base Price：必须是正数（可以有小数）
- ✅ Currency：必须是有效的 ISO 4217 货币代码

### 业务规则
- ✅ Target Age Min <= Target Age Max
- ✅ Slug：如果提供，必须是 URL 友好的（只包含小写字母、数字、连字符）
- ✅ Status：必须是 `draft`、`published`、`suspended`、`archived` 之一
- ✅ Subcategories：必须匹配系统中已存在的子类别名称

### 唯一性
- ✅ Slug：如果提供，必须唯一（不与其他课程重复）

## 导入流程

1. **准备数据**
   - 下载模板文件
   - 填写课程信息
   - 检查数据格式

2. **上传文件**
   - 在 Admin Portal 点击 "Bulk Import Courses"
   - 选择 CSV 文件
   - 点击上传

3. **预览和验证**
   - 查看数据预览
   - 检查验证结果
   - 修复错误（如有）

4. **确认导入**
   - 查看导入摘要
   - 确认导入设置
   - 开始导入

5. **查看结果**
   - 查看导入统计
   - 下载错误报告（如有）
   - 查看成功导入的课程

## 技术支持

如有问题，请联系系统管理员或查看详细文档。

