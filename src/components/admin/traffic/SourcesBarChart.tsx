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

interface SourcesBarChartProps {
  data: Array<{
    name: string
    visits: number
    percentage: number
  }>
}

// 为不同的来源类型设置不同颜色（不区分大小写）
const getSourceColor = (sourceName: string, index: number): string => {
  const name = sourceName.toLowerCase().trim()
  
  if (name.includes('direct')) {
    return '#3b82f6' // Blue
  }
  if (name.includes('google')) {
    return '#10b981' // Green
  }
  if (name.includes('bing')) {
    return '#f59e0b' // Amber
  }
  if (name.includes('social')) {
    return '#ef4444' // Red
  }
  if (name.includes('other')) {
    return '#8b5cf6' // Purple
  }
  
  // 默认颜色数组（确保每个来源都有不同颜色）
  const DEFAULT_COLORS = [
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#06b6d4', // Cyan
  ]
  
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length]
}

export function SourcesBarChart({ data }: SourcesBarChartProps) {
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
              fill={getSourceColor(entry.name, index)}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
