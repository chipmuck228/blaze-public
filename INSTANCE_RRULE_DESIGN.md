# Instance RRULE 设计文档 - 支持多种课程频率

## 一、需求分析

### 支持的课程频率类型
1. **一周一次**：每周固定某一天上课（如每周二）
2. **一周两次**：每周固定两天上课（如每周一、三）
3. **两周一次**：每两周固定某一天上课（如每两周的周二）
4. **连续4天**：连续4天上课（如周一到周四连续4天）

### 当前实现限制
- 当前 `generateRRULE` 函数只支持 `FREQ=WEEKLY;BYDAY=...` 格式
- 无法处理两周一次的频率（需要 `INTERVAL=2`）
- 无法处理连续多天的课程（需要 `COUNT` 或 `BYDAY` 组合）

## 二、RRULE 设计方案

### 2.1 一周一次（Weekly Once）

**场景示例**：每周二 9:00-12:00 上课

**RRULE 设计**：
```
FREQ=WEEKLY;BYDAY=TU;UNTIL=20250325T235959Z
```

**参数说明**：
- `FREQ=WEEKLY`：每周重复
- `BYDAY=TU`：星期二（MO=周一, TU=周二, WE=周三, TH=周四, FR=周五, SA=周六, SU=周日）
- `UNTIL=20250325T235959Z`：结束日期（UTC 时间）

**数据库字段**：
```typescript
{
  start_date: "2025-01-07",  // 第一个周二
  end_date: "2025-03-25",     // 最后一个周二
  start_time: "09:00",
  end_time: "12:00",
  days_of_week: [2],          // 周二
  icalendar_rrule: "FREQ=WEEKLY;BYDAY=TU;UNTIL=20250325T235959Z"
}
```

**生成逻辑**：
- 如果 `days_of_week.length === 1`，生成 `FREQ=WEEKLY;BYDAY=...`

---

### 2.2 一周两次（Weekly Twice）

**场景示例**：每周一、三 9:00-12:00 上课

**RRULE 设计**：
```
FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20250325T235959Z
```

**参数说明**：
- `FREQ=WEEKLY`：每周重复
- `BYDAY=MO,WE`：星期一和星期三（多个星期几用逗号分隔）
- `UNTIL=20250325T235959Z`：结束日期

**数据库字段**：
```typescript
{
  start_date: "2025-01-06",  // 第一个周一
  end_date: "2025-03-26",     // 最后一个周三
  start_time: "09:00",
  end_time: "12:00",
  days_of_week: [1, 3],       // 周一、周三
  icalendar_rrule: "FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20250326T235959Z"
}
```

**生成逻辑**：
- 如果 `days_of_week.length > 1` 且都在同一周内，生成 `FREQ=WEEKLY;BYDAY=MO,WE,...`

---

### 2.3 两周一次（Bi-weekly / Every Two Weeks）

**场景示例**：每两周的周二 9:00-12:00 上课

**RRULE 设计**：
```
FREQ=WEEKLY;INTERVAL=2;BYDAY=TU;UNTIL=20250325T235959Z
```

**参数说明**：
- `FREQ=WEEKLY`：以周为单位
- `INTERVAL=2`：每2周重复一次（关键参数）
- `BYDAY=TU`：星期二
- `UNTIL=20250325T235959Z`：结束日期

**数据库字段**：
```typescript
{
  start_date: "2025-01-07",   // 第一个周二
  end_date: "2025-03-25",      // 最后一个周二
  start_time: "09:00",
  end_time: "12:00",
  days_of_week: [2],           // 周二
  icalendar_rrule: "FREQ=WEEKLY;INTERVAL=2;BYDAY=TU;UNTIL=20250325T235959Z"
}
```

**生成逻辑**：
- 需要新增字段 `recurrence_interval?: number` 或使用 `days_of_week` 的特殊标记
- 如果 `recurrence_interval === 2`，生成 `FREQ=WEEKLY;INTERVAL=2;BYDAY=...`

**注意**：`INTERVAL` 可以支持任意周数间隔（如 `INTERVAL=3` 表示每3周一次）

---

### 2.4 连续4天（Consecutive Days）

**场景示例**：连续4天上课（周一到周四）9:00-12:00

**方案A：使用 BYDAY（推荐）**

**RRULE 设计**：
```
FREQ=WEEKLY;BYDAY=MO,TU,WE,TH;COUNT=4
```

**参数说明**：
- `FREQ=WEEKLY`：以周为单位
- `BYDAY=MO,TU,WE,TH`：周一到周四
- `COUNT=4`：总共4次（连续4天）

**问题**：`COUNT=4` 会生成4个日期，但如果这4天跨越两周，可能会有问题。

**方案B：使用 DTSTART + COUNT（更准确）**

