-- 课程数据表结构
-- 支持多层级分类：大类 -> 系列 -> 子类 -> 课程 -> 课程实例

-- 1. 课程大类表（Courses, Camp, Workshop）
CREATE TABLE IF NOT EXISTS course_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- 'Courses', 'Camp', 'Workshop'
  display_name TEXT NOT NULL, -- 显示名称
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 课程系列表（如"2025年冬季课程"）
CREATE TABLE IF NOT EXISTS course_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES course_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- '2025年冬季课程'
  display_name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(category_id, name) -- 同一大类下系列名称唯一
);

-- 3. 课程子类表（RoboQuests, LaunchPad, RoboChamps）
CREATE TABLE IF NOT EXISTS course_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES course_series(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- 'RoboQuests', 'LaunchPad', 'RoboChamps'
  display_name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(series_id, name) -- 同一系列下子类名称唯一
);

-- 4. 课程表（Introduction to Robotics with VEX GO）
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcategory_id UUID NOT NULL REFERENCES course_subcategories(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- 'Introduction to Robotics with VEX GO'
  slug TEXT UNIQUE, -- URL友好的标识符
  description TEXT, -- 课程描述
  target_audience TEXT, -- 针对受众
  outcomes TEXT, -- 课程outcome（可以是JSON或文本）
  prerequisites TEXT, -- Prerequisites
  cancellation_policy TEXT, -- 取消政策
  number_of_sessions INTEGER, -- 课程次数
  target_age_min INTEGER, -- 目标学员最小年龄
  target_age_max INTEGER, -- 目标学员最大年龄
  target_grades TEXT[], -- 目标学员年级数组，如 ['K-2', '3-4']
  base_price DECIMAL(10, 2), -- 基础价格
  currency TEXT DEFAULT 'USD', -- 货币
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 地点表（可选，用于管理地点信息）
CREATE TABLE IF NOT EXISTS course_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- 'Bellevue', 'Issaquah', 'Bel-Red'
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 课程实例表（不同地点、日期、时间段的开课）
CREATE TABLE IF NOT EXISTS course_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  location_id UUID REFERENCES course_locations(id) ON DELETE SET NULL,
  location_name TEXT, -- 如果location_id为NULL，可以使用这个字段
  start_date DATE NOT NULL, -- 开课日期
  end_date DATE NOT NULL, -- 结课日期
  start_time TIME, -- 开始时间（如 '09:00:00'）
  end_time TIME, -- 结束时间（如 '12:00:00'）
  day_of_week INTEGER[], -- 星期几开课，如 [1,3,5] 表示周一、三、五
  price DECIMAL(10, 2), -- 实例特定价格（如果与基础价格不同）
  max_students INTEGER, -- 最大学生数
  current_students INTEGER DEFAULT 0, -- 当前学生数
  instructor_name TEXT, -- 讲师姓名
  instructor_id UUID, -- 讲师ID（如果将来有讲师表）
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
  notes TEXT, -- 备注
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_course_categories_display_order ON course_categories(display_order);
CREATE INDEX IF NOT EXISTS idx_course_categories_is_active ON course_categories(is_active);

CREATE INDEX IF NOT EXISTS idx_course_series_category_id ON course_series(category_id);
CREATE INDEX IF NOT EXISTS idx_course_series_display_order ON course_series(display_order);
CREATE INDEX IF NOT EXISTS idx_course_series_is_active ON course_series(is_active);

CREATE INDEX IF NOT EXISTS idx_course_subcategories_series_id ON course_subcategories(series_id);
CREATE INDEX IF NOT EXISTS idx_course_subcategories_display_order ON course_subcategories(display_order);
CREATE INDEX IF NOT EXISTS idx_course_subcategories_is_active ON course_subcategories(is_active);

CREATE INDEX IF NOT EXISTS idx_courses_subcategory_id ON courses(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_courses_slug ON courses(slug);
CREATE INDEX IF NOT EXISTS idx_courses_display_order ON courses(display_order);
CREATE INDEX IF NOT EXISTS idx_courses_is_active ON courses(is_active);

CREATE INDEX IF NOT EXISTS idx_course_locations_is_active ON course_locations(is_active);

CREATE INDEX IF NOT EXISTS idx_course_instances_course_id ON course_instances(course_id);
CREATE INDEX IF NOT EXISTS idx_course_instances_location_id ON course_instances(location_id);
CREATE INDEX IF NOT EXISTS idx_course_instances_start_date ON course_instances(start_date);
CREATE INDEX IF NOT EXISTS idx_course_instances_end_date ON course_instances(end_date);
CREATE INDEX IF NOT EXISTS idx_course_instances_status ON course_instances(status);
CREATE INDEX IF NOT EXISTS idx_course_instances_is_active ON course_instances(is_active);

-- 启用 Row Level Security (RLS)
ALTER TABLE course_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_instances ENABLE ROW LEVEL SECURITY;

-- RLS 策略：允许所有人查看课程信息（公开数据）
CREATE POLICY "Anyone can view course categories" ON course_categories
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Anyone can view course series" ON course_series
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Anyone can view course subcategories" ON course_subcategories
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Anyone can view courses" ON courses
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Anyone can view course locations" ON course_locations
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Anyone can view course instances" ON course_instances
  FOR SELECT USING (is_active = TRUE);

-- RLS 策略：允许管理员管理所有课程数据
CREATE POLICY "Admin can manage course categories" ON course_categories
  FOR ALL USING (auth.role() = 'admin') WITH CHECK (auth.role() = 'admin');

CREATE POLICY "Admin can manage course series" ON course_series
  FOR ALL USING (auth.role() = 'admin') WITH CHECK (auth.role() = 'admin');

CREATE POLICY "Admin can manage course subcategories" ON course_subcategories
  FOR ALL USING (auth.role() = 'admin') WITH CHECK (auth.role() = 'admin');

CREATE POLICY "Admin can manage courses" ON courses
  FOR ALL USING (auth.role() = 'admin') WITH CHECK (auth.role() = 'admin');

CREATE POLICY "Admin can manage course locations" ON course_locations
  FOR ALL USING (auth.role() = 'admin') WITH CHECK (auth.role() = 'admin');

CREATE POLICY "Admin can manage course instances" ON course_instances
  FOR ALL USING (auth.role() = 'admin') WITH CHECK (auth.role() = 'admin');

-- 更新时间戳触发器
CREATE TRIGGER update_course_categories_updated_at BEFORE UPDATE ON course_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_series_updated_at BEFORE UPDATE ON course_series
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_subcategories_updated_at BEFORE UPDATE ON course_subcategories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_locations_updated_at BEFORE UPDATE ON course_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_instances_updated_at BEFORE UPDATE ON course_instances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入初始数据示例
-- 1. 插入课程大类
INSERT INTO course_categories (name, display_name, description, display_order) VALUES
  ('courses', 'Courses', 'Regular courses offered throughout the year', 1),
  ('camp', 'Camp', 'Camp programs during school breaks', 2),
  ('workshop', 'Workshop', 'Workshop sessions', 3)
ON CONFLICT (name) DO NOTHING;

-- 2. 插入课程系列（示例：2025年冬季课程）
INSERT INTO course_series (category_id, name, display_name, description, start_date, end_date, display_order)
SELECT 
  cc.id,
  'winter-2025',
  'Winter 2025 Courses',
  'Winter 2025 Robotics & Programming Programs',
  '2025-01-01',
  '2025-03-31',
  1
FROM course_categories cc
WHERE cc.name = 'courses'
ON CONFLICT (category_id, name) DO NOTHING;

-- 3. 插入课程子类（示例：RoboQuests, LaunchPad, RoboChamps）
INSERT INTO course_subcategories (series_id, name, display_name, description, display_order)
SELECT 
  cs.id,
  'roboquests',
  'RoboQuests',
  'RoboQuests program for young learners',
  1
FROM course_series cs
WHERE cs.name = 'winter-2025'
ON CONFLICT (series_id, name) DO NOTHING;

INSERT INTO course_subcategories (series_id, name, display_name, description, display_order)
SELECT 
  cs.id,
  'launchpad',
  'LaunchPad',
  'LaunchPad program for intermediate learners',
  2
FROM course_series cs
WHERE cs.name = 'winter-2025'
ON CONFLICT (series_id, name) DO NOTHING;

INSERT INTO course_subcategories (series_id, name, display_name, description, display_order)
SELECT 
  cs.id,
  'robochamps',
  'RoboChamps',
  'RoboChamps program for advanced learners',
  3
FROM course_series cs
WHERE cs.name = 'winter-2025'
ON CONFLICT (series_id, name) DO NOTHING;

-- 4. 插入课程（示例：Introduction to Robotics with VEX GO）
INSERT INTO courses (
  subcategory_id,
  name,
  slug,
  description,
  target_audience,
  outcomes,
  prerequisites,
  cancellation_policy,
  number_of_sessions,
  target_age_min,
  target_age_max,
  target_grades,
  base_price,
  display_order
)
SELECT 
  csc.id,
  'Introduction to Robotics with VEX GO',
  'intro-robotics-vex-go',
  'Perfect introduction to robotics for young learners using VEX GO kits.',
  'Elementary school students interested in robotics',
  'Students will learn basic robotics concepts, programming fundamentals, and teamwork skills.',
  'No prior experience required',
  '100% refund minus 3% processing fee until 15 days before the start of the activity. Prorated credit after the start.',
  10,
  5,
  8,
  ARRAY['K-2'],
  299.99,
  1
FROM course_subcategories csc
WHERE csc.name = 'roboquests'
ON CONFLICT (slug) DO NOTHING;

-- 5. 插入地点（示例）
INSERT INTO course_locations (name, address, city, state, zip_code, phone, email) VALUES
  ('Bellevue', '1910 132nd Ave NE #7', 'Bellevue', 'WA', '98005', '425-610-8618', 'info@blazeroboticsacademy.org'),
  ('Bel-Red', '12509 Bel-Red Rd #100', 'Bellevue', 'WA', '98005', '425-610-8618', 'info@blazeroboticsacademy.org'),
  ('Issaquah', '1045 12th Ave NW #F-2', 'Issaquah', 'WA', '98027', '425-610-8618', 'info@blazeroboticsacademy.org')
ON CONFLICT DO NOTHING;

-- 6. 插入课程实例（示例）
INSERT INTO course_instances (
  course_id,
  location_id,
  start_date,
  end_date,
  start_time,
  end_time,
  day_of_week,
  price,
  max_students,
  instructor_name,
  status
)
SELECT 
  c.id,
  cl.id,
  '2025-01-15',
  '2025-03-19',
  '09:00:00',
  '12:00:00',
  ARRAY[1, 3], -- Monday and Wednesday
  299.99,
  15,
  'Coach Dave',
  'scheduled'
FROM courses c
CROSS JOIN course_locations cl
WHERE c.slug = 'intro-robotics-vex-go'
  AND cl.name = 'Bellevue'
ON CONFLICT DO NOTHING;

