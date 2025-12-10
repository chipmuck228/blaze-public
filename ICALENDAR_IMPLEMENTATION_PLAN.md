# iCalendar (RFC5545) 实现方案 - 支持例外情况

## 一、需求分析

### 核心需求
1. **基础重复规则**：每周二上课（RRULE）
2. **排除日期（EXDATE）**：法定节假日跳过
3. **额外日期（RDATE）**：节假日改到其他日期（如周二改到周三）
4. **向后兼容**：保留现有字段用于查询和显示

### 使用场景示例
- **场景1**：每周二 9:00-12:00 上课，1月21日是法定节假日，跳过
- **场景2**：每周二 9:00-12:00 上课，2月18日是法定节假日，改到2月19日（周三）9:00-12:00

## 二、数据库设计

### 1. 修改 course_instances 表

```sql
-- 添加 iCalendar 相关字段
ALTER TABLE course_instances ADD COLUMN IF NOT EXISTS icalendar_rrule TEXT;
ALTER TABLE course_instances ADD COLUMN IF NOT EXISTS icalendar_exdates TEXT[];  -- 排除的日期列表
ALTER TABLE course_instances ADD COLUMN IF NOT EXISTS icalendar_rdates TEXT[];   -- 额外/改期的日期列表
ALTER TABLE course_instances ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Los_Angeles';

-- 创建索引用于查询
CREATE INDEX IF NOT EXISTS idx_course_instances_timezone ON course_instances(timezone);
```

### 2. 创建课程例外日期表（可选，用于更复杂的管理）

```sql
CREATE TABLE IF NOT EXISTS course_instance_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES course_instances(id) ON DELETE CASCADE,
  exception_type TEXT NOT NULL CHECK (exception_type IN ('skip', 'reschedule', 'time_change')),
  original_date DATE NOT NULL,  -- 原定日期
  new_date DATE,                 -- 改期后的日期（如果是 reschedule）
  new_start_time TIME,           -- 改期后的开始时间（如果是 time_change）
  new_end_time TIME,             -- 改期后的结束时间（如果是 time_change）
  reason TEXT,                   -- 原因（如 "法定节假日"）
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(instance_id, original_date)
);

CREATE INDEX IF NOT EXISTS idx_course_instance_exceptions_instance_id ON course_instance_exceptions(instance_id);
CREATE INDEX IF NOT EXISTS idx_course_instance_exceptions_original_date ON course_instance_exceptions(original_date);
CREATE INDEX IF NOT EXISTS idx_course_instance_exceptions_new_date ON course_instance_exceptions(new_date);
```

## 三、TypeScript 类型定义

```typescript
export interface CourseInstance {
  id: string
  assignment_id: string
  location_id?: string
  
  // 现有字段（保留用于查询和显示）
  start_date: string
  end_date: string
  start_time?: string
  end_time?: string
  days_of_week?: number[]
  
  // iCalendar 字段（新增）
  icalendar_rrule?: string        // RRULE 字符串
  icalendar_exdates?: string[]   // 排除日期数组，格式: ['20250121', '20250218']
  icalendar_rdates?: string[]    // 额外日期数组，格式: ['20250122T090000', '20250219T090000']
  timezone?: string               // 时区，默认 'America/Los_Angeles'
  
  // 其他字段
  price_override?: number
  max_students?: number
  current_students: number
  instructor_name?: string
  instructor_id?: string
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled'
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// 例外日期接口
export interface CourseInstanceException {
  id: string
  instance_id: string
  exception_type: 'skip' | 'reschedule' | 'time_change'
  original_date: string
  new_date?: string
  new_start_time?: string
  new_end_time?: string
  reason?: string
  is_active: boolean
  created_at: string
  updated_at: string
}
```

## 四、实现逻辑

### 1. 从现有字段生成 RRULE

```typescript
import { RRule } from 'rrule'

function generateRRULE(
  startDate: string,
  endDate: string,
  daysOfWeek?: number[],
  startTime?: string,
  timezone?: string
): string {
  if (!daysOfWeek || daysOfWeek.length === 0) {
    // 如果没有指定星期几，生成单次事件
    return `FREQ=DAILY;COUNT=1;DTSTART=${formatICalDate(startDate, startTime, timezone)}`
  }

  // 将 daysOfWeek 转换为 RRULE 的 BYDAY
  // daysOfWeek: [1,3,5] 表示周一、三、五
  // RRULE: MO,WE,FR
  const dayMap: Record<number, string> = {
    0: 'SU', 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR', 6: 'SA'
  }
  const byDay = daysOfWeek.map(day => dayMap[day]).join(',')

  // 计算 UNTIL 日期（endDate 的结束时间）
  const until = new Date(endDate)
  until.setHours(23, 59, 59, 999)

  return `FREQ=WEEKLY;BYDAY=${byDay};UNTIL=${formatICalDateTime(until, timezone)}`
}
```

### 2. 处理例外日期