**RRULE 设计**：
```
FREQ=DAILY;COUNT=4;DTSTART=20250106T090000
```

**参数说明**：
- `FREQ=DAILY`：每天重复
- `COUNT=4`：总共4次
- `DTSTART=20250106T090000`：开始日期时间（必须包含时间）

**数据库字段**：
```typescript
{
  start_date: "2025-01-06",   // 第一天（周一）
  end_date: "2025-01-09",      // 最后一天（周四）
  start_time: "09:00",
  end_time: "12:00",
  days_of_week: [1, 2, 3, 4], // 周一到周四
  icalendar_rrule: "FREQ=DAILY;COUNT=4;DTSTART=20250106T090000"
}
```

**生成逻辑**：
- 如果 `days_of_week` 是连续的数字（如 [1,2,3,4]），且 `end_date - start_date <= 7`，使用 `FREQ=DAILY;COUNT=N`

**方案C：使用 BYDAY + UNTIL（适用于跨周情况）**

**RRULE 设计**：
```
FREQ=WEEKLY;BYDAY=MO,TU,WE,TH;UNTIL=20250109T235959Z
```

**适用场景**：如果连续4天可能跨越两周（如周五到下周一），使用此方案。

---

## 三、数据库字段扩展建议

### 3.1 当前字段结构
```typescript
interface CourseInstance {
  start_date: string
  end_date: string
  start_time?: string
  end_time?: string
  days_of_week?: number[]      // [1,3,5] 表示周一、三、五
  icalendar_rrule?: string
  icalendar_exdates?: string[]
  icalendar_rdates?: string[]
  timezone?: string
}
```

### 3.2 建议新增字段（可选）

**方案A：添加 `recurrence_type` 枚举字段**
```typescript
interface CourseInstance {
  // ... 现有字段 ...
  recurrence_type?: 'weekly_once' | 'weekly_twice' | 'bi_weekly' | 'consecutive_days' | 'custom'
  recurrence_interval?: number  // 用于两周一次：2，三周一次：3
}
```

**方案B：从现有字段推断（推荐）**
- 不需要新增字段，通过 `days_of_week` 和日期范围自动判断
- 如果 `days_of_week.length === 1` 且日期跨度 > 14天，可能是两周一次
- 如果 `days_of_week` 是连续数字且 `end_date - start_date <= 7`，可能是连续天数

---

## 四、RRULE 生成函数设计

### 4.1 函数签名
```typescript
export function generateRRULE(
  startDate: string,
  endDate: string,
  daysOfWeek?: number[],
  startTime?: string,
  timezone: string = 'America/Los_Angeles',
  recurrenceInterval?: number,  // 新增：用于两周一次等
  isConsecutiveDays?: boolean   // 新增：标记是否为连续天数
): string | undefined
```

### 4.2 生成逻辑流程图

```
开始
  ↓
是否有 days_of_week?
  ├─ 否 → 返回 undefined（单次事件）
  └─ 是
      ↓
days_of_week.length === 1?
  ├─ 是
  │   ↓
  │   recurrence_interval === 2?
  │   ├─ 是 → FREQ=WEEKLY;INTERVAL=2;BYDAY=...
  │   └─ 否 → FREQ=WEEKLY;BYDAY=...（一周一次）
  │
  └─ 否
      ↓
是否为连续天数? (days_of_week 是连续数字，如 [1,2,3,4])
  ├─ 是
  │   ↓
  │   end_date - start_date <= 7?
  │   ├─ 是 → FREQ=DAILY;COUNT=N（连续N天）
  │   └─ 否 → FREQ=WEEKLY;BYDAY=...;UNTIL=...（跨周连续）
  │
  └─ 否 → FREQ=WEEKLY;BYDAY=MO,WE,...（一周多次）
```

### 4.3 实现代码示例

