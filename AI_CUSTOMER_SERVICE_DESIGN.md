# AI Customer Service Design for Location Pages

## 一、概述

在 location 页面（如 `/locations/sammamish#contact`）的 contact 部分，添加 AI 客服功能。用户点击 "Contact {Location} Blaze Robotics" 按钮后，页面右下角弹出对话框，使用 Vercel AI SDK 和 RAG（检索增强生成）技术，精准回答用户关于课程信息、注册信息等问题。

---

## 二、架构设计

### 2.1 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Location Page (/locations/[code])                │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │  Contact Button → Chat Dialog (右下角)      │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          │ HTTP/SSE
                          ▼
┌─────────────────────────────────────────────────────────┐
│              API Routes (Next.js API)                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │  POST /api/ai/chat                               │  │
│  │  - 接收用户消息                                   │  │
│  │  - 调用 RAG 检索                                 │  │
│  │  - 调用 AI SDK 生成回答                          │  │
│  │  - 流式返回响应                                   │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
        ▼                                   ▼
┌──────────────────┐            ┌──────────────────┐
│   RAG System     │            │   AI Provider    │
│  ┌────────────┐  │            │  (OpenAI/Anthropic)│
│  │ Vector DB  │  │            │                   │
│  │ (Supabase  │  │            │  - GPT-4         │
│  │  pgvector) │  │            │  - Claude         │
│  └────────────┘  │            └──────────────────┘
│  ┌────────────┐  │
│  │ Knowledge  │  │
│  │ Base      │  │
│  │ (Courses,  │  │
│  │ Enrollments│ │
│  │ Locations) │  │
│  └────────────┘  │
└──────────────────┘
```

### 2.2 数据流

1. **用户输入** → 前端 Chat Dialog
2. **API 调用** → `/api/ai/chat` (POST)
3. **RAG 检索** → 从向量数据库检索相关上下文
4. **AI 生成** → 使用检索到的上下文生成回答
5. **流式返回** → 使用 Server-Sent Events (SSE) 或 Streaming Response
6. **前端渲染** → 实时显示 AI 回答

---

## 三、技术栈

### 3.1 前端
- **Next.js 14+** (App Router)
- **Vercel AI SDK** (`ai` package)
- **React Hooks** (`useChat`, `useState`, `useEffect`)
- **UI Components**: 
  - Dialog/Sheet (shadcn/ui)
  - ScrollArea (消息列表)
  - Input (用户输入)
  - Button (发送按钮)

### 3.2 后端
- **Next.js API Routes**
- **Vercel AI SDK** (`ai` package)
  - `streamText` 或 `streamChat` 用于流式响应
  - `createOpenAI` 或 `createAnthropic` 用于 AI 提供商
- **Supabase**
  - PostgreSQL + pgvector 扩展（向量数据库）
  - 现有数据库（课程、注册、位置信息）

### 3.3 AI 提供商
- **OpenAI** (GPT-4, GPT-4 Turbo) 或
- **Anthropic** (Claude 3.5 Sonnet)
- 推荐：**OpenAI GPT-4 Turbo**（成本效益和性能平衡）

### 3.4 向量数据库
- **Supabase pgvector**
  - 使用 `vector` 类型存储嵌入向量
  - 使用 `cosine` 或 `inner_product` 距离进行相似度搜索

---

## 四、RAG 实现方案

### 4.1 知识库构建（分阶段实施）

#### 4.1.1 MVP 阶段数据源（Phase 1）
1. **位置信息** (`course_locations`, `franchises` 表)
   - 位置名称、地址、联系方式
   - 营业时间、设施信息
   - **实现方式**: 直接从数据库查询，无需向量搜索

2. **组织介绍** (`franchises.branding_config`)
   - 校区介绍、亮点信息
   - 联系方式、营业时间
   - **实现方式**: 从 branding_config JSONB 字段读取

3. **基础 FAQ**
   - 硬编码的常见问题（如 "What is Blaze Robotics Academy?"）
   - **实现方式**: 包含在 System Prompt 中

#### 4.1.2 增强阶段数据源（Phase 2+）
1. **课程信息** (`courses` 表) - Phase 2
   - 课程名称、描述、目标受众、学习成果
   - 价格、时长、会话数、年龄范围、年级
   - 先修条件、取消政策
   - **实现方式**: 向量搜索

2. **课程实例** (`course_instances` 表) - Phase 2
   - 开始/结束日期、时间
   - 地点、容量、当前学生数
   - 状态（scheduled, ongoing, completed）
   - **实现方式**: 向量搜索

3. **注册信息** (`course_enrollments` 表) - Phase 3
   - 注册状态、支付状态
   - 注册日期、到期日期
   - **实现方式**: 向量搜索 + 数据库查询

4. **学习路径** (`learning_paths` 表) - Phase 2
   - 路径名称、描述、难度级别
   - 课程序列、推荐信息
   - **实现方式**: 向量搜索

#### 4.1.2 文档分块策略
- **块大小**: 500-1000 tokens（根据内容调整）
- **重叠**: 50-100 tokens（确保上下文连续性）
- **分块方式**:
  - 按表分块（每个课程一个文档）
  - 按字段组合（课程基本信息、课程详情、实例信息）
  - 结构化 JSON 格式（便于 AI 理解）

#### 4.1.3 嵌入向量生成
- **模型**: `text-embedding-3-small` 或 `text-embedding-ada-002` (OpenAI)
- **批量处理**: 使用 OpenAI Embeddings API 批量生成
- **存储**: 存储在 Supabase 的 `knowledge_base` 表中

### 4.2 向量数据库设计

#### 4.2.1 数据库表结构

```sql
-- 知识库表
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,                    -- 原始文本内容
  embedding vector(1536),                  -- 嵌入向量 (OpenAI ada-002)
  metadata JSONB,                           -- 元数据（来源表、ID、类型等）
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建向量索引
CREATE INDEX ON knowledge_base 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 元数据索引（用于过滤）
CREATE INDEX ON knowledge_base USING GIN (metadata);
```

#### 4.2.2 元数据结构

```json
{
  "source_table": "courses",
  "source_id": "uuid",
  "franchise_id": "uuid",
  "location_id": "uuid",
  "content_type": "course_info|course_instance|enrollment|location",
  "language": "en",
  "last_updated": "2025-01-XX"
}
```

### 4.3 检索策略

#### 4.3.1 相似度搜索
1. **用户查询嵌入**: 将用户问题转换为向量
2. **向量搜索**: 使用 `cosine` 距离在 `knowledge_base` 中搜索
3. **Top-K 检索**: 返回最相关的 K 个文档（K=5-10）
4. **元数据过滤**: 
   - 根据当前 location (`franchise_id`)
   - 根据内容类型（课程、注册、位置）
   - 根据时间（只检索活跃/未来的实例）

#### 4.3.2 混合检索（可选）
- **向量检索** + **关键词检索** (BM25)
- 结合两种结果，提高准确性

### 4.4 上下文构建

```typescript
// 伪代码
async function buildContext(userQuery: string, franchiseId: string) {
  // 1. 嵌入用户查询
  const queryEmbedding = await generateEmbedding(userQuery)
  
  // 2. 向量搜索（带元数据过滤）
  const relevantDocs = await supabase
    .from('knowledge_base')
    .select('content, metadata')
    .match({ 'metadata->franchise_id': franchiseId })
    .order('embedding <-> :query', { ascending: true })
    .limit(5)
  
  // 3. 构建上下文
  const context = relevantDocs
    .map(doc => `[${doc.metadata.content_type}] ${doc.content}`)
    .join('\n\n')
  
  return context
}
```

---

## 五、AI 提示词设计

### 5.1 System Prompt

#### MVP 阶段 System Prompt（Phase 1）

```
You are a helpful customer service assistant for Blaze Robotics Academy, 
specifically for the {location_name} campus.

