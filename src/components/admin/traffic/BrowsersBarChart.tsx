'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface BrowsersBarChartProps {
  data: Array<{
    name: string
    visits: number
    percentage: number
  }>
}

// 为不同的浏览器设置不同颜色（不区分大小写）
const getBrowserColor = (browserName: string, index: number): string => {
  const name = browserName.toLowerCase().trim()
  
  // 精确匹配
  if (name.includes('chrome') && name.includes('mobile')) {
    return '#4285f4' // Google Blue
  }
  if (name.includes('chrome') && !name.includes('mobile')) {
    return '#4285f4' // Google Blue
  }
  if (name.includes('safari') && name.includes('mobile')) {
    return '#007aff' // Apple Blue
  }
  if (name.includes('safari') && !name.includes('mobile')) {
    return '#007aff' // Apple Blue
  }
  if (name.includes('edge')) {
    return '#0078d4' // Microsoft Blue
  }
  if (name.includes('firefox')) {
    return '#ff7139' // Firefox Orange
  }
  if (name.includes('opera')) {
    return '#ff1b2d' // Opera Red
  }
  if (name.includes('brave')) {
    return '#fb542b' // Brave Orange
  }
  
  // 默认颜色数组（确保每个浏览器都有不同颜色）
  const DEFAULT_COLORS = [
    '#4285f4', // Blue
    '#007aff', // Apple Blue
    '#ff7139', // Orange
    '#0078d4', // Microsoft Blue
    '#8b5cf6', // Purple
    '#10b981', // Green
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#06b6d4', // Cyan
    '#ec4899', // Pink
  ]
  
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length]
}

export function BrowsersBarChart({ data }: BrowsersBarChartProps) {
  if (!data || data.length === 0) {
    return null
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
        <XAxis
          dataKey="name"
          stroke="hsl(var(--muted-foreground))"
          style={{ fontSize: '12px' }}
          tickLine={false}
        />
        <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} tickLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          }}
          labelStyle={{
            fontWeight: 600,
            marginBottom: '4px',
          }}
          formatter={(value: number, payload: any) => {
            const item = payload?.payload || payload
            const percentage = item?.percentage || 0
            return [`${value.toLocaleString()} (${percentage}%)`, 'Visits']
          }}
        />
        <Bar
          dataKey="visits"
          radius={[8, 8, 0, 0]}
          animationDuration={750}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={getBrowserColor(entry.name, index)}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
