# 课程系统重构实现状态

## 已完成 ✅

### 1. 架构设计文档
- ✅ `COURSE_ARCHITECTURE_DESIGN.md` - 完整的设计文档

### 2. SQL 迁移脚本
- ✅ `migrate-courses-to-assignment-model.sql` - 数据库迁移脚本
  - 创建新表：`course_subcategory_tags`, `course_assignments`
  - 修改现有表：`course_subcategories`, `courses`, `course_instances`
  - 数据迁移逻辑
  - 索引和 RLS 策略

### 3. TypeScript 类型定义
- ✅ 更新 `Course` 接口（移除 `subcategory_id`, `display_order`）
- ✅ 更新 `CourseSubcategory` 接口（移除 `series_id`）
- ✅ 更新 `CourseInstance` 接口（改为 `assignment_id`，`price_override`）
- ✅ 新增 `CourseAssignment` 接口
- ✅ 新增 `CourseAssignmentWithDetails` 接口
- ✅ 更新 `CourseWithDetails` 接口

### 4. 数据库操作函数
- ✅ `getAllCourses()` - 获取所有课程
- ✅ `getAllCourseSubcategories()` - 获取所有子类标签
- ✅ `getCourseWithDetails()` - 获取课程详细信息（包含标签和分配）
- ✅ `getCourseInstancesByAssignment()` - 获取指定 Assignment 的实例
- ✅ `getCourseInstances()` - 获取课程的所有实例
- ✅ `createCourse()` - 创建课程
- ✅ `updateCourse()` - 更新课程
- ✅ `deleteCourse()` - 删除课程（级联删除）
- ✅ `addCourseSubcategoryTag()` - 添加标签
- ✅ `removeCourseSubcategoryTag()` - 移除标签
- ✅ `updateCourseSubcategoryTags()` - 更新所有标签
- ✅ `getAllCourseAssignments()` - 获取所有分配
- ✅ `getCourseAssignmentsBySeries()` - 获取指定 Series 的分配
- ✅ `createCourseAssignment()` - 创建分配
- ✅ `updateCourseAssignment()` - 更新分配
- ✅ `deleteCourseAssignment()` - 删除分配（级联删除）
- ✅ `hasCategoryAssignments()` - 检查 Category 是否有分配
- ✅ `hasSeriesAssignments()` - 检查 Series 是否有分配

## 待完成 ⏳

### 5. API 路由
- ⏳ `/api/admin/courses` - Course CRUD
- ⏳ `/api/admin/categories` - Category CRUD
- ⏳ `/api/admin/series` - Series CRUD
- ⏳ `/api/admin/subcategories` - Subcategory CRUD
- ⏳ `/api/admin/assignments` - Assignment CRUD
- ⏳ `/api/admin/instances` - Instance CRUD（更新为使用 assignment_id）

### 6. UI 组件
- ⏳ `/admin/courses` - 课程管理页面
- ⏳ `/admin/categories` - 大类管理页面
- ⏳ `/admin/series` - 系列管理页面
- ⏳ `/admin/subcategories` - 子类标签管理页面
- ⏳ `/admin/assignments` - 分配管理页面
- ⏳ `/admin/instances` - 实例管理页面
- ⏳ `CourseEditDialog` - 课程编辑对话框（移除分类选择）
- ⏳ `CategoryEditDialog` - 大类编辑对话框
- ⏳ `SeriesEditDialog` - 系列编辑对话框
- ⏳ `SubcategoryEditDialog` - 子类标签编辑对话框
- ⏳ `AssignmentEditDialog` - 分配编辑对话框
- ⏳ `InstanceEditDialog` - 实例编辑对话框（更新为使用 Assignment）

### 7. Admin 侧边栏
- ⏳ 更新侧边栏菜单，添加新的管理页面链接

## 下一步行动

1. **先运行 SQL 迁移脚本**（在 Supabase 中）
2. **更新现有 API 路由**（保持向后兼容或标记为废弃）
3. **创建新的 API 路由**
4. **更新/创建 UI 组件**
5. **测试完整流程**

## 注意事项

⚠️ **重要**：在运行 SQL 迁移脚本之前，请：
1. 备份数据库
2. 在测试环境先运行
3. 验证数据迁移正确性
4. 确认所有外键约束正确

