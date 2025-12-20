# Franchise 信息显示诊断指南

## 检查清单

### 1. 数据库检查

运行以下 SQL 查询检查数据库中的数据：

```sql
-- 检查所有 franchises 及其 branding_config
SELECT 
  code,
  name,
  is_active,
  branding_config IS NOT NULL AS has_branding_config,
  branding_config->'hero'->>'title' AS hero_title,
  branding_config->'highlights'->>'programs' AS highlight_programs
FROM franchises
ORDER BY code;

-- 检查每个 franchise 的 locations 数量
SELECT 
  f.code,
  f.name,
  COUNT(cl.id) AS location_count
FROM franchises f
LEFT JOIN course_locations cl ON cl.franchise_id = f.id AND cl.is_active = true
WHERE f.is_active = true
GROUP BY f.id, f.code, f.name
ORDER BY f.code;

-- 检查 locations 的详细信息
SELECT 
  cl.name AS location_name,
  f.code AS franchise_code,
  cl.address,
  cl.city,
  cl.state,
  cl.phone,
  cl.email,
  cl.description
FROM course_locations cl
JOIN franchises f ON f.id = cl.franchise_id
WHERE cl.is_active = true AND f.is_active = true
ORDER BY f.code, cl.name;
```

### 2. API 端点测试

测试以下 API 端点，确保返回正确的数据：

#### 2.1 测试 Franchise 详细信息
```bash
# 测试每个 franchise
curl http://localhost:3000/api/public/franchises/bellevue
curl http://localhost:3000/api/public/franchises/issaquah
curl http://localhost:3000/api/public/franchises/cherrycrest
curl http://localhost:3000/api/public/franchises/belred
```

**预期结果**：
- 返回 200 状态码
- `branding_config` 字段存在且为对象（不是字符串）
- `hero.title` 和 `hero.description` 有值
- `highlights.programs`, `highlights.schedule`, `highlights.focus` 有值

#### 2.2 测试 Franchise Locations
```bash
curl http://localhost:3000/api/public/franchises/bellevue/locations
curl http://localhost:3000/api/public/franchises/issaquah/locations
```

**预期结果**：
- 返回 200 状态码
- `locations` 数组包含该 franchise 的所有 active locations
- 每个 location 包含 `name`, `address`, `city`, `state` 等字段

### 3. 前端页面检查

访问以下页面，检查显示是否正确：

- `http://localhost:3000/locations/bellevue`
- `http://localhost:3000/locations/issaquah`
- `http://localhost:3000/locations/cherrycrest`
- `http://localhost:3000/locations/belred`

**检查点**：

1. **Hero 区域**
   - [ ] 标题显示正确（应该显示 `branding_config.hero.title` 或 `franchise.name`）
   - [ ] 描述显示正确（应该显示 `branding_config.hero.description` 或默认描述）
   - [ ] 地址显示正确（应该显示 `branding_config.contact.address` 或第一个 location 的地址）

2. **Highlights 卡片**
   - [ ] Programs 描述显示正确
   - [ ] Schedule 描述显示正确
   - [ ] Focus 描述显示正确

3. **联系方式区域**
   - [ ] 地址显示正确
   - [ ] 电话显示正确（如果有）
   - [ ] 邮箱显示正确（如果有）
   - [ ] 营业时间显示正确（如果有）

4. **Locations 列表**
   - [ ] 如果有多个 locations，应该显示列表
   - [ ] 每个 location 的名称和地址显示正确

### 4. 常见问题排查

#### 问题 1: branding_config 为 null 或空

**症状**：页面显示默认内容，而不是自定义内容

**检查**：
```sql
SELECT code, name, branding_config 
FROM franchises 
WHERE code = 'bellevue';
```

**解决方案**：
1. 运行 `migrate-extend-franchises-content.sql` 迁移脚本
2. 或在 Admin Portal 中编辑 Franchise 内容

#### 问题 2: branding_config 是字符串而不是对象

**症状**：API 返回的 `branding_config` 是字符串

