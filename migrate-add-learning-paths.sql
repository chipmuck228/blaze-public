-- Migration: Add Learning Paths System (Phase 2)
-- Description: Create learning_paths and learning_path_courses tables for managing course learning sequences
-- Date: 2025-01-XX

-- 1. Create learning_paths table
CREATE TABLE IF NOT EXISTS learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- 路径名称，如 "VEX GO 完整路径"
  slug TEXT UNIQUE, -- URL友好的标识符
  description TEXT, -- 路径描述
  category_id UUID REFERENCES course_categories(id) ON DELETE SET NULL, -- 关联的课程大类
  target_audience TEXT, -- 目标受众
  estimated_duration_weeks INTEGER, -- 预计完成时间（周）
  difficulty_level VARCHAR(20), -- 'beginner', 'intermediate', 'advanced'
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create learning_path_courses table
CREATE TABLE IF NOT EXISTS learning_path_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  stage INTEGER NOT NULL, -- 阶段/级别（1, 2, 3...）
  stage_name TEXT, -- 阶段名称，如 "基础阶段", "进阶阶段"
  is_required BOOLEAN DEFAULT TRUE, -- 是否必须完成
  is_parallel BOOLEAN DEFAULT FALSE, -- 是否可以与同阶段其他课程并行学习
  display_order INTEGER DEFAULT 0, -- 同阶段内的显示顺序
  estimated_weeks INTEGER, -- 预计完成时间（周）
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_path_course UNIQUE (path_id, course_id)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_learning_paths_category ON learning_paths(category_id);
CREATE INDEX IF NOT EXISTS idx_learning_paths_slug ON learning_paths(slug);
CREATE INDEX IF NOT EXISTS idx_learning_paths_active ON learning_paths(is_active);
CREATE INDEX IF NOT EXISTS idx_path_courses_path ON learning_path_courses(path_id);
CREATE INDEX IF NOT EXISTS idx_path_courses_course ON learning_path_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_path_courses_stage ON learning_path_courses(path_id, stage);

-- 4. Create updated_at triggers
CREATE OR REPLACE FUNCTION update_learning_paths_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_learning_paths_updated_at
  BEFORE UPDATE ON learning_paths
  FOR EACH ROW
  EXECUTE FUNCTION update_learning_paths_updated_at();

CREATE TRIGGER trigger_update_learning_path_courses_updated_at
  BEFORE UPDATE ON learning_path_courses
  FOR EACH ROW
  EXECUTE FUNCTION update_learning_paths_updated_at();

-- 5. Add RLS policies
ALTER TABLE learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_path_courses ENABLE ROW LEVEL SECURITY;

-- Policy for service role (bypass RLS)
CREATE POLICY "Service role can manage learning paths"
  ON learning_paths
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage path courses"
  ON learning_path_courses
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policy for authenticated users (read-only for now, admin operations via API)
CREATE POLICY "Authenticated users can view learning paths"
  ON learning_paths
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can view path courses"
  ON learning_path_courses
  FOR SELECT
  USING (true);

-- 6. Add comments for documentation
COMMENT ON TABLE learning_paths IS 'Stores learning path definitions (course sequences)';
COMMENT ON COLUMN learning_paths.name IS 'Name of the learning path';
COMMENT ON COLUMN learning_paths.slug IS 'URL-friendly identifier for the learning path';
COMMENT ON COLUMN learning_paths.category_id IS 'Optional category association';
COMMENT ON COLUMN learning_paths.difficulty_level IS 'Difficulty level: beginner, intermediate, or advanced';
COMMENT ON COLUMN learning_paths.estimated_duration_weeks IS 'Estimated time to complete the path in weeks';

COMMENT ON TABLE learning_path_courses IS 'Stores courses within learning paths';
COMMENT ON COLUMN learning_path_courses.path_id IS 'Reference to the learning path';
COMMENT ON COLUMN learning_path_courses.course_id IS 'Reference to the course';
COMMENT ON COLUMN learning_path_courses.stage IS 'Stage/level number (1, 2, 3...)';
COMMENT ON COLUMN learning_path_courses.stage_name IS 'Name of the stage (e.g., "Foundation", "Intermediate")';
COMMENT ON COLUMN learning_path_courses.is_required IS 'Whether this course is required to complete the path';
COMMENT ON COLUMN learning_path_courses.is_parallel IS 'Whether this course can be taken in parallel with other courses in the same stage';

