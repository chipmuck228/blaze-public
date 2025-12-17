# Franchise 404 问题诊断

## 问题描述

访问 `http://localhost:3000/locations/sammamish` 时出现 404 错误，即使已经创建了新的 franchise（sammamish）。

---

## 代码流程分析

### 1. 路由处理：`/locations/[code]/page.tsx`

**文件位置**：`src/app/locations/[code]/page.tsx`

**处理流程**（第 20-28 行）：
```typescript
export default async function GenericLocationPage({ params }: LocationPageProps) {
  const { code } = await params  // URL 参数：'sammamish'
  const normalizedCode = decodeURIComponent(code).toLowerCase()  // 'sammamish'
  
  const franchise = await getFranchiseByCode(normalizedCode)  // 查找 franchise
  
  if (!franchise) {
    notFound()  // ❌ 如果找不到，返回 404
  }
  
  // ... 渲染页面
}
```

**关键点**：
- ✅ URL 参数会被 `decodeURIComponent` 解码
- ✅ 会被转换为小写：`'sammamish'`
- ❌ 如果 `getFranchiseByCode` 返回 `null`，会调用 `notFound()` 返回 404

---

### 2. Franchise 查找：`getFranchiseByCode`

**文件位置**：`src/lib/db.ts` 第 1311-1331 行

**查询逻辑**：
```typescript
export async function getFranchiseByCode(code: string): Promise<Franchise | null> {
  const normalized = code.trim().toLowerCase()  // 'sammamish'
  if (!normalized) return null

  const { data, error } = await supabaseAdmin
    .from('franchises')
    .select('*')
    .eq('code', normalized)        // ✅ 匹配 code = 'sammamish'
    .eq('is_active', true)          // ✅ 必须是 active
    .single()

  if (error) {
    if (error.code === 'PGRST116' || error.message?.toLowerCase().includes('no rows')) {
      return null  // ❌ 找不到记录，返回 null
    }
    throw new Error(`Failed to fetch franchise: ${error.message}`)
  }

  return data as Franchise
}
```

**查询条件**：
1. ✅ `code = 'sammamish'`（精确匹配，区分大小写）
2. ✅ `is_active = true`（必须是激活状态）

---

## 可能的原因

### 原因 1：Franchise 的 `code` 字段值不匹配

**问题**：
- 数据库中存储的 `code` 可能是 `'Sammamish'`（首字母大写）
- 或者 `'sammamish'`（全小写，但查询时大小写不匹配）

**检查方法**：
```sql
-- 在 Supabase SQL Editor 中运行
SELECT id, code, name, is_active 
FROM franchises 
WHERE code ILIKE '%sammamish%';  -- 不区分大小写搜索
```

**解决方案**：
- 确保数据库中 `code` 字段的值是小写：`'sammamish'`
- 或者在创建 franchise 时，确保 `code` 是小写

---

### 原因 2：Franchise 的 `is_active` 为 `false`

**问题**：
- 新创建的 franchise 的 `is_active` 可能默认是 `false`
- 或者被手动设置为 `false`

**检查方法**：
```sql
-- 在 Supabase SQL Editor 中运行
SELECT id, code, name, is_active 
FROM franchises 
WHERE code = 'sammamish';
```

**解决方案**：
- 确保 `is_active = true`
- 如果为 `false`，更新为 `true`：
  ```sql
  UPDATE franchises 
  SET is_active = true 
  WHERE code = 'sammamish';
  ```

---

### 原因 3：Franchise 根本没有创建成功

**问题**：
- 创建 franchise 时可能出现了错误
- 或者创建时使用了不同的 `code` 值

**检查方法**：
```sql
-- 在 Supabase SQL Editor 中运行
SELECT * FROM franchises 
ORDER BY created_at DESC 
LIMIT 10;
-- 查看最近创建的 franchise，确认 sammamish 是否存在
```

**解决方案**：
- 如果不存在，重新创建 franchise
- 确保 `code` 字段是小写：`'sammamish'`
- 确保 `is_active = true`

---

### 原因 4：URL 编码问题

**问题**：
- URL 中的 `sammamish` 可能被编码了
- 或者有额外的空格或特殊字符

**检查方法**：
- 查看浏览器地址栏中的实际 URL
- 检查是否有 `%20`（空格）或其他编码字符

**解决方案**：
- 确保 URL 是 `http://localhost:3000/locations/sammamish`（没有空格）
- 代码中已经使用了 `decodeURIComponent`，应该能处理编码问题

---

## 诊断步骤

### Step 1: 检查 Franchise 是否存在

在 Supabase SQL Editor 中运行：
```sql
SELECT 
  id,
  code,
  name,
  is_active,
  created_at
FROM franchises
WHERE code ILIKE '%sammamish%'
ORDER BY created_at DESC;
```

**预期结果**：
- 如果返回空结果，说明 franchise 不存在
- 如果返回结果，检查 `code` 和 `is_active` 的值

---

### Step 2: 检查 `code` 字段的值

```sql
SELECT 
  code,
  LOWER(code) as code_lower,
  code = 'sammamish' as exact_match,
  code = LOWER('sammamish') as lower_match
FROM franchises
WHERE code ILIKE '%sammamish%';
```

**预期结果**：
- `exact_match` 应该是 `true`（如果 `code` 是小写）
- 如果 `exact_match` 是 `false`，说明 `code` 不是小写

