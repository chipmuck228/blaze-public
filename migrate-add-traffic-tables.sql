-- Traffic Analytics 流量统计功能数据库迁移脚本

-- 1. 访问记录表
CREATE TABLE IF NOT EXISTS traffic_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  page_path TEXT NOT NULL,
  referrer TEXT,
  referrer_domain TEXT,
  source_type TEXT NOT NULL, -- 'direct', 'google', 'bing', 'social', 'other'
  device_type TEXT NOT NULL, -- 'mobile', 'desktop', 'tablet'
  browser_name TEXT NOT NULL, -- 'Chrome', 'Mobile Safari', 'Chrome Mobile', 'Edge', 'Others'
  browser_version TEXT,
  os_name TEXT NOT NULL, -- 'iOS', 'Windows', 'macOS', 'Android', 'Other'
  os_version TEXT,
  user_agent TEXT,
  ip_address INET,
  country TEXT,
  city TEXT,
  is_bounce BOOLEAN DEFAULT FALSE,
  visit_duration INTEGER, -- 秒
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 访问记录表索引
CREATE INDEX IF NOT EXISTS idx_traffic_visits_created_at ON traffic_visits(created_at);
CREATE INDEX IF NOT EXISTS idx_traffic_visits_session_id ON traffic_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_traffic_visits_user_id ON traffic_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_traffic_visits_source_type ON traffic_visits(source_type);
CREATE INDEX IF NOT EXISTS idx_traffic_visits_device_type ON traffic_visits(device_type);
CREATE INDEX IF NOT EXISTS idx_traffic_visits_browser_name ON traffic_visits(browser_name);
CREATE INDEX IF NOT EXISTS idx_traffic_visits_os_name ON traffic_visits(os_name);

-- 访问记录表注释
COMMENT ON TABLE traffic_visits IS '网站访问记录表';
COMMENT ON COLUMN traffic_visits.session_id IS '会话ID，用于识别同一用户的多次访问';
COMMENT ON COLUMN traffic_visits.source_type IS '访问来源类型：direct(直接访问), google(Google搜索), bing(Bing搜索), social(社交媒体), other(其他)';
COMMENT ON COLUMN traffic_visits.device_type IS '设备类型：mobile(手机), desktop(桌面), tablet(平板)';
COMMENT ON COLUMN traffic_visits.is_bounce IS '是否为跳出访问（只访问一个页面就离开）';

-- 2. 页面浏览记录表
CREATE TABLE IF NOT EXISTS traffic_pageviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID REFERENCES traffic_visits(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  page_path TEXT NOT NULL,
  page_title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 页面浏览记录表索引
CREATE INDEX IF NOT EXISTS idx_traffic_pageviews_visit_id ON traffic_pageviews(visit_id);
CREATE INDEX IF NOT EXISTS idx_traffic_pageviews_session_id ON traffic_pageviews(session_id);
CREATE INDEX IF NOT EXISTS idx_traffic_pageviews_created_at ON traffic_pageviews(created_at);

-- 页面浏览记录表注释
COMMENT ON TABLE traffic_pageviews IS '页面浏览记录表';

-- 3. 会话表
CREATE TABLE IF NOT EXISTS traffic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES users(id),
  first_visit_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_visit_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  visit_count INTEGER DEFAULT 1,
  pageview_count INTEGER DEFAULT 0,
  is_bounce BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 会话表索引
CREATE INDEX IF NOT EXISTS idx_traffic_sessions_session_id ON traffic_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_traffic_sessions_user_id ON traffic_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_traffic_sessions_first_visit_at ON traffic_sessions(first_visit_at);
CREATE INDEX IF NOT EXISTS idx_traffic_sessions_last_visit_at ON traffic_sessions(last_visit_at);

-- 会话表注释
COMMENT ON TABLE traffic_sessions IS '用户会话表，用于追踪唯一访客';

-- 启用 RLS（Row Level Security）
ALTER TABLE traffic_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE traffic_pageviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE traffic_sessions ENABLE ROW LEVEL SECURITY;

-- RLS 策略：允许服务端管理所有流量数据
CREATE POLICY "Service can manage traffic_visits" ON traffic_visits
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service can manage traffic_pageviews" ON traffic_pageviews
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service can manage traffic_sessions" ON traffic_sessions
  FOR ALL USING (true) WITH CHECK (true);
