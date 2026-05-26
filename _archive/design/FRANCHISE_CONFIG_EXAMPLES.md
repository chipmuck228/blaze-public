# Franchise Configuration Examples

本文档提供 `branding_config` 和 `marketing_config` 的示例 JSON 配置。

## branding_config 示例

`branding_config` 用于存储品牌相关的配置，包括颜色、Logo、主题、Hero 区域、联系信息、社交媒体等。

### 完整示例

```json
{
  "branding": {
    "primaryColor": "#2563EB",
    "secondaryColor": "#1E40AF",
    "accentColor": "#3B82F6",
    "backgroundColor": "#FFFFFF",
    "textColor": "#1F2937",
    "logoUrl": "https://example.com/logo.png",
    "faviconUrl": "https://example.com/favicon.ico",
    "theme": "modern"
  },
  "hero": {
    "title": "Blaze Robotics Academy - San Jose",
    "subtitle": "Empowering the Next Generation of Innovators",
    "description": "Join us for hands-on robotics and coding programs designed for students of all ages.",
    "backgroundImage": "https://example.com/hero-bg.jpg",
    "ctaText": "Explore Programs",
    "ctaLink": "/programs"
  },
  "contact": {
    "email": "sanjose@blazerobotics.com",
    "phone": "+1 (408) 555-0123",
    "address": {
      "street": "123 Main Street",
      "city": "San Jose",
      "state": "CA",
      "zip": "95110",
      "country": "US"
    },
    "businessHours": {
      "monday": "9:00 AM - 6:00 PM",
      "tuesday": "9:00 AM - 6:00 PM",
      "wednesday": "9:00 AM - 6:00 PM",
      "thursday": "9:00 AM - 6:00 PM",
      "friday": "9:00 AM - 6:00 PM",
      "saturday": "10:00 AM - 4:00 PM",
      "sunday": "Closed"
    }
  },
  "social": {
    "facebook": "https://facebook.com/blazerobotics.sanjose",
    "instagram": "https://instagram.com/blazerobotics.sanjose",
    "twitter": "https://twitter.com/blazerobotics.sj",
    "youtube": "https://youtube.com/@blazerobotics.sanjose",
    "linkedin": "https://linkedin.com/company/blazerobotics-sanjose"
  },
  "highlights": {
    "programs": "Age-appropriate robotics, coding, and STEM programs designed for local students.",
    "schedule": "After-school and weekend offerings during the school year, plus camps during breaks.",
    "focus": "Hands-on learning, teamwork, and preparing students for real-world robotics challenges.",
    "achievements": "Our students have won multiple VEX Robotics competitions and coding challenges."
  },
  "features": {
    "smallClassSizes": true,
    "experiencedInstructors": true,
    "modernEquipment": true,
    "competitionTeams": true,
    "certificationPrograms": true
  }
}
```

### 简化示例（最小配置）

```json
{
  "branding": {
    "primaryColor": "#2563EB",
    "secondaryColor": "#1E40AF",
    "accentColor": "#3B82F6"
  },
  "hero": {
    "title": "Blaze Robotics Academy",
    "subtitle": "Empowering the Next Generation",
    "description": "Join us for hands-on robotics and coding programs."
  }
}
```

## marketing_config 示例

`marketing_config` 用于存储营销相关的配置，包括 SEO、Slogan、描述、促销信息等。

### 完整示例