---

### Step 3: 检查 `is_active` 状态

```sql
SELECT 
  code,
  is_active,
  CASE 
    WHEN is_active = true THEN 'Active'
    ELSE 'Inactive'
  END as status
FROM franchises
WHERE code = 'sammamish';
```

**预期结果**：
- `is_active` 应该是 `true`
- 如果 `is_active` 是 `false`，需要更新为 `true`

---

### Step 4: 测试 `getFranchiseByCode` 函数

在 Node.js 环境中测试（或创建一个测试脚本）：
```typescript
import { getFranchiseByCode } from '@/lib/db'

const franchise = await getFranchiseByCode('sammamish')
console.log('Franchise:', franchise)
// 如果返回 null，说明查询失败
// 如果返回对象，说明查询成功
```

---

## 常见问题和解决方案

### 问题 1：创建 Franchise 时 `code` 使用了错误的大小写

**场景**：
- 在 Admin Portal 中创建 franchise 时，`code` 输入为 `'Sammamish'`（首字母大写）
- 但查询时使用的是 `'sammamish'`（全小写）

**解决方案**：
```sql
-- 更新 code 为小写
UPDATE franchises 
SET code = LOWER(code)
WHERE code = 'Sammamish';
```

**预防措施**：
- 在 Admin Portal 的创建表单中，自动将 `code` 转换为小写
- 或者在数据库层面添加约束，确保 `code` 总是小写

---

### 问题 2：创建 Franchise 时 `is_active` 默认为 `false`

**场景**：
- 创建 franchise 时，`is_active` 字段可能没有设置，默认为 `false`
- 或者被手动设置为 `false`

**解决方案**：
```sql
-- 更新 is_active 为 true
UPDATE franchises 
SET is_active = true
WHERE code = 'sammamish';
```

**预防措施**：
- 在创建 franchise 时，确保 `is_active = true`
- 或者在数据库层面设置默认值：`is_active BOOLEAN NOT NULL DEFAULT TRUE`

---

### 问题 3：Franchise 创建成功但 `code` 有拼写错误

**场景**：
- 创建时 `code` 输入为 `'sammamish'`
- 但实际存储的是 `'sammamish'`（拼写错误）

**解决方案**：
```sql
-- 检查所有 franchise 的 code
SELECT code, name FROM franchises ORDER BY code;

-- 如果发现拼写错误，更新 code
UPDATE franchises 
SET code = 'sammamish'
WHERE code = 'sammamish';  -- 假设原值是拼写错误的
```

---

## 修复脚本

如果确认是 `code` 或 `is_active` 的问题，可以使用以下脚本修复：

```sql
-- 修复 sammamish franchise
UPDATE franchises 
SET 
  code = LOWER(code),           -- 确保 code 是小写
  is_active = true              -- 确保 is_active 是 true
WHERE code ILIKE '%sammamish%';

-- 验证修复结果
SELECT id, code, name, is_active 
FROM franchises 
WHERE code = 'sammamish';
```

---

## 预防措施

### 1. 在 Admin Portal 中自动规范化 `code`

**建议**：在创建 franchise 的表单中，自动将 `code` 转换为小写：

```typescript
// 在 Admin Portal 的创建表单中
const handleCodeChange = (value: string) => {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '');
  setFormData({ ...formData, code: normalized });
};
```

### 2. 在数据库层面添加约束

**建议**：添加 CHECK 约束，确保 `code` 总是小写：

```sql
-- 添加约束（如果数据库支持）
ALTER TABLE franchises
  ADD CONSTRAINT franchises_code_lowercase_check
  CHECK (code = LOWER(code));
```

### 3. 在 API 层面验证

**建议**：在创建 franchise 的 API 中，自动规范化 `code`：

```typescript
// 在 POST /api/admin/franchises 中
const normalizedCode = body.code.trim().toLowerCase();
const franchise = {
  ...body,
  code: normalizedCode,
  is_active: body.is_active ?? true,  // 默认 true
};
```

---

## 总结

### 最可能的原因

1. **`code` 字段值不匹配**（大小写问题）
   - 数据库中可能是 `'Sammamish'`，但查询时使用 `'sammamish'`
   - **解决方案**：确保数据库中 `code` 是小写

2. **`is_active` 为 `false`**
   - 新创建的 franchise 可能 `is_active = false`
   - **解决方案**：更新为 `is_active = true`

3. **Franchise 不存在**
   - 创建时可能使用了不同的 `code` 值
   - **解决方案**：检查并重新创建

### 快速诊断命令

```sql
-- 一键诊断
SELECT 
  id,
  code,
  name,
  is_active,
  code = LOWER(code) as is_lowercase,
  CASE 
    WHEN code = 'sammamish' AND is_active = true THEN '✅ Ready'
    WHEN code = 'sammamish' AND is_active = false THEN '❌ Inactive'
    WHEN code != 'sammamish' THEN '❌ Wrong code'
    ELSE '❌ Not found'
  END as status
FROM franchises
WHERE code ILIKE '%sammamish%';
```

### 快速修复命令

```sql
-- 一键修复（如果确认是 sammamish）
UPDATE franchises 
SET 
  code = 'sammamish',
  is_active = true
WHERE code ILIKE '%sammamish%';
```

