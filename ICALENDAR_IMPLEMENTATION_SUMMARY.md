# iCalendar (RFC5545) 实施总结

## ✅ 已完成的工作

### Phase 1: 数据库迁移 ✅
- ✅ 创建了 `migrate-add-icalendar-fields.sql` 迁移脚本
- ✅ 添加了以下字段到 `course_instances` 表：
  - `icalendar_rrule` - 重复规则（RRULE）
  - `icalendar_exdates` - 排除日期数组（EXDATE）
  - `icalendar_rdates` - 额外日期数组（RDATE，用于改期）
  - `timezone` - 时区（默认 'America/Los_Angeles'）
- ✅ 创建了 `course_instance_exceptions` 表（可选，用于更详细的例外管理）

### Phase 2: TypeScript 类型定义 ✅
- ✅ 更新了 `CourseInstance` 接口，添加了 iCalendar 字段
- ✅ 创建了 `CourseInstanceException` 接口

### Phase 3: 工具函数库 ✅
- ✅ 创建了 `src/lib/icalendar.ts` 工具函数库
- ✅ 实现了以下函数：
  - `generateRRULE()` - 从现有字段生成 RRULE
  - `formatICalDate()` - 格式化日期为 iCalendar 格式
  - `formatICalDateTime()` - 格式化日期时间为 iCalendar 格式
  - `addExceptionDate()` - 添加排除日期
  - `addRescheduleDate()` - 添加改期日期
  - `removeExceptionDate()` - 移除例外日期
  - `getActualClassDates()` - 计算实际开课日期列表
  - `autoGenerateRRULE()` - 自动生成 RRULE

### Phase 4: API 更新 ✅
- ✅ 更新了 `POST /api/admin/instances` - 支持例外日期
- ✅ 更新了 `PUT /api/admin/instances/[id]` - 支持例外日期
- ✅ 创建了 `GET /api/admin/instances/[id]/export` - 导出 iCalendar 文件
- ✅ 更新了数据库函数 `createCourseInstance()` 和 `updateCourseInstance()` - 自动生成 RRULE

### Phase 5: UI 更新 ✅
- ✅ 更新了 `instances/page.tsx` - 添加了例外日期管理 UI
- ✅ 添加了例外日期表单（支持跳过和改期）
- ✅ 添加了"Export to Calendar"按钮
- ✅ 更新了表单数据结构以支持例外日期

### Phase 6: 依赖包 ✅
- ✅ 安装了 `ical-generator` - 生成 iCalendar 文件
- ✅ 安装了 `rrule` - 解析和生成重复规则
- ✅ 安装了 `date-fns-tz` - 时区处理

## 📋 使用说明

### 1. 运行数据库迁移

在 Supabase Dashboard 的 SQL Editor 中运行：
```sql
-- 运行 migrate-add-icalendar-fields.sql
```

### 2. 创建带例外日期的 Instance

在 Admin 页面的 Instances 管理中：

1. **基础设置**：
   - 选择 Assignment
   - 设置开始/结束日期
   - 设置时间
   - 选择星期几（如：周二）

2. **添加例外日期**：
   - 点击 "Add Exception"
   - 选择类型：
     - **Skip Date**: 跳过某个日期（如法定节假日）
     - **Reschedule**: 改期到其他日期
   - 填写原定日期
   - 如果是改期，填写新日期和时间
   - 可选：填写原因（如 "Public Holiday"）

3. **保存**：系统会自动：
   - 生成 RRULE（从 days_of_week）
   - 生成 EXDATE（排除日期）
   - 生成 RDATE（改期日期）

### 3. 导出到日历

在 Instances 列表中：
- 点击 Actions 菜单
- 选择 "Export to Calendar"
- 下载 `.ics` 文件
- 导入到 Google Calendar、Outlook、Apple Calendar 等

## 🔧 技术细节

### 数据格式

- **RRULE**: `FREQ=WEEKLY;BYDAY=TU;UNTIL=20250325T235959Z`
- **EXDATE**: `["20250121", "20250218"]` (YYYYMMDD 格式)
- **RDATE**: `["20250219T090000"]` (YYYYMMDDTHHMMSS 格式)

### 自动生成逻辑

当创建/更新 Instance 时：
1. 如果提供了 `days_of_week`，自动生成 `icalendar_rrule`
2. 如果提供了 `exceptions` 数组，自动生成 `icalendar_exdates` 和 `icalendar_rdates`
3. 如果更新了日期或星期几，自动重新生成 RRULE

### 计算实际开课日期

使用 `getActualClassDates()` 函数：
1. 从 RRULE 生成基础日期列表
2. 移除 EXDATE 中的日期
3. 添加 RDATE 中的日期
4. 返回排序后的唯一日期列表

## 📝 示例场景

### 场景1：每周二上课，1月21日跳过（法定节假日）

**输入**：
- Start Date: 2025-01-07
- End Date: 2025-03-25
- Days of Week: [2] (Tuesday)
- Exception: Skip 2025-01-21, Reason: "Public Holiday"

**生成的数据**：
```json
{
  "icalendar_rrule": "FREQ=WEEKLY;BYDAY=TU;UNTIL=20250325T235959Z",
  "icalendar_exdates": ["20250121"],
  "icalendar_rdates": []
}
```

### 场景2：每周二上课，2月18日改到2月19日（周三）

**输入**：
- Start Date: 2025-01-07
- End Date: 2025-03-25
- Days of Week: [2] (Tuesday)
- Exception: Reschedule 2025-02-18 → 2025-02-19, Reason: "Public Holiday"

**生成的数据**：
```json
{
  "icalendar_rrule": "FREQ=WEEKLY;BYDAY=TU;UNTIL=20250325T235959Z",
  "icalendar_exdates": ["20250218"],
  "icalendar_rdates": ["20250219T090000"]
}
```

## 🚀 下一步优化建议

1. **性能优化**：
   - 缓存计算出的实际开课日期
   - 创建辅助表存储预计算的日期

2. **功能增强**：
   - 批量导入例外日期（如法定节假日列表）
   - 自动检测冲突（如两个 Instance 在同一时间同一地点）
   - 支持更复杂的重复规则（如每月第一个周一）

3. **用户体验**：
   - 在 Instance 列表中显示实际开课日期数量
   - 添加日历视图显示所有 Instance
   - 支持拖拽调整日期

## 📚 相关文件

- `migrate-add-icalendar-fields.sql` - 数据库迁移脚本
- `src/lib/icalendar.ts` - iCalendar 工具函数库
- `src/lib/db.ts` - 数据库操作函数（已更新）
- `src/app/api/admin/instances/route.ts` - Instance API（已更新）
- `src/app/api/admin/instances/[id]/route.ts` - Instance 详情 API（已更新）
- `src/app/api/admin/instances/[id]/export/route.ts` - 导出 iCalendar API（新建）
- `src/app/admin/instances/page.tsx` - Instance 管理页面（已更新）
- `ICALENDAR_IMPLEMENTATION_PLAN.md` - 详细实施计划

## ⚠️ 注意事项

1. **时区处理**：确保所有日期时间都使用正确的时区
2. **数据验证**：确保例外日期在 start_date 和 end_date 范围内
3. **向后兼容**：现有 Instance 仍然可以正常工作（新字段为可选）
4. **RRULE 生成**：只有在提供了 `days_of_week` 时才会自动生成 RRULE

