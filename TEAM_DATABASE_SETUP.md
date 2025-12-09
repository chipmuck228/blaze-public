# 团队成员数据库设置指南

## 概述

团队成员信息现在存储在数据库中，可以从 Supabase 动态加载。

## 数据库表结构

### teams 表
- `id` - UUID 主键
- `image_url` - 头像图片路径
- `name` - 成员姓名
- `position` - 职位
- `description` - 描述
- `display_order` - 显示顺序
- `created_at` - 创建时间
- `updated_at` - 更新时间

### team_social_networks 表
- `id` - UUID 主键
- `team_id` - 关联的团队成员 ID
- `name` - 社交媒体名称（Youtube, Facebook, Instagram, Xiaohongshu）
- `url` - 社交媒体链接
- `display_order` - 显示顺序
- `created_at` - 创建时间

## 设置步骤

### 1. 在 Supabase 中创建表

在 Supabase SQL Editor 中运行 `create-teams-table.sql` 文件：

```sql
-- 这个文件会：
-- 1. 创建 teams 表
-- 2. 创建 team_social_networks 表
-- 3. 设置索引和 RLS 策略
-- 4. 插入所有团队成员数据
```

### 2. 验证数据

运行以下查询验证数据是否正确插入：

```sql
-- 查看所有团队成员
SELECT * FROM teams ORDER BY display_order;

-- 查看所有社交媒体链接
SELECT t.name, tsn.name as social_network, tsn.url 
FROM teams t
JOIN team_social_networks tsn ON t.id = tsn.team_id
ORDER BY t.display_order, tsn.display_order;
```

## 功能特性

### 自动加载
- Home 页面加载时，Team 组件会自动从数据库获取团队成员信息
- 如果数据库加载失败，会使用默认的硬编码数据作为后备

### API 端点
- `GET /api/teams` - 获取所有团队成员及其社交媒体链接

### 数据格式
API 返回的数据格式：
```json
[
  {
    "id": "uuid",
    "image_url": "/Dave-W-1.png",
    "name": "Dave W. 1",
    "position": "Chef Coach",
    "description": "...",
    "display_order": 1,
    "social_networks": [
      {
        "id": "uuid",
        "name": "Youtube",
        "url": "https://youtube.com/...",
        "display_order": 1
      }
    ]
  }
]
```

## 更新团队成员

### 添加新成员

```sql
INSERT INTO teams (image_url, name, position, description, display_order)
VALUES ('/new-member.png', 'New Member', 'Position', 'Description', 8);

-- 然后添加社交媒体链接
INSERT INTO team_social_networks (team_id, name, url, display_order)
SELECT id, 'Youtube', 'https://youtube.com/...', 1 
FROM teams WHERE name = 'New Member';
```

### 更新成员信息

```sql
UPDATE teams 
SET description = 'New description'
WHERE name = 'Dave W. 1';
```

### 删除成员

```sql
-- 删除成员会自动删除关联的社交媒体链接（CASCADE）
DELETE FROM teams WHERE name = 'Member Name';
```

## 注意事项

1. **图片路径**：确保图片文件存在于 `public` 目录中
2. **显示顺序**：使用 `display_order` 字段控制团队成员在页面上的显示顺序
3. **RLS 策略**：团队成员数据是公开的，所有人都可以查看
4. **后备数据**：如果数据库连接失败，组件会使用硬编码的默认数据

## 故障排除

### 问题：页面显示空白或加载失败

1. 检查数据库表是否已创建
2. 检查数据是否已插入
3. 查看浏览器控制台的错误信息
4. 检查 API 端点 `/api/teams` 是否正常工作

### 问题：团队成员不显示

1. 验证 `display_order` 是否正确设置
2. 检查图片路径是否正确
3. 确认 RLS 策略允许公开访问