```typescript
export function generateRRULE(
  startDate: string,
  endDate: string,
  daysOfWeek?: number[],
  startTime?: string,
  timezone: string = 'America/Los_Angeles',
  recurrenceInterval?: number,
  isConsecutiveDays?: boolean
): string | undefined {
  if (!daysOfWeek || daysOfWeek.length === 0) {
    return undefined
  }

  const sortedDays = [...daysOfWeek].sort((a, b) => a - b)
  const byDay = sortedDays.map(day => DAY_TO_RRULE[day]).join(',')

  // 计算 UNTIL 日期（endDate 的结束时间）
  const untilDate = new Date(endDate)
  untilDate.setHours(23, 59, 59, 999)
  const untilStr = formatInTimeZone(untilDate, 'UTC', "yyyyMMdd'T'HHmmss'Z'")

  // 场景1：两周一次（或其他间隔周数）
  if (daysOfWeek.length === 1 && recurrenceInterval && recurrenceInterval > 1) {
    return `FREQ=WEEKLY;INTERVAL=${recurrenceInterval};BYDAY=${byDay};UNTIL=${untilStr}`
  }

  // 场景2：连续天数（如连续4天）
  if (isConsecutiveDays || isConsecutiveDaysPattern(daysOfWeek, startDate, endDate)) {
    const startDateTime = new Date(startDate)
    if (startTime) {
      const [hours, minutes] = startTime.split(':').map(Number)
      startDateTime.setHours(hours, minutes || 0, 0, 0)
    }
    
    const dayCount = calculateDayCount(startDate, endDate)
    if (dayCount <= 7) {
      // 使用 COUNT（适用于7天内的连续天数）
      const dtstart = formatInTimeZone(startDateTime, timezone, "yyyyMMdd'T'HHmmss")
      return `FREQ=DAILY;COUNT=${dayCount};DTSTART=${dtstart}`
    } else {
      // 跨周情况，使用 UNTIL
      return `FREQ=WEEKLY;BYDAY=${byDay};UNTIL=${untilStr}`
    }
  }

  // 场景3：一周一次或一周多次
  return `FREQ=WEEKLY;BYDAY=${byDay};UNTIL=${untilStr}`
}

// 辅助函数：判断是否为连续天数模式
function isConsecutiveDaysPattern(
  daysOfWeek: number[],
  startDate: string,
  endDate: string
): boolean {
  if (daysOfWeek.length < 2) return false
  
  // 检查 days_of_week 是否为连续数字（如 [1,2,3,4]）
  const sorted = [...daysOfWeek].sort((a, b) => a - b)
  const isConsecutive = sorted.every((day, index) => {
    if (index === 0) return true
    return day === sorted[index - 1] + 1
  })

  if (!isConsecutive) return false

  // 检查日期跨度是否合理（连续天数应该在7天内）
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  
  return diffDays <= 7 && diffDays === daysOfWeek.length
}

// 辅助函数：计算日期范围内的天数
function calculateDayCount(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = end.getTime() - start.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
}
```

---

## 五、具体场景示例

### 5.1 一周一次（每周二）

**输入**：
```typescript
{
  start_date: "2025-01-07",  // 周二
  end_date: "2025-03-25",     // 最后一个周二
  start_time: "09:00",
  days_of_week: [2]
}
```

**输出 RRULE**：
```
FREQ=WEEKLY;BYDAY=TU;UNTIL=20250325T235959Z
```

**实际生成日期**：
- 2025-01-07 (周二)
- 2025-01-14 (周二)
- 2025-01-21 (周二)
- ... (每周二，直到 2025-03-25)

---

### 5.2 一周两次（每周一、三）

**输入**：
```typescript
{
  start_date: "2025-01-06",  // 周一
  end_date: "2025-03-26",     // 最后一个周三
  start_time: "09:00",
  days_of_week: [1, 3]
}
```

**输出 RRULE**：
```
FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20250326T235959Z
```

**实际生成日期**：
- 2025-01-06 (周一)
- 2025-01-08 (周三)
- 2025-01-13 (周一)
- 2025-01-15 (周三)
- ... (每周一、三，直到 2025-03-26)

---

### 5.3 两周一次（每两周的周二）

**输入**：
```typescript
{
  start_date: "2025-01-07",  // 第一个周二
  end_date: "2025-03-25",     // 最后一个周二
  start_time: "09:00",
  days_of_week: [2],
  recurrence_interval: 2     // 新增字段
}
```

**输出 RRULE**：
```
FREQ=WEEKLY;INTERVAL=2;BYDAY=TU;UNTIL=20250325T235959Z
```

**实际生成日期**：
- 2025-01-07 (周二)
- 2025-01-21 (周二，两周后)
- 2025-02-04 (周二，两周后)
- 2025-02-18 (周二，两周后)
- ... (每两周的周二，直到 2025-03-25)

---

### 5.4 连续4天（周一到周四）

**输入**：
```typescript
{
  start_date: "2025-01-06",  // 周一
  end_date: "2025-01-09",     // 周四
  start_time: "09:00",
  days_of_week: [1, 2, 3, 4]
}
```

**输出 RRULE**：
```
FREQ=DAILY;COUNT=4;DTSTART=20250106T090000
```

**实际生成日期**：
- 2025-01-06 (周一)
- 2025-01-07 (周二)
- 2025-01-08 (周三)
- 2025-01-09 (周四)

---

### 5.5 连续4天（跨周情况：周五到下周一）

**输入**：
```typescript
{
  start_date: "2025-01-03",  // 周五
  end_date: "2025-01-06",     // 下周一
  start_time: "09:00",
  days_of_week: [5, 6, 0, 1]  // 周五、周六、周日、周一
}
```

**输出 RRULE**：
```
FREQ=WEEKLY;BYDAY=FR,SA,SU,MO;UNTIL=20250106T235959Z
```