```typescript
// 添加排除日期
function addExceptionDate(
  instance: CourseInstance,
  dateToSkip: string,
  reason?: string
): CourseInstance {
  const exdates = instance.icalendar_exdates || []
  if (!exdates.includes(dateToSkip)) {
    exdates.push(dateToSkip)
  }
  return {
    ...instance,
    icalendar_exdates: exdates
  }
}

// 添加改期日期
function addRescheduleDate(
  instance: CourseInstance,
  originalDate: string,
  newDate: string,
  newStartTime?: string,
  newEndTime?: string,
  reason?: string
): CourseInstance {
  // 1. 将原日期添加到 EXDATE（排除）
  const exdates = instance.icalendar_exdates || []
  if (!exdates.includes(originalDate)) {
    exdates.push(originalDate)
  }

  // 2. 将新日期添加到 RDATE（额外日期）
  const rdates = instance.icalendar_rdates || []
  const rdateValue = formatICalDateTime(
    newDate,
    newStartTime || instance.start_time,
    instance.timezone
  )
  if (!rdates.includes(rdateValue)) {
    rdates.push(rdateValue)
  }

  return {
    ...instance,
    icalendar_exdates: exdates,
    icalendar_rdates: rdates
  }
}
```

### 3. 生成完整的 iCalendar 字符串

```typescript
import { createEvent, DateArray } from 'ical-generator'

function generateICalendar(instance: CourseInstance, courseName: string): string {
  const calendar = createCalendar()
  
  const event = calendar.createEvent({
    start: parseDateTime(instance.start_date, instance.start_time, instance.timezone),
    end: parseDateTime(instance.end_date, instance.end_time, instance.timezone),
    summary: courseName,
    description: instance.notes,
    location: instance.location?.name,
    timezone: instance.timezone || 'America/Los_Angeles',
  })

  // 添加 RRULE
  if (instance.icalendar_rrule) {
    event.repeating({
      freq: 'WEEKLY',
      byDay: parseByDay(instance.icalendar_rrule),
      until: parseUntil(instance.icalendar_rrule),
    })
  }

  // 添加排除日期
  if (instance.icalendar_exdates && instance.icalendar_exdates.length > 0) {
    instance.icalendar_exdates.forEach(dateStr => {
      event.exdate(parseDate(dateStr))
    })
  }

  // 添加额外日期（改期）
  if (instance.icalendar_rdates && instance.icalendar_rdates.length > 0) {
    instance.icalendar_rdates.forEach(dateTimeStr => {
      event.recurrence({
        date: parseDateTime(dateTimeStr)
      })
    })
  }

  return calendar.toString()
}
```

### 4. 计算实际开课日期

```typescript
import { RRule, rrulestr } from 'rrule'

function getActualClassDates(instance: CourseInstance): Date[] {
  const dates: Date[] = []

  // 1. 从 RRULE 生成基础日期
  if (instance.icalendar_rrule) {
    const rule = rrulestr(instance.icalendar_rrule)
    const baseDates = rule.between(
      new Date(instance.start_date),
      new Date(instance.end_date),
      true
    )
    dates.push(...baseDates)
  } else {
    // 如果没有 RRULE，使用 start_date
    dates.push(new Date(instance.start_date))
  }

  // 2. 移除排除日期
  if (instance.icalendar_exdates) {
    const exdates = instance.icalendar_exdates.map(d => new Date(d))
    return dates.filter(date => {
      const dateStr = formatDate(date)
      return !exdates.some(ex => formatDate(ex) === dateStr)
    })
  }

  // 3. 添加额外日期（改期）
  if (instance.icalendar_rdates) {
    const rdates = instance.icalendar_rdates.map(d => parseDateTime(d))
    dates.push(...rdates)
  }

  // 排序并去重
  return dates
    .sort((a, b) => a.getTime() - b.getTime())
    .filter((date, index, self) => 
      index === self.findIndex(d => formatDate(d) === formatDate(date))
    )
}
```

## 五、UI 设计

### 1. 在 Instance 编辑对话框中添加"例外日期"部分

```tsx
// 在现有的日期/时间字段后添加

<div className="space-y-4 border-t pt-4">
  <div className="flex items-center justify-between">
    <Label>Exception Dates</Label>
    <Button type="button" variant="outline" size="sm" onClick={handleAddException}>
      <Plus className="h-4 w-4 mr-2" />
      Add Exception
    </Button>
  </div>

  {exceptions.length === 0 ? (
    <p className="text-sm text-muted-foreground text-center py-2">
      No exceptions. Click 'Add Exception' to skip or reschedule dates.
    </p>
  ) : (
    <div className="space-y-2">
      {exceptions.map((exception, index) => (
        <Card key={index} className="p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={
                  exception.type === 'skip' ? 'secondary' :
                  exception.type === 'reschedule' ? 'default' : 'outline'
                }>
                  {exception.type === 'skip' ? 'Skip' :
                   exception.type === 'reschedule' ? 'Reschedule' : 'Time Change'}
                </Badge>
                <span className="text-sm">
                  {exception.originalDate}
                  {exception.newDate && ` → ${exception.newDate}`}
                </span>
              </div>
              {exception.reason && (
                <Input
                  placeholder="Reason (e.g., Public Holiday)"
                  value={exception.reason}
                  onChange={(e) => updateException(index, { reason: e.target.value })}
                  className="text-sm"
                />
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeException(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )}
</div>
```

