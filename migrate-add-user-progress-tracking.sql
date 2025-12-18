-- Migration: Add User Progress Tracking System (Phase 3)
-- Description: Create user_course_completions and user_learning_path_progress tables for tracking user learning progress
-- Date: 2025-01-XX

-- 1. Create user_course_completions table
CREATE TABLE IF NOT EXISTS user_course_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES course_instances(id) ON DELETE SET NULL, -- 完成的具体实例
  completion_date DATE NOT NULL, -- 完成日期
  grade TEXT, -- 成绩/等级（可选）
  certificate_url TEXT, -- 证书URL（可选）
  notes TEXT, -- 备注
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL, -- 验证人（教练/管理员）
  verified_at TIMESTAMP WITH TIME ZONE, -- 验证时间
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_user_course_completion UNIQUE (user_id, course_id, instance_id)
);

-- 2. Create user_learning_path_progress table
CREATE TABLE IF NOT EXISTS user_learning_path_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  current_stage INTEGER DEFAULT 1, -- 当前阶段
  completed_courses_count INTEGER DEFAULT 0, -- 已完成的课程数
  total_courses_count INTEGER NOT NULL, -- 路径总课程数
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- 开始时间
  last_activity_at TIMESTAMP WITH TIME ZONE, -- 最后活动时间
  completed_at TIMESTAMP WITH TIME ZONE, -- 完成时间（如果完成）
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_user_path UNIQUE (user_id, path_id)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_completions_user ON user_course_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_completions_course ON user_course_completions(course_id);
CREATE INDEX IF NOT EXISTS idx_completions_date ON user_course_completions(completion_date);
CREATE INDEX IF NOT EXISTS idx_path_progress_user ON user_learning_path_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_path_progress_path ON user_learning_path_progress(path_id);
CREATE INDEX IF NOT EXISTS idx_path_progress_completed ON user_learning_path_progress(is_completed);

-- 4. Create updated_at triggers
CREATE OR REPLACE FUNCTION update_user_completions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_completions_updated_at
  BEFORE UPDATE ON user_course_completions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_completions_updated_at();

CREATE TRIGGER trigger_update_path_progress_updated_at
  BEFORE UPDATE ON user_learning_path_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_user_completions_updated_at();

-- 5. Create function to update path progress when a course is completed
CREATE OR REPLACE FUNCTION update_learning_path_progress()
RETURNS TRIGGER AS $$
DECLARE
  v_path_id UUID;
  v_total_courses INTEGER;
  v_completed_courses INTEGER;
  v_current_stage INTEGER;
BEGIN
  -- 查找包含该课程的所有学习路径
  FOR v_path_id IN
    SELECT DISTINCT path_id
    FROM learning_path_courses
    WHERE course_id = NEW.course_id
  LOOP
    -- 获取路径总课程数（必填课程）
    SELECT COUNT(*) INTO v_total_courses
    FROM learning_path_courses
    WHERE path_id = v_path_id AND is_required = true;

    -- 获取用户在该路径中已完成的必填课程数
    SELECT COUNT(DISTINCT lpc.course_id) INTO v_completed_courses
    FROM learning_path_courses lpc
    INNER JOIN user_course_completions ucc ON ucc.course_id = lpc.course_id
    WHERE lpc.path_id = v_path_id
      AND lpc.is_required = true
      AND ucc.user_id = NEW.user_id;

    -- 计算当前阶段（找到第一个未完成的阶段）
    SELECT COALESCE(MIN(lpc.stage), 1) INTO v_current_stage
    FROM learning_path_courses lpc
    WHERE lpc.path_id = v_path_id
      AND lpc.is_required = true
      AND lpc.course_id NOT IN (
        SELECT course_id
        FROM user_course_completions
        WHERE user_id = NEW.user_id
      );

    -- 更新或插入路径进度
    INSERT INTO user_learning_path_progress (
      user_id,
      path_id,
      current_stage,
      completed_courses_count,
      total_courses_count,
      last_activity_at,
      is_completed,
      completed_at
    )
    VALUES (
      NEW.user_id,
      v_path_id,
      v_current_stage,
      v_completed_courses,
      v_total_courses,
      NOW(),
      v_completed_courses >= v_total_courses AND v_total_courses > 0,
      CASE WHEN v_completed_courses >= v_total_courses AND v_total_courses > 0 THEN NOW() ELSE NULL END
    )
    ON CONFLICT (user_id, path_id)
    DO UPDATE SET
      current_stage = v_current_stage,
      completed_courses_count = v_completed_courses,
      total_courses_count = v_total_courses,
      last_activity_at = NOW(),
      is_completed = v_completed_courses >= v_total_courses AND v_total_courses > 0,
      completed_at = CASE WHEN v_completed_courses >= v_total_courses AND v_total_courses > 0 THEN NOW() ELSE user_learning_path_progress.completed_at END;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to auto-update path progress
CREATE TRIGGER trigger_update_path_progress_on_completion
  AFTER INSERT ON user_course_completions
  FOR EACH ROW
  EXECUTE FUNCTION update_learning_path_progress();

-- 7. Add RLS policies
ALTER TABLE user_course_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_learning_path_progress ENABLE ROW LEVEL SECURITY;

-- Policy for service role (bypass RLS)
CREATE POLICY "Service role can manage completions"
  ON user_course_completions
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage path progress"
  ON user_learning_path_progress
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policy for authenticated users
CREATE POLICY "Users can view their own completions"
  ON user_course_completions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own path progress"
  ON user_learning_path_progress
  FOR SELECT
  USING (auth.uid() = user_id);

-- 8. Add comments for documentation
COMMENT ON TABLE user_course_completions IS 'Tracks user course completions with verification support';
COMMENT ON COLUMN user_course_completions.instance_id IS 'The specific course instance that was completed';
COMMENT ON COLUMN user_course_completions.verified_by IS 'User who verified the completion (coach/admin)';
COMMENT ON COLUMN user_course_completions.certificate_url IS 'URL to the completion certificate if available';

COMMENT ON TABLE user_learning_path_progress IS 'Tracks user progress through learning paths';
COMMENT ON COLUMN user_learning_path_progress.current_stage IS 'Current stage the user is working on';
COMMENT ON COLUMN user_learning_path_progress.completed_courses_count IS 'Number of required courses completed';
COMMENT ON COLUMN user_learning_path_progress.total_courses_count IS 'Total number of required courses in the path';

