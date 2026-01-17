-- ============================================================================
-- 迁移脚本：创建 offerings 表并迁移 courses 数据
-- 目的：保持 courses 表不变（向后兼容），创建新的 offerings 表支持多类型
-- 日期：2025-01-XX
-- ============================================================================

-- ==================== 第一步：创建枚举类型 ====================

-- 创建 offering_type 枚举类型
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'offering_type_enum') THEN
    CREATE TYPE offering_type_enum AS ENUM (
      'course',        -- 课程：每周一次，若干次课
      'camp',          -- 夏令营
      'workshop',      -- 工作坊：每周一次或每两周一次，支持 drop-in
      'free_trial',    -- 免费试听
      'gift_card',     -- 礼品卡
      'care_service',  -- 照护服务
      'lunch_service'  -- 午餐服务
    );
  END IF;
END $$;

-- ==================== 第二步：创建 offerings 表 ====================

-- 创建 offerings 表（包含 courses 的所有字段 + 新字段）
CREATE TABLE IF NOT EXISTS offerings (
  -- 主键和基础字段（与 courses 表相同）
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  target_audience TEXT,
  outcomes TEXT,                    -- 课程学习成果（向后兼容字段名，对应 courses.outcomes）
  learning_outcomes TEXT,           -- 课程学习成果（新字段名，从 outcomes 映射）
  prerequisites TEXT,
  cancellation_policy TEXT,
  
  -- 课程次数相关字段（向后兼容）
  number_of_sessions INTEGER,       -- 课程次数（向后兼容）
  session_count INTEGER,             -- 课程次数（数据库实际字段）
  
  -- 年龄相关字段（向后兼容）
  target_age_min INTEGER,            -- 目标学员最小年龄（向后兼容）
  target_age_max INTEGER,            -- 目标学员最大年龄（向后兼容）
  age_min INTEGER,                   -- 目标学员最小年龄（数据库实际字段）
  age_max INTEGER,                   -- 目标学员最大年龄（数据库实际字段）
  
  -- 年级相关字段（向后兼容）
  target_grades TEXT[],              -- 目标学员年级数组，如 ['K-2', '3-4']（向后兼容）
  grade_level TEXT,                  -- 目标学员年级（数据库实际字段）
  
  -- 价格相关字段
  base_price DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',
  duration_hours INTEGER,            -- 课程时长（小时）
  
  -- 状态相关字段
  poster_url TEXT,                   -- 课程招贴画 URL（存储在 Vercel Blob）
  status course_status DEFAULT 'draft',  -- 课程状态：'draft', 'published', 'suspended', 'archived'
  is_active BOOLEAN,                 -- 向后兼容字段（映射自 status）
  
  -- 新增字段：offering 类型和配置
  offering_type offering_type_enum NOT NULL DEFAULT 'course',  -- Offering 类型
  type_config JSONB DEFAULT '{}',    -- 类型特定的配置（JSONB，灵活存储）
  
  -- 时间戳字段
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== 第三步：创建索引 ====================

-- 创建索引（与 courses 表类似的索引）
CREATE INDEX IF NOT EXISTS idx_offerings_slug ON offerings(slug);
CREATE INDEX IF NOT EXISTS idx_offerings_status ON offerings(status);
CREATE INDEX IF NOT EXISTS idx_offerings_is_active ON offerings(is_active);
CREATE INDEX IF NOT EXISTS idx_offerings_offering_type ON offerings(offering_type);
CREATE INDEX IF NOT EXISTS idx_offerings_created_at ON offerings(created_at);

-- 为 JSONB 字段创建 GIN 索引（用于高效查询 type_config）
CREATE INDEX IF NOT EXISTS idx_offerings_type_config ON offerings USING GIN (type_config);

-- ==================== 第四步：创建触发器 ====================

-- 删除已存在的触发器（如果存在，确保脚本可以重新运行）
DROP TRIGGER IF EXISTS trigger_update_offerings_updated_at ON offerings;
DROP TRIGGER IF EXISTS trigger_sync_offerings_session_fields ON offerings;
DROP TRIGGER IF EXISTS trigger_sync_offerings_age_min_fields ON offerings;
DROP TRIGGER IF EXISTS trigger_sync_offerings_age_max_fields ON offerings;

-- 创建 updated_at 自动更新触发器
CREATE OR REPLACE FUNCTION update_offerings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_offerings_updated_at
  BEFORE UPDATE ON offerings
  FOR EACH ROW
  EXECUTE FUNCTION update_offerings_updated_at();

-- ==================== 创建字段同步触发器（保持向后兼容）====================

-- 触发器函数：同步 session_count 和 number_of_sessions
CREATE OR REPLACE FUNCTION sync_offerings_session_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- INSERT 或 UPDATE：确保两字段同步
  -- 如果 session_count 有值，同步到 number_of_sessions
  IF NEW.session_count IS NOT NULL THEN
    NEW.number_of_sessions = NEW.session_count;
  -- 如果 number_of_sessions 有值但 session_count 为空，同步到 session_count
  ELSIF NEW.number_of_sessions IS NOT NULL THEN
    NEW.session_count = NEW.number_of_sessions;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_offerings_session_fields
  BEFORE INSERT OR UPDATE ON offerings
  FOR EACH ROW
  EXECUTE FUNCTION sync_offerings_session_fields();

-- 触发器函数：同步 age_min 和 target_age_min
CREATE OR REPLACE FUNCTION sync_offerings_age_min_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- INSERT 或 UPDATE：确保两字段同步
  -- 如果 age_min 有值，同步到 target_age_min
  IF NEW.age_min IS NOT NULL THEN
    NEW.target_age_min = NEW.age_min;
  -- 如果 target_age_min 有值但 age_min 为空，同步到 age_min
  ELSIF NEW.target_age_min IS NOT NULL THEN
    NEW.age_min = NEW.target_age_min;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_offerings_age_min_fields
  BEFORE INSERT OR UPDATE ON offerings
  FOR EACH ROW
  EXECUTE FUNCTION sync_offerings_age_min_fields();

-- 触发器函数：同步 age_max 和 target_age_max
CREATE OR REPLACE FUNCTION sync_offerings_age_max_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- INSERT 或 UPDATE：确保两字段同步
  -- 如果 age_max 有值，同步到 target_age_max
  IF NEW.age_max IS NOT NULL THEN
    NEW.target_age_max = NEW.age_max;
  -- 如果 target_age_max 有值但 age_max 为空，同步到 age_max
  ELSIF NEW.target_age_max IS NOT NULL THEN
    NEW.age_max = NEW.target_age_max;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_offerings_age_max_fields
  BEFORE INSERT OR UPDATE ON offerings
  FOR EACH ROW
  EXECUTE FUNCTION sync_offerings_age_max_fields();

-- ==================== 第五步：迁移数据 ====================

-- 将 courses 表的所有数据迁移到 offerings 表
-- 注意：使用 INSERT ... ON CONFLICT 避免重复插入（基于 id）
INSERT INTO offerings (
  id,
  name,
  slug,
  description,
  target_audience,
  outcomes,
  learning_outcomes,
  prerequisites,
  cancellation_policy,
  number_of_sessions,
  session_count,
  target_age_min,
  target_age_max,
  age_min,
  age_max,
  target_grades,
  grade_level,
  base_price,
  currency,
  duration_hours,
  poster_url,
  status,
  is_active,
  offering_type,  -- 所有现有课程默认为 'course' 类型
  type_config,     -- 初始化为空 JSON 对象
  created_at,
  updated_at
)
SELECT 
  courses.id,
  courses.name,
  courses.slug,
  courses.description,
  courses.target_audience,
  courses.outcomes AS outcomes,  -- courses 表使用 outcomes 字段
  courses.outcomes AS learning_outcomes,  -- 将 outcomes 映射到 learning_outcomes（新表字段名）
  courses.prerequisites,
  courses.cancellation_policy,
  courses.number_of_sessions AS number_of_sessions,  -- courses 表使用 number_of_sessions
  courses.number_of_sessions AS session_count,  -- 将 number_of_sessions 映射到 session_count（新表字段名）
  courses.target_age_min AS target_age_min,  -- courses 表使用 target_age_min
  courses.target_age_max AS target_age_max,  -- courses 表使用 target_age_max
  courses.target_age_min AS age_min,  -- 将 target_age_min 映射到 age_min（新表字段名）
  courses.target_age_max AS age_max,  -- 将 target_age_max 映射到 age_max（新表字段名）
  courses.target_grades AS target_grades,  -- courses 表使用 target_grades
  NULL::TEXT AS grade_level,  -- courses 表没有 grade_level 字段，设为 NULL
  courses.base_price,
  courses.currency,
  NULL::INTEGER AS duration_hours,  -- courses 表没有 duration_hours 字段，设为 NULL
  NULL::TEXT AS poster_url,  -- courses 表没有 poster_url 字段，设为 NULL
  CASE 
    WHEN courses.is_active THEN 'published'::course_status 
    ELSE 'draft'::course_status 
  END AS status,  -- 根据 is_active 推断 status
  courses.is_active,
  'course'::offering_type_enum AS offering_type,  -- 所有现有课程设置为 'course' 类型
  '{}'::JSONB AS type_config,                      -- 初始化为空 JSON 对象
  courses.created_at,
  courses.updated_at
FROM courses
ON CONFLICT (id) DO NOTHING;  -- 如果 id 已存在，跳过（避免重复插入）

-- ==================== 第六步：启用 Row Level Security (RLS) ====================

-- 启用 RLS（如果需要）
ALTER TABLE offerings ENABLE ROW LEVEL SECURITY;

-- 删除已存在的 RLS 策略（如果存在，确保脚本可以重新运行）
DROP POLICY IF EXISTS "Anyone can view published offerings" ON offerings;
DROP POLICY IF EXISTS "Service role can manage offerings" ON offerings;

-- 创建 RLS 策略（与 courses 表类似的策略）
-- 注意：根据实际需求调整策略

-- 策略 1：允许所有人查看已发布的 offerings
CREATE POLICY "Anyone can view published offerings" ON offerings
  FOR SELECT
  USING (status = 'published');

-- 策略 2：允许服务角色（service_role）管理所有 offerings
CREATE POLICY "Service role can manage offerings" ON offerings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ==================== 第七步：数据验证 ====================

-- 验证数据迁移是否成功
DO $$
DECLARE
  courses_count INTEGER;
  offerings_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO courses_count FROM courses;
  SELECT COUNT(*) INTO offerings_count FROM offerings;
  
  IF courses_count != offerings_count THEN
    RAISE WARNING '数据迁移可能不完整：courses 表有 % 条记录，offerings 表有 % 条记录', 
      courses_count, offerings_count;
  ELSE
    RAISE NOTICE '数据迁移成功：courses 表有 % 条记录，offerings 表有 % 条记录', 
      courses_count, offerings_count;
  END IF;
END $$;

-- ==================== 第八步：添加注释 ====================

-- 添加表注释
COMMENT ON TABLE offerings IS 'Offerings 表：支持多种类型的 offering（Course, Camp, Workshop 等），保持 courses 表不变以实现向后兼容';

-- 添加字段注释
COMMENT ON COLUMN offerings.offering_type IS 'Offering 类型：course, camp, workshop, free_trial, gift_card, care_service, lunch_service';
COMMENT ON COLUMN offerings.type_config IS '类型特定的配置（JSONB），根据 offering_type 存储不同的配置项';

-- 向后兼容字段注释
COMMENT ON COLUMN offerings.number_of_sessions IS '课程次数（向后兼容字段），与 session_count 同步，优先使用 session_count';
COMMENT ON COLUMN offerings.session_count IS '课程次数（数据库实际字段），与 number_of_sessions 同步';
COMMENT ON COLUMN offerings.target_age_min IS '目标学员最小年龄（向后兼容字段），与 age_min 同步，优先使用 age_min';
COMMENT ON COLUMN offerings.age_min IS '目标学员最小年龄（数据库实际字段），与 target_age_min 同步';
COMMENT ON COLUMN offerings.target_age_max IS '目标学员最大年龄（向后兼容字段），与 age_max 同步，优先使用 age_max';
COMMENT ON COLUMN offerings.age_max IS '目标学员最大年龄（数据库实际字段），与 target_age_max 同步';

-- ==================== 完成 ====================

-- 输出完成信息
DO $$
BEGIN
  RAISE NOTICE '迁移完成！';
  RAISE NOTICE '- 已创建 offerings 表';
  RAISE NOTICE '- 已迁移所有 courses 数据到 offerings 表';
  RAISE NOTICE '- courses 表保持不变（向后兼容）';
  RAISE NOTICE '';
  RAISE NOTICE '下一步：';
  RAISE NOTICE '1. 更新 course_assignments 表，将 course_id 外键改为同时支持 courses 和 offerings';
  RAISE NOTICE '2. 或者创建新的 assignment_offerings 表关联到 offerings';
  RAISE NOTICE '3. 逐步迁移应用代码使用 offerings 表';
END $$;