Your role:
- Answer questions about the campus location, address, contact information, and general information about Blaze Robotics Academy
- Provide accurate information based on the provided context
- Be friendly, professional, and concise
- If you don't know something, admit it and suggest contacting the campus directly

About {location_name} campus:
- Location Name: {franchise_name}
- Address: {primary_address}
- Phone: {contact_phone}
- Email: {contact_email}
- Business Hours: {business_hours}

About Blaze Robotics Academy:
{organization_intro}

Available Locations:
{locations_list}

Important guidelines:
- Always mention the specific location name when relevant
- For questions about specific courses, schedules, or enrollment, politely redirect users to view the course catalog or contact the campus directly
- For urgent matters, suggest contacting the campus directly
- Keep answers concise and helpful
- If asked about courses, say: "I can help you with general information about our campus. For specific course details, schedules, and enrollment, please visit our course catalog or contact us directly."
```

#### 增强阶段 System Prompt（Phase 2+）

```
You are a helpful customer service assistant for Blaze Robotics Academy, 
specifically for the {location_name} campus.

Your role:
- Answer questions about courses, programs, schedules, enrollment, and campus information
- Provide accurate information based on the provided context
- Be friendly, professional, and concise
- If you don't know something, admit it and suggest contacting the campus directly

Context about {location_name} campus:
{basic_info}
{retrieved_course_context}