### 2. 添加"添加到日历"按钮

```tsx
// 在 Instance 列表的 Actions 下拉菜单中添加
<DropdownMenuItem onClick={() => handleExportToCalendar(instance)}>
  <Calendar className="mr-2 h-4 w-4" />
  Add to Calendar
</DropdownMenuItem>
```

## 六、API 更新

### 1. 更新 Instance 创建/更新 API

```typescript
// src/app/api/admin/instances/route.ts

export async function POST(request: Request) {
  // ... 现有代码 ...
  
  const body = await request.json()
  const {
    // ... 现有字段 ...
    icalendar_rrule,
    icalendar_exdates,
    icalendar_rdates,
    timezone,
    exceptions,  // 新的例外日期数组
  } = body

  // 如果提供了 exceptions，自动生成 exdates 和 rdates
  if (exceptions && Array.isArray(exceptions)) {
    const exdates: string[] = []
    const rdates: string[] = []
    
    exceptions.forEach((exc: any) => {
      if (exc.type === 'skip') {
        exdates.push(exc.originalDate)
      } else if (exc.type === 'reschedule' && exc.newDate) {
        exdates.push(exc.originalDate)
        const rdate = formatICalDateTime(
          exc.newDate,
          exc.newStartTime || start_time,
          timezone
        )
        rdates.push(rdate)
      }
    })
    
    // 合并到提供的值中
    body.icalendar_exdates = [...(icalendar_exdates || []), ...exdates]
    body.icalendar_rdates = [...(icalendar_rdates || []), ...rdates]
  }

  // ... 保存到数据库 ...
}
```

### 2. 添加导出 iCalendar API

```typescript
// src/app/api/admin/instances/[id]/export/route.ts

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const instance = await getCourseInstanceWithDetails(id)
  if (!instance) {
    return NextResponse.json({ error: "Instance not found" }, { status: 404 })
  }

  const courseName = instance.assignment?.course?.name || "Course"
  const icalendar = generateICalendar(instance, courseName)

  return new NextResponse(icalendar, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="course-${id}.ics"`,
    },
  })
}
```

## 七、实施步骤

### Phase 1: 数据库迁移
1. 添加新字段到 `course_instances` 表
2. 创建 `course_instance_exceptions` 表（可选）
3. 运行迁移脚本

### Phase 2: 类型和工具函数
1. 更新 TypeScript 类型定义
2. 创建 iCalendar 工具函数库
3. 创建日期计算函数

### Phase 3: API 更新
1. 更新 Instance CRUD API
2. 添加导出 iCalendar API
3. 添加例外日期管理 API

### Phase 4: UI 更新
1. 更新 Instance 编辑对话框
2. 添加例外日期管理 UI
3. 添加"添加到日历"功能

### Phase 5: 测试和优化
1. 测试各种例外情况
2. 性能优化（日期计算缓存）
3. 文档更新

## 八、依赖包

```json
{
  "dependencies": {
    "ical-generator": "^7.0.0",      // 生成 iCalendar
    "rrule": "^2.8.1",               // 解析和生成 RRULE
    "date-fns-tz": "^2.0.0",        // 时区处理
    "node-ical": "^0.9.0"            // 解析 iCalendar（可选）
  }
}
```

## 九、示例数据

### 场景1：每周二上课，1月21日跳过（法定节假日）

```typescript
{
  start_date: "2025-01-07",
  end_date: "2025-03-25",
  start_time: "09:00",
  end_time: "12:00",
  days_of_week: [2],  // 周二
  icalendar_rrule: "FREQ=WEEKLY;BYDAY=TU;UNTIL=20250325T235959Z",
  icalendar_exdates: ["2025-01-21"],  // 跳过1月21日
  timezone: "America/Los_Angeles"
}
```

### 场景2：每周二上课，2月18日改到2月19日（周三）

```typescript
{
  start_date: "2025-01-07",
  end_date: "2025-03-25",
  start_time: "09:00",
  end_time: "12:00",
  days_of_week: [2],  // 周二
  icalendar_rrule: "FREQ=WEEKLY;BYDAY=TU;UNTIL=20250325T235959Z",
  icalendar_exdates: ["2025-02-18"],  // 排除原日期
  icalendar_rdates: ["20250219T090000"],  // 添加新日期
  timezone: "America/Los_Angeles"
}
```

## 十、注意事项

1. **时区处理**：确保所有日期时间都使用正确的时区
2. **日期格式**：EXDATE 使用日期格式（YYYYMMDD），RDATE 使用日期时间格式（YYYYMMDDTHHMMSS）
3. **性能考虑**：对于大量实例，考虑缓存计算出的实际日期
4. **向后兼容**：保持现有字段，新字段为可选
5. **数据验证**：确保 EXDATE 和 RDATE 在 start_date 和 end_date 范围内