```json
{
  "seo": {
    "title": "Blaze Robotics Academy - San Jose | Robotics Programs",
    "description": "Join Blaze Robotics Academy in San Jose for hands-on robotics and coding programs. Ages 8-18. After-school and weekend classes available.",
    "keywords": "robotics, coding, STEM, San Jose, VEX Robotics, programming, engineering, education",
    "ogImage": "https://example.com/og-image.jpg",
    "ogTitle": "Blaze Robotics Academy - San Jose",
    "ogDescription": "Hands-on robotics and coding programs for students in San Jose",
    "twitterCard": "summary_large_image",
    "canonicalUrl": "https://sanjose.blazerobotics.com"
  },
  "slogan": {
    "main": "Empowering the Next Generation of Innovators",
    "subtitle": "Hands-on Robotics & Coding Education",
    "tagline": "Building Tomorrow's Leaders, One Robot at a Time"
  },
  "descriptions": {
    "homepage": {
      "intro": "Welcome to Blaze Robotics Academy in San Jose! We offer comprehensive robotics and coding programs designed to inspire and educate students of all ages.",
      "mission": "Our mission is to provide high-quality STEM education through hands-on learning experiences.",
      "values": [
        "Innovation",
        "Excellence",
        "Teamwork",
        "Creativity"
      ]
    },
    "about": {
      "overview": "Blaze Robotics Academy has been serving the San Jose community since 2020, providing exceptional robotics and coding education.",
      "history": "Founded with a vision to make STEM education accessible and engaging for all students.",
      "team": "Our experienced instructors are passionate about robotics and dedicated to student success."
    },
    "programs": {
      "intro": "Explore our wide range of robotics and coding programs designed for different age groups and skill levels.",
      "benefits": [
        "Develop critical thinking skills",
        "Learn programming fundamentals",
        "Build and program robots",
        "Participate in competitions",
        "Earn certifications"
      ]
    }
  },
  "promotions": {
    "current": [
      {
        "id": "summer-2026",
        "title": "Summer Camp Registration Open",
        "description": "Register now for our exciting summer robotics camps! Early bird discount available.",
        "isActive": true,
        "startDate": "2026-01-01",
        "endDate": "2026-06-30",
        "discount": {
          "type": "percentage",
          "value": 10,
          "code": "SUMMER2026"
        },
        "ctaText": "Register Now",
        "ctaLink": "/programs?promo=summer-2026"
      },
      {
        "id": "new-student",
        "title": "New Student Special",
        "description": "First-time students get 20% off their first course!",
        "isActive": true,
        "discount": {
          "type": "percentage",
          "value": 20,
          "code": "NEWSTUDENT"
        }
      }
    ],
    "upcoming": [
      {
        "id": "fall-2026",
        "title": "Fall Semester Programs",
        "description": "Registration opens August 1st for fall semester programs.",
        "isActive": false,
        "startDate": "2026-08-01"
      }
    ]
  },
  "cta": {
    "primary": {
      "text": "Explore Programs",
      "link": "/programs",
      "style": "primary"
    },
    "secondary": {
      "text": "Contact Us",
      "link": "/contact",
      "style": "outline"
    }
  },
  "features": {
    "highlighted": [
      {
        "title": "Small Class Sizes",
        "description": "Maximum 15 students per class for personalized attention",
        "icon": "users"
      },
      {
        "title": "Experienced Instructors",
        "description": "Our team has years of experience in robotics and education",
        "icon": "graduation-cap"
      },
      {
        "title": "Modern Equipment",
        "description": "Latest VEX Robotics kits and programming tools",
        "icon": "wrench"
      },
      {
        "title": "Competition Teams",
        "description": "Join our VEX Robotics competition teams",
        "icon": "trophy"
      }
    ]
  },
  "testimonials": {
    "enabled": true,
    "displayCount": 3,
    "source": "internal"
  },
  "newsletter": {
    "enabled": true,
    "title": "Stay Updated",
    "description": "Subscribe to our newsletter for program updates and special offers",
    "placeholder": "Enter your email"
  }
}
```

### 简化示例（最小配置）

```json
{
  "seo": {
    "title": "Blaze Robotics Academy - San Jose",
    "description": "Join Blaze Robotics Academy for hands-on robotics and coding programs.",
    "keywords": "robotics, coding, STEM, San Jose"
  },
  "slogan": {
    "main": "Empowering the Next Generation of Innovators",
    "subtitle": "Hands-on Robotics & Coding Education"
  },
  "descriptions": {
    "homepage": {
      "intro": "Welcome to Blaze Robotics Academy in San Jose!"
    }
  }
}
```

## 字段说明

### branding_config 字段

| 字段 | 类型 | 说明 | 必填 |
|------|------|------|------|
| `branding.primaryColor` | string | 主色调（十六进制颜色） | 否 |
| `branding.secondaryColor` | string | 次要颜色 | 否 |
| `branding.accentColor` | string | 强调色 | 否 |
| `branding.logoUrl` | string | Logo URL | 否 |
| `hero.title` | string | Hero 区域标题 | 否 |
| `hero.subtitle` | string | Hero 区域副标题 | 否 |
| `hero.description` | string | Hero 区域描述 | 否 |
| `contact.email` | string | 联系邮箱 | 否 |
| `contact.phone` | string | 联系电话 | 否 |
| `contact.address` | object | 地址信息 | 否 |
| `contact.businessHours` | object | 营业时间 | 否 |
| `social.*` | string | 社交媒体链接 | 否 |
| `highlights.*` | string | 亮点描述 | 否 |

### marketing_config 字段

| 字段 | 类型 | 说明 | 必填 |
|------|------|------|------|
| `seo.title` | string | SEO 标题 | 否 |
| `seo.description` | string | SEO 描述 | 否 |
| `seo.keywords` | string | SEO 关键词 | 否 |
| `slogan.main` | string | 主标语 | 否 |
| `slogan.subtitle` | string | 副标语 | 否 |
| `descriptions.*` | object | 各种页面描述 | 否 |
| `promotions.current` | array | 当前促销活动 | 否 |
| `promotions.upcoming` | array | 即将到来的促销 | 否 |
| `cta.*` | object | 行动号召按钮 | 否 |
| `features.highlighted` | array | 特色功能列表 | 否 |

## 使用建议

1. **最小配置**：开始时可以使用简化示例，只包含必要的字段
2. **逐步扩展**：根据业务需求逐步添加更多配置项
3. **保持一致性**：确保所有 franchise 的配置结构保持一致
4. **验证 JSON**：在保存前确保 JSON 格式正确
5. **前端使用**：前端可以根据这些配置动态渲染页面内容

## 注意事项

- 所有字段都是可选的，可以根据需要选择使用
- JSON 格式必须有效，否则会导致保存失败
- URL 字段应该使用完整的 URL（包含协议）
- 颜色字段应该使用十六进制格式（如 `#2563EB`）
- 日期字段使用 ISO 8601 格式（如 `2026-01-01`）
