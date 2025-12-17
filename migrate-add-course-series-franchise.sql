-- migrate-add-course-series-franchise.sql
-- 为 course_series（Program / Session）增加 franchise_id 字段，并建立外键与索引

BEGIN;

-- 1. 添加 franchise_id 列（可为空，便于兼容已有数据）
ALTER TABLE course_series
  ADD COLUMN IF NOT EXISTS franchise_id UUID;

-- 2. 为已有 series 反填 franchise_id（可选策略：暂时挂到 Bellevue 或留空）
-- 这里选择**不自动赋值**，由管理员在 Admin 界面中逐步指定，每条 series 的 franchise。
-- 如需默认挂到某个 franchise，可取消注释并指定 code：
--
-- UPDATE course_series cs
-- SET franchise_id = f.id
-- FROM franchises f
-- WHERE cs.franchise_id IS NULL
--   AND f.code = 'bellevue';

-- 3. 添加外键和索引
ALTER TABLE course_series
  DROP CONSTRAINT IF EXISTS course_series_franchise_id_fkey;

ALTER TABLE course_series
  ADD CONSTRAINT course_series_franchise_id_fkey
  FOREIGN KEY (franchise_id) REFERENCES franchises(id);

CREATE INDEX IF NOT EXISTS idx_course_series_franchise_id
  ON course_series(franchise_id);

COMMIT;


