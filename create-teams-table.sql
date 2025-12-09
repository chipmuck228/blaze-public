-- 团队成员表
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  description TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 团队成员社交媒体链接表
CREATE TABLE IF NOT EXISTS team_social_networks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_teams_display_order ON teams(display_order);
CREATE INDEX IF NOT EXISTS idx_team_social_networks_team_id ON team_social_networks(team_id);
CREATE INDEX IF NOT EXISTS idx_team_social_networks_display_order ON team_social_networks(display_order);

-- 启用 Row Level Security (RLS)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_social_networks ENABLE ROW LEVEL SECURITY;

-- RLS 策略：允许所有人查看团队成员（公开数据）
CREATE POLICY "Anyone can view teams" ON teams
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view team social networks" ON team_social_networks
  FOR SELECT USING (true);

-- 更新时间戳触发器
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入团队成员数据
INSERT INTO teams (image_url, name, position, description, display_order) VALUES
  ('/Dave-W-1.png', 'Dave W. 1', 'Chef Coach', 'Coach Dave is a distinguished VEX Robotics coach with extensive experience at Blaze Robotics Academy. Over three seasons, Dave has coached a total of 68 teams, with 44 teams making it to State Championships and 18 teams advancing to the Worlds Championship.', 1),
  ('/Max-K.png', 'Max K.', 'Senior Coach', 'Coach Max brings extensive experience in robotics coaching, mentoring, and competition judging. having coached VEX, FRC, and FTC teams and developed VEX curriculum.', 2),
  ('/Daisy-D.png', 'Daisy D.', 'Senior Coach', 'Coach Daisy holds both a Master''s and Bachelor''s degree in Information Management and Psychology from the University of Washington and is the holder of a national patent.', 3),
  ('/Randall-C.webp', 'Randall C.', 'Senior Coach', 'Coach Daisy holds both a Master''s and Bachelor''s degree in Information Management and Psychology from the University of Washington and is the holder of a national patent.', 4),
  ('/Bowen-T.webp', 'Bowen T.', 'Senior Coach', 'Coach Daisy holds both a Master''s and Bachelor''s degree in Information Management and Psychology from the University of Washington and is the holder of a national patent.', 5),
  ('/Chris-P.webp', 'Chris P.', 'Senior Coach', 'Coach Daisy holds both a Master''s and Bachelor''s degree in Information Management and Psychology from the University of Washington and is the holder of a national patent.', 6),
  ('/Spencer-Y.webp', 'Spencer Y.', 'Senior Coach', 'Coach Daisy holds both a Master''s and Bachelor''s degree in Information Management and Psychology from the University of Washington and is the holder of a national patent.', 7)
ON CONFLICT DO NOTHING;

-- 插入社交媒体链接数据
-- Dave W. 1
INSERT INTO team_social_networks (team_id, name, url, display_order)
SELECT id, 'Youtube', 'https://youtube.com/leopoldo-miranda/', 1 FROM teams WHERE name = 'Dave W. 1'
UNION ALL
SELECT id, 'Facebook', 'https://www.facebook.com/', 2 FROM teams WHERE name = 'Dave W. 1'
UNION ALL
SELECT id, 'Instagram', 'https://www.instagram.com/', 3 FROM teams WHERE name = 'Dave W. 1';

-- Max K.
INSERT INTO team_social_networks (team_id, name, url, display_order)
SELECT id, 'Youtube', 'https://youtube.com/leopoldo-miranda/', 1 FROM teams WHERE name = 'Max K.'
UNION ALL
SELECT id, 'Facebook', 'https://www.facebook.com/', 2 FROM teams WHERE name = 'Max K.'
UNION ALL
SELECT id, 'Instagram', 'https://www.instagram.com/', 3 FROM teams WHERE name = 'Max K.'
UNION ALL
SELECT id, 'Xiaohongshu', 'https://xiaohongshu.com/leopoldo-miranda/', 4 FROM teams WHERE name = 'Max K.';

-- Daisy D.
INSERT INTO team_social_networks (team_id, name, url, display_order)
SELECT id, 'Facebook', 'https://facebook.com/leopoldo-miranda/', 1 FROM teams WHERE name = 'Daisy D.'
UNION ALL
SELECT id, 'Instagram', 'https://www.instagram.com/', 2 FROM teams WHERE name = 'Daisy D.';

-- Randall C.
INSERT INTO team_social_networks (team_id, name, url, display_order)
SELECT id, 'Youtube', 'https://youtube.com/leopoldo-miranda/', 1 FROM teams WHERE name = 'Randall C.'
UNION ALL
SELECT id, 'Xiaohongshu', 'https://xiaohongshu.com/leopoldo-miranda/', 2 FROM teams WHERE name = 'Randall C.'
UNION ALL
SELECT id, 'Instagram', 'https://www.instagram.com/', 3 FROM teams WHERE name = 'Randall C.';

-- Bowen T.
INSERT INTO team_social_networks (team_id, name, url, display_order)
SELECT id, 'Youtube', 'https://youtube.com/leopoldo-miranda/', 1 FROM teams WHERE name = 'Bowen T.'
UNION ALL
SELECT id, 'Instagram', 'https://www.instagram.com/', 2 FROM teams WHERE name = 'Bowen T.';

-- Chris P.
INSERT INTO team_social_networks (team_id, name, url, display_order)
SELECT id, 'Facebook', 'https://facebook.com/leopoldo-miranda/', 1 FROM teams WHERE name = 'Chris P.'
UNION ALL
SELECT id, 'Instagram', 'https://www.instagram.com/', 2 FROM teams WHERE name = 'Chris P.';

-- Spencer Y.
INSERT INTO team_social_networks (team_id, name, url, display_order)
SELECT id, 'Facebook', 'https://facebook.com/leopoldo-miranda/', 1 FROM teams WHERE name = 'Spencer Y.'
UNION ALL
SELECT id, 'Instagram', 'https://www.instagram.com/', 2 FROM teams WHERE name = 'Spencer Y.';

