-- ==================== Coach Portal 数据库迁移脚本 ====================
-- 1. 扩展用户角色支持 'coach'
-- 2. 创建多教练关联表（支持一个实例分配给多个教练）
-- 3. 迁移现有数据

-- ==================== 第一步：扩展用户角色 ====================

-- 删除旧的 role 约束
ALTER TABLE users 
  DROP CONSTRAINT IF EXISTS users_role_check;

-- 添加新的 role 约束（支持 'coach'）
ALTER TABLE users 
  ADD CONSTRAINT users_role_check 
  CHECK (role IN ('user', 'admin', 'coach'));

-- 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ==================== 第二步：创建多教练关联表 ====================

-- 创建 course_instance_coaches 表（多对多关系）
CREATE TABLE IF NOT EXISTS course_instance_coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES course_instances(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE, -- 是否为主教练
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(instance_id, coach_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_course_instance_coaches_instance_id 
  ON course_instance_coaches(instance_id);
CREATE INDEX IF NOT EXISTS idx_course_instance_coaches_coach_id 
  ON course_instance_coaches(coach_id);
CREATE INDEX IF NOT EXISTS idx_course_instance_coaches_is_primary 
  ON course_instance_coaches(is_primary);

-- 创建更新时间戳触发器
CREATE OR REPLACE FUNCTION update_course_instance_coaches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_course_instance_coaches_updated_at
  BEFORE UPDATE ON course_instance_coaches
  FOR EACH ROW
  EXECUTE FUNCTION update_course_instance_coaches_updated_at();

-- ==================== 第三步：迁移现有数据 ====================

-- 将现有的 instructor_id 数据迁移到 course_instance_coaches 表
-- 只迁移 instructor_id 不为 NULL 且对应的用户存在且角色为 'coach' 的记录
INSERT INTO course_instance_coaches (instance_id, coach_id, is_primary, created_at, updated_at)
SELECT 
  ci.id AS instance_id,
  ci.instructor_id AS coach_id,
  TRUE AS is_primary, -- 现有教练设为主教练
  ci.created_at,
  ci.updated_at
FROM course_instances ci
INNER JOIN users u ON ci.instructor_id = u.id
WHERE ci.instructor_id IS NOT NULL
  AND u.role = 'coach' -- 只迁移角色为 coach 的用户
  AND NOT EXISTS (
    -- 避免重复插入
    SELECT 1 FROM course_instance_coaches cic
    WHERE cic.instance_id = ci.id AND cic.coach_id = ci.instructor_id
  );

-- ==================== 第四步：启用 RLS（如果需要） ====================

ALTER TABLE course_instance_coaches ENABLE ROW LEVEL SECURITY;

-- 允许所有操作（因为 API 路由已经检查了权限）
CREATE POLICY "Allow all operations on course_instance_coaches" 
  ON course_instance_coaches
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ==================== 第五步：添加注释 ====================

COMMENT ON TABLE course_instance_coaches IS '多对多关系表：课程实例和教练的关联';
COMMENT ON COLUMN course_instance_coaches.is_primary IS '是否为主教练（一个实例可以有多个教练，但只有一个主教练）';
COMMENT ON COLUMN course_instance_coaches.coach_id IS '教练用户ID（必须是 role = coach 的用户）';

-- ==================== 第六步：创建辅助视图（可选） ====================

-- 创建一个视图，方便查询教练的所有课程实例
CREATE OR REPLACE VIEW coach_instances_view AS
SELECT 
  cic.coach_id,
  cic.instance_id,
  cic.is_primary,
  ci.*,
  ca.course_id,
  ca.category_id,
  ca.series_id,
  ca.location_id AS assignment_location_id
FROM course_instance_coaches cic
INNER JOIN course_instances ci ON cic.instance_id = ci.id
LEFT JOIN course_assignments ca ON ci.assignment_id = ca.id
WHERE ci.is_active = TRUE;

COMMENT ON VIEW coach_instances_view IS '教练课程实例视图：显示所有分配给教练的活跃课程实例';

