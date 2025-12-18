-- Migration: Add Course Prerequisites System (Phase 1)
-- Description: Create course_prerequisites table for managing course dependencies
-- Date: 2025-01-XX

-- 1. Create course_prerequisites table
CREATE TABLE IF NOT EXISTS course_prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  prerequisite_course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  requirement_type VARCHAR(20) NOT NULL DEFAULT 'required', -- 'required', 'recommended', 'optional'
  is_mandatory BOOLEAN DEFAULT TRUE, -- 是否必须完成（用于 AND/OR 逻辑，Phase 1 中所有都是 TRUE）
  display_order INTEGER DEFAULT 0, -- 显示顺序
  notes TEXT, -- 备注说明
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 防止自引用和重复
  CONSTRAINT no_self_reference CHECK (course_id != prerequisite_course_id),
  CONSTRAINT unique_prerequisite UNIQUE (course_id, prerequisite_course_id)
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_prerequisites_course ON course_prerequisites(course_id);
CREATE INDEX IF NOT EXISTS idx_course_prerequisites_prerequisite ON course_prerequisites(prerequisite_course_id);

-- 3. Create updated_at trigger
CREATE OR REPLACE FUNCTION update_course_prerequisites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_course_prerequisites_updated_at
  BEFORE UPDATE ON course_prerequisites
  FOR EACH ROW
  EXECUTE FUNCTION update_course_prerequisites_updated_at();

-- 4. Create function to check for circular dependencies
CREATE OR REPLACE FUNCTION check_circular_dependency(
  p_course_id UUID,
  p_prerequisite_course_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_cycle BOOLEAN;
BEGIN
  -- Check if adding this prerequisite would create a cycle
  -- Using recursive CTE to detect cycles
  WITH RECURSIVE prerequisite_chain AS (
    -- Start from the prerequisite course
    SELECT prerequisite_course_id, course_id
    FROM course_prerequisites
    WHERE course_id = p_prerequisite_course_id
    
    UNION ALL
    
    -- Follow the chain
    SELECT cp.prerequisite_course_id, cp.course_id
    FROM course_prerequisites cp
    INNER JOIN prerequisite_chain pc ON cp.course_id = pc.prerequisite_course_id
    WHERE cp.course_id != p_course_id -- Stop if we reach back to the original course
  )
  SELECT EXISTS(
    SELECT 1
    FROM prerequisite_chain
    WHERE prerequisite_course_id = p_course_id
  ) INTO v_has_cycle;
  
  RETURN NOT v_has_cycle; -- Return TRUE if no cycle (safe to add)
END;
$$ LANGUAGE plpgsql;

-- 5. Add trigger to prevent circular dependencies
CREATE OR REPLACE FUNCTION prevent_circular_dependency()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT check_circular_dependency(NEW.course_id, NEW.prerequisite_course_id) THEN
    RAISE EXCEPTION 'Circular dependency detected: Course % cannot have course % as prerequisite', 
      NEW.course_id, NEW.prerequisite_course_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_circular_dependency
  BEFORE INSERT OR UPDATE ON course_prerequisites
  FOR EACH ROW
  EXECUTE FUNCTION prevent_circular_dependency();

-- 6. Add RLS policies (allow all for service role, restrict for authenticated users)
-- Note: In practice, we rely on API-level authorization
ALTER TABLE course_prerequisites ENABLE ROW LEVEL SECURITY;

-- Policy for service role (bypass RLS)
CREATE POLICY "Service role can manage prerequisites"
  ON course_prerequisites
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policy for authenticated users (read-only for now, admin operations via API)
CREATE POLICY "Authenticated users can view prerequisites"
  ON course_prerequisites
  FOR SELECT
  USING (true);

-- 7. Add comments for documentation
COMMENT ON TABLE course_prerequisites IS 'Stores prerequisite relationships between courses';
COMMENT ON COLUMN course_prerequisites.course_id IS 'The course that requires prerequisites';
COMMENT ON COLUMN course_prerequisites.prerequisite_course_id IS 'The course that must be completed first';
COMMENT ON COLUMN course_prerequisites.requirement_type IS 'Type of requirement: required, recommended, or optional';
COMMENT ON COLUMN course_prerequisites.is_mandatory IS 'Whether this prerequisite is mandatory (for AND/OR logic)';
COMMENT ON COLUMN course_prerequisites.display_order IS 'Order in which prerequisites are displayed';

