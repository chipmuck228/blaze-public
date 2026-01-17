'use client'

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'

interface DevicesDonutChartProps {
  data: Array<{
    name: string
    visits: number
    percentage: number
  }>
}

// 为不同的设备类型设置不同颜色（不区分大小写）
const getDeviceColor = (deviceName: string, index: number): string => {
  const name = deviceName.toLowerCase().trim()
  
  if (name.includes('mobile')) {
    return '#3b82f6' // Blue
  }
  if (name.includes('desktop')) {
    return '#10b981' // Green
  }
  if (name.includes('tablet')) {
    return '#f59e0b' // Amber
  }
  
  // 默认颜色数组（确保每个设备都有不同颜色）
  const DEFAULT_COLORS = [
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Purple
  ]
  
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length]
}

export function DevicesDonutChart({ data }: DevicesDonutChartProps) {
  if (!data || data.length === 0) {
    return null
  }

  const total = data.reduce((sum, item) => sum + item.visits, 0)

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percentage }) => `${name}: ${percentage}%`}
          outerRadius={100}
          innerRadius={60}
          fill="hsl(var(--primary))"
          dataKey="visits"
          animationDuration={750}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={getDeviceColor(entry.name, index)}
            />
          ))}
        </Pie>
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
          formatter={(value: number) => [
            `${value.toLocaleString()} (${((value / total) * 100).toFixed(1)}%)`,
            'Visits',
          ]}
        />
        <Legend
          wrapperStyle={{
            paddingTop: '20px',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
