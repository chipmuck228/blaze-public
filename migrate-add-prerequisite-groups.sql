-- Migration: Add Prerequisite Groups System (Phase 3)
-- Description: Create prerequisite_groups and prerequisite_group_items tables for complex prerequisite logic (OR relationships)
-- Date: 2025-01-XX

-- 1. Create prerequisite_groups table
CREATE TABLE IF NOT EXISTS prerequisite_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  group_type VARCHAR(20) NOT NULL DEFAULT 'and', -- 'and', 'or', 'custom'
  min_required INTEGER DEFAULT 1, -- 至少需要完成组内多少门课程（用于 OR 关系）
  display_order INTEGER DEFAULT 0,
  description TEXT, -- 组描述，如 "完成以下任意一门课程"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create prerequisite_group_items table
CREATE TABLE IF NOT EXISTS prerequisite_group_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES prerequisite_groups(id) ON DELETE CASCADE,
  prerequisite_id UUID NOT NULL REFERENCES course_prerequisites(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_group_prerequisite UNIQUE (group_id, prerequisite_id)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_prerequisite_groups_course ON prerequisite_groups(course_id);
CREATE INDEX IF NOT EXISTS idx_group_items_group ON prerequisite_group_items(group_id);
CREATE INDEX IF NOT EXISTS idx_group_items_prerequisite ON prerequisite_group_items(prerequisite_id);

-- 4. Create updated_at trigger
CREATE OR REPLACE FUNCTION update_prerequisite_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_prerequisite_groups_updated_at
  BEFORE UPDATE ON prerequisite_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_prerequisite_groups_updated_at();

-- 5. Add RLS policies
ALTER TABLE prerequisite_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE prerequisite_group_items ENABLE ROW LEVEL SECURITY;

-- Policy for service role (bypass RLS)
CREATE POLICY "Service role can manage prerequisite groups"
  ON prerequisite_groups
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage group items"
  ON prerequisite_group_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policy for authenticated users (read-only for now, admin operations via API)
CREATE POLICY "Authenticated users can view prerequisite groups"
  ON prerequisite_groups
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can view group items"
  ON prerequisite_group_items
  FOR SELECT
  USING (true);

-- 6. Add comments for documentation
COMMENT ON TABLE prerequisite_groups IS 'Stores prerequisite groups for complex prerequisite logic (AND/OR relationships)';
COMMENT ON COLUMN prerequisite_groups.course_id IS 'The course that requires these prerequisite groups';
COMMENT ON COLUMN prerequisite_groups.group_type IS 'Type of group: and (all required), or (at least min_required), custom (future use)';
COMMENT ON COLUMN prerequisite_groups.min_required IS 'Minimum number of prerequisites required in this group (for OR relationships)';
COMMENT ON COLUMN prerequisite_groups.description IS 'Description of the group requirement';

COMMENT ON TABLE prerequisite_group_items IS 'Links prerequisites to prerequisite groups';
COMMENT ON COLUMN prerequisite_group_items.group_id IS 'Reference to the prerequisite group';
COMMENT ON COLUMN prerequisite_group_items.prerequisite_id IS 'Reference to the course prerequisite';