**原因**：Supabase 客户端库版本问题，或数据库返回格式问题

**解决方案**：代码已经处理了这种情况（`getFranchiseDetailsByCode` 函数会自动解析）

#### 问题 3: Locations 为空

**症状**：页面不显示地址信息

**检查**：
```sql
SELECT * FROM course_locations 
WHERE franchise_id = (SELECT id FROM franchises WHERE code = 'bellevue');
```

**解决方案**：
1. 确保 locations 已正确关联到 franchise（`franchise_id` 字段）
2. 确保 locations 的 `is_active = true`

#### 问题 4: 404 错误

**症状**：访问 `/locations/{code}` 返回 404

**检查**：
```sql
SELECT code, name, is_active 
FROM franchises 
WHERE code = 'bellevue';
```

**解决方案**：
1. 确保 franchise 存在
2. 确保 `is_active = true`
3. 检查 `code` 字段的大小写（代码会自动转换为小写）

### 5. 调试步骤

#### 步骤 1: 检查数据库数据
运行上面的 SQL 查询，确认数据存在且格式正确。

#### 步骤 2: 测试 API
使用 curl 或浏览器测试 API 端点，确认返回的数据格式正确。

#### 步骤 3: 检查浏览器控制台
打开浏览器开发者工具，查看：
- Network 标签：检查 API 请求是否成功
- Console 标签：检查是否有 JavaScript 错误

#### 步骤 4: 检查服务器日志
查看 Next.js 服务器日志，检查是否有错误信息。

### 6. 修复建议

如果发现问题，按以下顺序修复：

1. **运行迁移脚本**（如果还没运行）：
   ```sql
   -- 运行 migrate-extend-franchises-content.sql
   -- 运行 migrate-extend-course-locations.sql
   ```

2. **在 Admin Portal 中编辑内容**：
   - 访问 `/admin/franchises`
   - 点击 "Edit Content" 按钮
   - 填写并保存内容

3. **检查代码逻辑**：
   - 确认 `getFranchiseDetailsByCode` 正确解析 `branding_config`
   - 确认回退策略正确工作
   - 确认 locations 正确获取

### 7. 验证脚本

创建一个简单的测试页面来验证所有 franchise：

```typescript
// 测试页面：/test-franchises
'use client'

import { useEffect, useState } from 'react'

export default function TestFranchisesPage() {
  const [results, setResults] = useState<any[]>([])

  useEffect(() => {
    const testFranchises = async () => {
      const codes = ['bellevue', 'issaquah', 'cherrycrest', 'belred']
      const testResults = []

      for (const code of codes) {
        try {
          const res = await fetch(`/api/public/franchises/${code}`)
          const data = await res.ok ? await res.json() : { error: 'Not found' }
          
          const locationsRes = await fetch(`/api/public/franchises/${code}/locations`)
          const locationsData = await locationsRes.ok ? await locationsRes.json() : { error: 'Not found' }

          testResults.push({
            code,
            franchise: data,
            locations: locationsData.locations || [],
            hasBrandingConfig: !!data.branding_config,
            heroTitle: data.branding_config?.hero?.title || data.name,
          })
        } catch (error) {
          testResults.push({ code, error: (error as Error).message })
        }
      }

      setResults(testResults)
    }

    testFranchises()
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Franchise 信息测试</h1>
      <pre className="bg-gray-100 p-4 rounded overflow-auto">
        {JSON.stringify(results, null, 2)}
      </pre>
    </div>
  )
}
```

---

## 快速检查命令

```bash
# 1. 检查所有 franchise 的 API
for code in bellevue issaquah cherrycrest belred; do
  echo "Testing $code..."
  curl -s http://localhost:3000/api/public/franchises/$code | jq '.name, .branding_config.hero.title'
done

# 2. 检查所有 franchise 的 locations
for code in bellevue issaquah cherrycrest belred; do
  echo "Testing $code locations..."
  curl -s http://localhost:3000/api/public/franchises/$code/locations | jq '.locations | length'
done
```