Important guidelines:
- Always mention the specific location name when relevant
- Provide specific dates, times, and prices when available
- For enrollment questions, guide users to the enrollment system
- For urgent matters, suggest contacting the campus directly
```

### 5.2 User Message Format

```
User: {user_query}

Context:
{retrieved_context}

Please answer the user's question based on the context provided.
```

---

## 六、API 设计

### 6.1 API 端点

**POST `/api/ai/chat`**

**请求体**:
```json
{
  "message": "What courses are available at Sammamish?",
  "franchiseCode": "sammamish",
  "conversationId": "optional-uuid",  // 用于多轮对话
  "history": [  // 可选：对话历史
    {
      "role": "user",
      "content": "Previous question"
    },
    {
      "role": "assistant",
      "content": "Previous answer"
    }
  ]
}
```

**响应** (Streaming):
```
data: {"type": "text", "content": "I can help you"}
data: {"type": "text", "content": " find courses"}
data: {"type": "done", "content": ""}
```

### 6.2 实现流程

#### MVP 阶段实现（Phase 1）

```typescript
// /api/ai/chat/route.ts (MVP 伪代码)
export async function POST(req: Request) {
  const { message, franchiseCode, history } = await req.json()
  
  // 1. 获取 franchise 和 location 信息（直接从数据库查询）
  const franchise = await getFranchiseByCode(franchiseCode)
  const locations = await getFranchiseLocations(franchise.id)
  
  // 2. 构建基本信息上下文（非向量搜索）
  const basicInfo = {
    franchiseName: franchise.name,
    locations: locations.map(loc => ({
      name: loc.name,
      address: `${loc.address}, ${loc.city}, ${loc.state} ${loc.zip_code}`,
      phone: loc.phone,
      email: loc.email
    })),
    organizationIntro: franchise.branding_config?.hero?.description || 
                       'Blaze Robotics Academy provides robotics, coding, and engineering programs for students.',
    businessHours: franchise.branding_config?.contact?.businessHours
  }
  
  // 3. 构建提示词（包含基本信息）
  const systemPrompt = buildBasicSystemPrompt(basicInfo)
  
  // 4. 调用 AI SDK（无需 RAG）
  const stream = await streamText({
    model: openai('gpt-4-turbo-preview'),
    system: systemPrompt,
    messages: [
      ...history,
      { role: 'user', content: message }
    ],
    temperature: 0.7,
    maxTokens: 500
  })
  
  // 5. 返回流式响应
  return stream.toDataStreamResponse()
}
```

#### 增强阶段实现（Phase 2+）

```typescript
// /api/ai/chat/route.ts (增强版伪代码)
export async function POST(req: Request) {
  const { message, franchiseCode, history } = await req.json()
  
  // 1. 获取基本信息（同 MVP）
  const franchise = await getFranchiseByCode(franchiseCode)
  const basicInfo = await getBasicInfo(franchise)
  
  // 2. RAG 检索（Phase 2+）
  const ragContext = await buildRAGContext(message, franchise.id)
  
  // 3. 构建完整提示词
  const systemPrompt = buildEnhancedSystemPrompt(basicInfo, ragContext)
  
  // 4. 调用 AI SDK
  const stream = await streamText({
    model: openai('gpt-4-turbo-preview'),
    system: systemPrompt,
    messages: [
      ...history,
      { role: 'user', content: message }
    ],
    temperature: 0.7,
    maxTokens: 500
  })
  
  // 5. 返回流式响应
  return stream.toDataStreamResponse()
}
```

---

## 七、前端 UI/UX 设计

### 7.1 Chat Dialog 组件

**位置**: 页面右下角（固定定位）

**尺寸**:
- 默认：小图标按钮（Chat 图标）
- 展开：400px × 600px 对话框

**布局**:
```
┌─────────────────────────────┐
│  AI Assistant - Sammamish  │ [X]
├─────────────────────────────┤
│                             │
│  ┌───────────────────────┐ │
│  │ Welcome! How can I    │ │
│  │ help you today?       │ │
│  └───────────────────────┘ │
│                             │
│  ┌───────────────────────┐ │
│  │ What courses are      │ │
│  │ available?            │ │
│  └───────────────────────┘ │
│                             │
│  ┌───────────────────────┐ │
│  │ I can help you find   │ │
│  │ courses...            │ │
│  └───────────────────────┘ │
│                             │
├─────────────────────────────┤
│ [Type your message...] [Send]│
└─────────────────────────────┘
```

### 7.2 功能特性

1. **消息列表**
   - 用户消息：右对齐，蓝色背景
   - AI 消息：左对齐，灰色背景
   - 流式显示：AI 回答逐字显示（打字效果）

2. **输入框**
   - 多行文本输入
   - 发送按钮（Enter 或点击）
   - 加载状态（发送中禁用输入）

3. **快捷操作**
   - "View Programs" 按钮（跳转到课程目录）
   - "Contact Campus" 按钮（显示联系方式）
   - "Clear Chat" 按钮（清空对话历史）

4. **状态指示**
   - "AI is typing..." 提示
   - 错误提示（网络错误、API 错误）

### 7.3 交互流程

1. **初始状态**: 页面右下角显示 Chat 图标按钮
2. **点击按钮**: 展开对话框，显示欢迎消息
3. **用户输入**: 输入问题，点击发送
4. **AI 处理**: 显示 "AI is typing..."，流式返回回答
5. **多轮对话**: 保持对话历史，支持上下文理解
6. **关闭对话框**: 点击 X 或外部区域，最小化为图标

---

## 八、数据同步策略

### 8.1 知识库更新

**触发时机**:
- 课程信息更新（新增、修改、删除）
- 课程实例创建/更新
- 位置信息变更
- 学习路径更新

**更新方式**:
1. **实时更新** (推荐): 使用数据库触发器或 API 钩子
2. **定时同步**: Cron job 定期检查并更新
3. **手动触发**: Admin 后台手动刷新知识库

### 8.2 增量更新

- 只更新变更的文档
- 删除已失效的文档（如已取消的课程）
- 保持向量索引性能

---

## 九、安全性和隐私

### 9.1 数据安全
- **API 认证**: 使用 NextAuth session 验证（可选）
- **速率限制**: 防止滥用（如 10 次/分钟/用户）
- **输入验证**: 过滤恶意输入、SQL 注入等
- **输出过滤**: 确保 AI 回答不包含敏感信息

### 9.2 隐私保护
- **不存储用户对话**: 对话历史仅保存在客户端（localStorage）
- **匿名使用**: 不要求用户登录即可使用
- **数据最小化**: 只检索必要的信息

### 9.3 内容安全
- **内容审核**: 使用 OpenAI Moderation API 检查用户输入
- **回答限制**: 限制 AI 回答范围（只回答课程相关问题）

---

## 十、性能优化

### 10.1 响应时间
- **向量搜索**: < 100ms（使用索引）
- **AI 生成**: 2-5 秒（取决于模型和长度）
- **流式返回**: 首字延迟 < 1 秒

### 10.2 缓存策略
- **常见问题缓存**: 缓存常见问题的回答（Redis 或内存）
- **向量缓存**: 缓存查询向量（避免重复计算）

### 10.3 成本优化
- **使用较小的模型**: GPT-4 Turbo 而非 GPT-4
- **限制上下文长度**: 只检索最相关的 5 个文档
- **批量嵌入**: 批量生成嵌入向量（降低成本）

---

## 十一、监控和分析

### 11.1 指标追踪
- **使用量**: 每日/每周对话数
- **响应时间**: 平均响应时间
- **用户满意度**: 通过反馈按钮收集
- **常见问题**: 分析用户最常问的问题

### 11.2 日志记录
- **用户查询**: 记录查询内容（脱敏）
- **AI 回答**: 记录 AI 生成的回答
- **错误日志**: 记录 API 错误、超时等

---

## 十二、实施步骤（分阶段实施）

### Phase 1: MVP - 基础 UI 和简单信息检索（2-3 周）

#### 1.1 前端 UI 开发（1-1.5 周）
**目标**: 完成功能完善的对话界面

1. **Chat Dialog 组件开发**
   - 创建右下角固定位置的对话框组件
   - 实现展开/收起动画
   - 实现消息列表（用户消息、AI 消息）
   - 实现输入框和发送按钮
   - 实现加载状态和错误提示
   - 实现滚动到最新消息
   - 响应式设计（移动端适配）

2. **流式消息显示**
   - 集成 Vercel AI SDK `useChat` hook
   - 实现流式文本显示（打字效果）
   - 实现消息状态管理（发送中、已完成、错误）

3. **基础交互功能**
   - 多轮对话支持（保持对话历史）
   - 清空对话功能
   - 关闭/最小化对话框
   - 键盘快捷键（Enter 发送，Esc 关闭）

4. **UI 优化**
   - 消息气泡样式
   - 时间戳显示（可选）
   - 头像/图标显示
   - 动画和过渡效果

#### 1.2 后端基础 API（0.5-1 周）
**目标**: 实现基本的 AI 对话功能，无需 RAG

1. **API 路由开发**
   - 创建 `/api/ai/chat` 端点
   - 集成 Vercel AI SDK `streamText`
   - 实现流式响应（Server-Sent Events）
   - 基础错误处理

2. **简单提示词设计**
   - System Prompt: 包含 Blaze Robotics Academy 基本信息
   - 硬编码基本信息（组织介绍、联系方式等）
   - 支持 location 特定的上下文

3. **基础信息检索（非向量搜索）**
   - 从数据库直接查询 location 信息
   - 从数据库查询 franchise 信息
   - 从 branding_config 获取组织介绍
   - 返回结构化信息给 AI

#### 1.3 基本信息集成（0.5 周）
**目标**: AI 能够回答基本信息查询

1. **数据源准备**
   - Location 信息（地址、联系方式）
   - Franchise 信息（名称、描述）
   - 组织介绍（从 branding_config 或硬编码）
   - 营业时间（如果可用）

2. **上下文构建**
   - 根据当前 location 动态构建上下文
   - 将基本信息注入到 System Prompt
   - 支持多 location 切换

3. **提示词优化**
   - 确保 AI 能够准确回答地址、联系方式等问题
   - 确保 AI 能够介绍 Blaze Robotics Academy
   - 限制 AI 回答范围（只回答基本信息，不回答课程详情）

#### 1.4 测试和优化（0.5 周）
1. UI/UX 测试
2. 对话质量测试
3. 错误处理测试
4. 性能测试（响应时间）

**MVP 完成标准**:
- ✅ 用户点击 "Contact {Location}" 按钮，对话框正常弹出
- ✅ 用户输入问题，AI 能够流式返回回答
- ✅ AI 能够准确回答地址、联系方式、组织介绍等基本信息
- ✅ 多轮对话正常工作
- ✅ UI 美观、响应迅速
- ✅ 移动端体验良好

---

### Phase 2: 增强功能 - 课程信息检索（2-3 周）

#### 2.1 向量数据库设置（1 周）
1. 设置 Supabase pgvector 扩展
2. 创建 `knowledge_base` 表
3. 设计文档分块策略
4. 实现课程信息嵌入和存储

#### 2.2 RAG 系统实现（1-1.5 周）
1. 实现向量搜索功能
2. 实现上下文构建逻辑
3. 集成到现有 API
4. 测试检索准确性

#### 2.3 课程信息集成（0.5-1 周）
1. 课程基本信息检索
2. 课程实例信息检索
3. 学习路径信息检索
4. 提示词优化（支持课程查询）

**Phase 2 完成标准**:
- ✅ AI 能够回答课程相关问题
- ✅ 能够检索课程详情、价格、时间等
- ✅ 能够推荐适合的课程

---

### Phase 3: 高级功能 - 注册和个性化（2-3 周）

#### 3.1 注册信息检索（1 周）
1. 注册状态查询
2. 注册流程说明
3. 等待列表信息

#### 3.2 个性化推荐（1-1.5 周）
1. 基于用户历史的推荐
2. 基于年龄/年级的推荐
3. 学习路径推荐

#### 3.3 预约和支付集成（0.5-1 周）
1. 课程预约功能
2. 支付流程说明
3. 注册链接生成

---

### Phase 4: 优化和扩展（持续）

#### 4.1 性能优化
1. 缓存策略
2. 响应时间优化
3. 成本优化

#### 4.2 功能扩展
1. 多语言支持
2. 语音输入
3. 文件上传
4. 人工客服转接

#### 4.3 监控和分析
1. 使用量统计
2. 用户满意度收集
3. 常见问题分析
4. A/B 测试

---

## 十三、技术债务和未来改进

### 13.1 短期改进
- **多语言支持**: 支持中文、英文等多语言
- **语音输入**: 集成语音识别
- **文件上传**: 支持上传图片/文档进行问答

### 13.2 长期改进
- **个性化推荐**: 基于用户历史推荐课程
- **预约功能**: 直接在对话中预约课程
- **支付集成**: 在对话中完成支付
- **多模态 AI**: 支持图片、视频理解

---

## 十四、成本估算

### 14.1 MVP 阶段成本（Phase 1）

#### AI 成本（每月）
- **GPT-4 Turbo**: ~$0.01/1K tokens (输入), ~$0.03/1K tokens (输出)
- **假设**: 500 次对话/天（MVP 阶段），平均 300 tokens/对话（较简单的问题）
  - 输入: 500 × 300 × 30 × $0.01/1000 = $45/月
  - 输出: 500 × 300 × 30 × $0.03/1000 = $135/月
  - **总计**: ~$180/月

#### 基础设施
- **Supabase**: 现有数据库（无额外成本，无需向量扩展）
- **Vercel**: 现有部署（无额外成本）

**MVP 总成本**: ~$180/月（500 对话/天）

### 14.2 增强阶段成本（Phase 2+）

#### AI 成本（每月）
- **GPT-4 Turbo**: ~$0.01/1K tokens (输入), ~$0.03/1K tokens (输出)
- **假设**: 1000 次对话/天，平均 500 tokens/对话
  - 输入: 1000 × 500 × 30 × $0.01/1000 = $150/月
  - 输出: 1000 × 500 × 30 × $0.03/1000 = $450/月
  - **总计**: ~$600/月

#### 嵌入成本
- **text-embedding-3-small**: ~$0.02/1M tokens
- **初始嵌入**: 假设 10K 文档，每个 500 tokens = 5M tokens = $0.10
- **增量更新**: 每月 ~$1-5

#### 基础设施
- **Supabase**: 现有数据库 + pgvector 扩展（无额外成本）
- **Vercel**: 现有部署（无额外成本）

**增强阶段总成本**: ~$600-650/月（1000 对话/天）

---

## 十五、风险评估

### 15.1 技术风险
- **AI 回答不准确**: 通过 RAG 和提示词优化降低
- **响应时间过长**: 使用流式响应和缓存优化
- **成本超支**: 设置使用量限制和监控

### 15.2 业务风险
- **用户依赖 AI 而非人工**: 提供人工客服选项
- **AI 回答不当**: 内容审核和人工审核机制

---

## 十六、总结

这个 AI 客服系统将显著提升用户体验，通过 RAG 技术确保回答的准确性，使用流式响应提供实时交互体验。实施需要 6-8 周时间，每月运营成本约 $600-650（基于 1000 对话/天的假设）。

建议从 MVP（最小可行产品）开始，逐步迭代优化。

