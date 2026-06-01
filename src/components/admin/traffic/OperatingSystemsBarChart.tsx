'use client'

import type { StringKeyRecord } from "@/lib/typed-error"
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

interface OperatingSystemsBarChartProps {
  data: Array<{
    name: string
    visits: number
    percentage: number
  }>
}

// 为不同的操作系统设置不同颜色（不区分大小写）
const getOSColor = (osName: string, index: number): string => {
  const name = osName.toLowerCase().trim()
  
  if (name.includes('ios')) {
    return '#007aff' // Apple Blue
  }
  if (name.includes('windows')) {
    return '#0078d4' // Microsoft Blue
  }
  if (name.includes('macos') || name.includes('mac os')) {
    return '#007aff' // Apple Blue
  }
  if (name.includes('android')) {
    return '#3ddc84' // Android Green
  }
  if (name.includes('linux')) {
    return '#fcc624' // Linux Yellow
  }
  if (name.includes('other')) {
    return '#8b5cf6' // Purple
  }
  
  // 默认颜色数组（确保每个操作系统都有不同颜色）
  const DEFAULT_COLORS = [
    '#007aff', // Apple Blue
    '#0078d4', // Microsoft Blue
    '#3ddc84', // Android Green
    '#fcc624', // Linux Yellow
    '#8b5cf6', // Purple
    '#ef4444', // Red
    '#10b981', // Green
  ]
  
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length]
}

export function OperatingSystemsBarChart({ data }: OperatingSystemsBarChartProps) {
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
          formatter={(value: number, _name: string, item) => {
            const row = (item?.payload ?? item) as { percentage?: number }
            const percentage = row?.percentage ?? 0
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
              fill={getOSColor(entry.name, index)}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