**注意**：这种情况下，RRULE 会生成所有符合条件的日期，但通过 `UNTIL` 限制在指定范围内。

**实际生成日期**：
- 2025-01-03 (周五)
- 2025-01-04 (周六)
- 2025-01-05 (周日)
- 2025-01-06 (周一)

---

## 六、UI/UX 设计建议

### 6.1 创建 Instance 时的频率选择

```tsx
<Select
  label="Recurrence Frequency"
  value={recurrenceType}
  onChange={setRecurrenceType}
>
  <option value="weekly_once">Once per week</option>
  <option value="weekly_twice">Twice per week</option>
  <option value="bi_weekly">Every two weeks</option>
  <option value="consecutive_days">Consecutive days</option>
  <option value="custom">Custom (RRULE)</option>
</Select>

{recurrenceType === 'bi_weekly' && (
  <Input
    type="number"
    label="Interval (weeks)"
    value={recurrenceInterval}
    onChange={(e) => setRecurrenceInterval(Number(e.target.value))}
    min={2}
    max={52}
  />
)}

{recurrenceType === 'consecutive_days' && (
  <Input
    type="number"
    label="Number of consecutive days"
    value={consecutiveDayCount}
    onChange={(e) => setConsecutiveDayCount(Number(e.target.value))}
    min={2}
    max={14}
  />
)}
```

### 6.2 显示 RRULE 预览

```tsx
<div className="text-sm text-muted-foreground">
  <strong>RRULE Preview:</strong>
  <code className="ml-2">{previewRRULE}</code>
</div>

<div className="text-sm text-muted-foreground">
  <strong>Generated Dates:</strong>
  <ul className="list-disc list-inside mt-1">
    {previewDates.slice(0, 10).map(date => (
      <li key={date}>{formatDate(date)}</li>
    ))}
    {previewDates.length > 10 && (
      <li>... and {previewDates.length - 10} more</li>
    )}
  </ul>
</div>
```

---

## 七、数据库迁移建议

### 7.1 可选：添加新字段

```sql
-- 添加 recurrence_interval 字段（用于两周一次等）
ALTER TABLE course_instances 
ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT 1;

-- 添加 recurrence_type 字段（用于区分频率类型）
ALTER TABLE course_instances 
ADD COLUMN IF NOT EXISTS recurrence_type TEXT 
CHECK (recurrence_type IN ('weekly_once', 'weekly_twice', 'bi_weekly', 'consecutive_days', 'custom'));
```

### 7.2 数据迁移脚本

```sql
-- 为现有数据推断 recurrence_type
UPDATE course_instances
SET recurrence_type = CASE
  WHEN array_length(days_of_week, 1) = 1 THEN 'weekly_once'
  WHEN array_length(days_of_week, 1) > 1 THEN 'weekly_twice'
  ELSE 'custom'
END
WHERE recurrence_type IS NULL;
```

---

## 八、实施步骤

### Phase 1: 扩展 generateRRULE 函数
1. 添加 `recurrence_interval` 参数支持
2. 添加连续天数检测逻辑
3. 实现两周一次的 `INTERVAL` 支持
4. 实现连续天数的 `FREQ=DAILY;COUNT=N` 支持

### Phase 2: 更新 UI
1. 在 Instance 创建/编辑表单中添加频率选择
2. 添加 RRULE 预览功能
3. 添加日期预览功能

### Phase 3: 数据库迁移（可选）
1. 添加 `recurrence_interval` 字段
2. 添加 `recurrence_type` 字段
3. 迁移现有数据

### Phase 4: 测试
1. 测试一周一次场景
2. 测试一周两次场景
3. 测试两周一次场景
4. 测试连续4天场景
5. 测试跨周连续天数场景
6. 测试与 EXDATE/RDATE 的兼容性

---

## 九、注意事项

1. **时区处理**：确保 `DTSTART` 和 `UNTIL` 使用正确的时区
2. **日期计算**：连续天数的 `COUNT` 计算要准确（包含首尾两天）
3. **向后兼容**：现有的一周一次/两次功能不应受影响
4. **RRULE 解析**：确保 `rrule` 库能正确解析生成的 RRULE
5. **边界情况**：
   - 如果 `start_date` 不是 `days_of_week` 中的第一天，需要调整
   - 跨年、跨月的连续天数需要特别处理
6. **性能考虑**：对于大量实例，考虑缓存计算出的实际日期

---

## 十、参考资源

- [RFC 5545 - iCalendar Specification](https://tools.ietf.org/html/rfc5545)
- [RRULE Specification](https://icalendar.org/rrule-tool.html)
- [rrule.js Documentation](https://github.com/jkbrzt/rrule)
- [iCalendar RRULE Examples](https://icalendar.org/rrule-tool.html)

