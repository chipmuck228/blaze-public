-- =========================================================
-- migrate-add-franchises.sql
-- 为现有系统增加 Franchise / 多地点支持（Bellevue, Bel-Red, Issaquah, Cherry Crest）
-- =========================================================

-- 说明：
-- 1. 创建 franchises 表
-- 2. 为四个地点插入对应的 franchise 记录
-- 3. 扩展 course_locations，增加 franchise_id，并按 name 绑定
-- 4. 扩展 course_instances，增加 franchise_id，并从 location 反填
-- 5. 扩展 course_enrollments，增加 franchise_id，并从 instance 反填

-- =========================================================
-- 1. 创建 franchises 表
-- =========================================================

CREATE TABLE IF NOT EXISTS franchises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,          -- 'bellevue', 'belred', 'issaquah', 'cherrycrest'
  name TEXT NOT NULL,                 -- 显示名称
  primary_domain TEXT,                -- 可选：子域名，如 'bellevue.blazeroboticsacademy.org'
  timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  branding_config JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_franchises_code ON franchises(code);
CREATE INDEX IF NOT EXISTS idx_franchises_is_active ON franchises(is_active);

-- =========================================================
-- 2. 插入四个 franchise（如果尚不存在）
-- =========================================================

INSERT INTO franchises (code, name)
VALUES
  ('bellevue',    'Bellevue Robotics Academy'),
  ('belred',      'Bel-Red Robotics Academy'),
  ('issaquah',    'Issaquah Robotics Academy'),
  ('cherrycrest', 'Cherry Crest Robotics Academy')
ON CONFLICT (code) DO NOTHING;

-- 如需设置 primary_domain 或 branding_config，可在插入后单独更新：
-- UPDATE franchises SET primary_domain = 'bellevue.blazeroboticsacademy.org' WHERE code = 'bellevue';

-- =========================================================
-- 3. 扩展 course_locations：增加 franchise_id，并关联到四个 franchise
-- =========================================================

ALTER TABLE course_locations
  ADD COLUMN IF NOT EXISTS franchise_id UUID;

-- 3.1 根据 name 精确匹配绑定到对应 franchise
-- 假设 course_locations.name 精确为：'Bellevue', 'Bel-Red', 'Issaquah', 'Cherry Crest'

UPDATE course_locations cl
SET franchise_id = f.id
FROM franchises f
WHERE
  f.code = 'bellevue'
  AND cl.franchise_id IS NULL
  AND cl.name = 'Bellevue';

UPDATE course_locations cl
SET franchise_id = f.id
FROM franchises f
WHERE
  f.code = 'belred'
  AND cl.franchise_id IS NULL
  AND cl.name = 'Bel-Red';

UPDATE course_locations cl
SET franchise_id = f.id
FROM franchises f
WHERE
  f.code = 'issaquah'
  AND cl.franchise_id IS NULL
  AND cl.name = 'Issaquah';

UPDATE course_locations cl
SET franchise_id = f.id
FROM franchises f
WHERE
  f.code = 'cherrycrest'
  AND cl.franchise_id IS NULL
  AND cl.name = 'Cherry Crest';

-- 3.2 对于仍然没有匹配到的 location，可以统一挂到 Bellevue（作为默认 franchise）

UPDATE course_locations cl
SET franchise_id = f.id
FROM franchises f
WHERE
  f.code = 'bellevue'
  AND cl.franchise_id IS NULL;

-- 3.3 添加外键和索引

-- PostgreSQL 不支持在 ADD CONSTRAINT 中使用 IF NOT EXISTS，
-- 为避免重复错误，先尝试删除同名约束，再重新创建。
ALTER TABLE course_locations
  DROP CONSTRAINT IF EXISTS course_locations_franchise_id_fkey;

ALTER TABLE course_locations
  ADD CONSTRAINT course_locations_franchise_id_fkey
  FOREIGN KEY (franchise_id) REFERENCES franchises(id);

CREATE INDEX IF NOT EXISTS idx_course_locations_franchise_id
  ON course_locations(franchise_id);

-- =========================================================
-- 4. 扩展 course_instances：增加 franchise_id，并从 location 反填
-- =========================================================

ALTER TABLE course_instances
  ADD COLUMN IF NOT EXISTS franchise_id UUID;

-- 4.1 通过 location 反填 franchise_id

UPDATE course_instances ci
SET franchise_id = cl.franchise_id
FROM course_locations cl
WHERE
  ci.location_id = cl.id
  AND ci.franchise_id IS NULL
  AND cl.franchise_id IS NOT NULL;

-- 4.2 对于没有 location_id 的实例（如线上课），统一挂到 Bellevue

UPDATE course_instances ci
SET franchise_id = f.id
FROM franchises f
WHERE
  f.code = 'bellevue'
  AND ci.franchise_id IS NULL;

-- 4.3 添加外键和索引

ALTER TABLE course_instances
  DROP CONSTRAINT IF EXISTS course_instances_franchise_id_fkey;

ALTER TABLE course_instances
  ADD CONSTRAINT course_instances_franchise_id_fkey
  FOREIGN KEY (franchise_id) REFERENCES franchises(id);

CREATE INDEX IF NOT EXISTS idx_course_instances_franchise_id
  ON course_instances(franchise_id);

-- =========================================================
-- 5. 扩展 course_enrollments：增加 franchise_id，并从 instance 反填
-- =========================================================

ALTER TABLE course_enrollments
  ADD COLUMN IF NOT EXISTS franchise_id UUID;

-- 5.1 通过 instance 反填 franchise_id

UPDATE course_enrollments ce
SET franchise_id = ci.franchise_id
FROM course_instances ci
WHERE
  ce.instance_id = ci.id
  AND ce.franchise_id IS NULL
  AND ci.franchise_id IS NOT NULL;

-- 5.2 对于极端情况（没有实例或实例没有 franchise），统一挂到 Bellevue

UPDATE course_enrollments ce
SET franchise_id = f.id
FROM franchises f
WHERE
  f.code = 'bellevue'
  AND ce.franchise_id IS NULL;

-- 5.3 添加外键和索引

ALTER TABLE course_enrollments
  DROP CONSTRAINT IF EXISTS course_enrollments_franchise_id_fkey;

ALTER TABLE course_enrollments
  ADD CONSTRAINT course_enrollments_franchise_id_fkey
  FOREIGN KEY (franchise_id) REFERENCES franchises(id);

CREATE INDEX IF NOT EXISTS idx_course_enrollments_franchise_id
  ON course_enrollments(franchise_id);

-- =========================================================
-- 6. 可选：检查结果的辅助查询（执行时可取消注释）
-- =========================================================

-- 查看每个 franchise 下有多少 locations
-- SELECT f.code, f.name, COUNT(cl.id) AS location_count
-- FROM franchises f
-- LEFT JOIN course_locations cl ON cl.franchise_id = f.id
-- GROUP BY f.code, f.name
-- ORDER BY f.code;

-- 查看每个 franchise 下有多少 instances
-- SELECT f.code, COUNT(ci.id) AS instance_count
-- FROM franchises f
-- LEFT JOIN course_instances ci ON ci.franchise_id = f.id
-- GROUP BY f.code
-- ORDER BY f.code;

-- 查看每个 franchise 下有多少 enrollments
-- SELECT f.code, COUNT(ce.id) AS enrollment_count
-- FROM franchises f
-- LEFT JOIN course_enrollments ce ON ce.franchise_id = f.id
-- GROUP BY f.code
-- ORDER BY f.code;


