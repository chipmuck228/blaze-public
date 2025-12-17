# Course Status 常见问题解答

## 问题 1：Web 前端的 Course Detail 显示

### 问题
如果 course status 改成了 `suspended` 或 `archived`，会不会影响 web 前端的 course detail 显示？

### 当前实现分析

#### 通过 Slug 访问（`/course-catalog/[slug]`）
- **使用函数**：`getCourseWithDetailsBySlug(slug)`
- **状态过滤**：✅ **有过滤** - 只返回 `status = 'published'` 的课程
- **结果**：`suspended` 或 `archived` 的课程**不会显示**（返回 404）

#### 通过 ID 访问（`/api/courses/[id]` 或 `/course-catalog?id=xxx`）
- **使用函数**：`getCourseWithDetails(id)`
- **状态过滤**：❌ **没有过滤** - 返回所有状态的课程
- **结果**：`suspended` 或 `archived` 的课程**可能会显示**（这是一个问题！）

### 问题总结

1. **通过 Slug 访问**：✅ 正确 - 只有 `published` 课程可以访问
2. **通过 ID 访问**：❌ **有问题** - `suspended` 或 `archived` 课程仍然可以访问

### 推荐修复方案

**方案 A：在 API 层添加状态检查（推荐）**

修改 `/api/courses/[id]/route.ts`，添加状态检查：

```typescript
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const course = await getCourseWithDetails(id)

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // 只返回 published 状态的课程（公开 API）
    if (course.status !== 'published') {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // ... 返回课程数据
  }
}
```

**方案 B：创建新的公开 API 函数**

在 `db.ts` 中创建 `getPublishedCourseWithDetails(id)`，只返回 `published` 状态的课程。

### 推荐：方案 A

- 简单直接
- 在 API 层统一处理
- 不需要修改数据库函数

---

## 问题 2：Admin Course 列表的 Delete 操作

### 问题
在 admin 的 course 列表中，有 delete 的 action，是不是可以考虑只有 `draft` 状态的 course 可以 delete，而其他状态的不可以 delete，只能 edit？

### 当前实现
- 所有状态的课程都可以删除
- 没有状态检查

### 业务逻辑分析

#### `draft` 状态
- ✅ **可以删除**
- 理由：课程还在设计中，没有实际使用，删除不会影响业务

#### `published` 状态
- ❌ **不应该删除**
- 理由：
  - 可能已经有 assignments
  - 可能已经有 instances
  - 可能已经有 enrollments
  - 删除会导致数据不一致
  - 应该使用 `archived` 状态

#### `suspended` 状态
- ❌ **不应该删除**
- 理由：
  - 可能已经有历史 instances 和 enrollments
  - 可能需要恢复为 `published`
  - 应该使用 `archived` 状态

#### `archived` 状态
- ❌ **不应该删除**
- 理由：
  - 保留历史记录
  - 可能还有关联的 instances 和 enrollments
  - 归档就是为了保留数据

### 推荐实现方案

**在 Admin UI 中限制 Delete 操作：**

```typescript
// 在 handleDelete 函数中添加状态检查
const handleDelete = async (courseId: string) => {
  const course = courses.find(c => c.id === courseId)
  
  // 只有 draft 状态的课程可以删除
  if (course && course.status !== 'draft') {
    alert(`Cannot delete course with status '${course.status}'. Only draft courses can be deleted. Please archive the course instead.`)
    return
  }

  if (!confirm("Are you sure you want to delete this course?")) {
    return
  }

  // ... 执行删除
}
```

**在 Delete 按钮中禁用：**

```typescript
<DropdownMenuItem
  className="text-destructive"
  onClick={() => handleDelete(course.id)}
  disabled={course.status !== 'draft'}
>
  <Trash2 className="mr-2 h-4 w-4" />
  Delete
</DropdownMenuItem>
```

**在 API 层也添加检查（双重保护）：**

```typescript
// 在 /api/admin/courses/[id]/route.ts 的 DELETE 方法中
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // ... 获取课程
  if (course.status !== 'draft') {
    return NextResponse.json(
      { error: `Cannot delete course with status '${course.status}'. Only draft courses can be deleted.` },
      { status: 400 }
    )
  }
  // ... 执行删除
}
```

### 推荐：双重保护

1. **UI 层**：禁用非 `draft` 状态的删除按钮，提供友好的提示
2. **API 层**：添加状态检查，防止直接调用 API 删除

---

## 总结

### 问题 1 修复
- ✅ 在 `/api/courses/[id]/route.ts` 中添加状态检查
- ✅ 确保只有 `published` 状态的课程可以通过公开 API 访问

### 问题 2 修复
- ✅ 在 Admin UI 中限制只有 `draft` 状态的课程可以删除
- ✅ 在 API 层添加状态检查（双重保护）
- ✅ 提供友好的错误提示，建议使用 `archived` 状态

