'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface VisitsLineChartProps {
  data: Array<{
    date: string
    visits: number
    unique_visitors: number
    pageviews: number
  }>
}

export function VisitsLineChart({ data }: VisitsLineChartProps) {
  // 格式化日期显示
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const chartData = data.map((item) => ({
    ...item,
    dateFormatted: formatDate(item.date),
  }))

  if (!data || data.length === 0) {
    return null
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
        <XAxis
          dataKey="dateFormatted"
          stroke="hsl(var(--muted-foreground))"
          style={{ fontSize: '12px' }}
          tickLine={false}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          style={{ fontSize: '12px' }}
          tickLine={false}
        />
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
          formatter={(value: number) => [value.toLocaleString(), 'Visits']}
        />
        <Legend
          wrapperStyle={{
            paddingTop: '20px',
          }}
        />
        <Line
          type="monotone"
          dataKey="visits"
          stroke="#3b82f6"
          strokeWidth={2.5}
          dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: 'hsl(var(--card))' }}
          activeDot={{ r: 6, fill: '#3b82f6' }}
          name="Visits"
          animationDuration={750}
        />
        <Line
          type="monotone"
          dataKey="unique_visitors"
          stroke="#10b981"
          strokeWidth={2.5}
          dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: 'hsl(var(--card))' }}
          activeDot={{ r: 6, fill: '#10b981' }}
          name="Unique Visitors"
          animationDuration={750}
        />
        <Line
          type="monotone"
          dataKey="pageviews"
          stroke="#f59e0b"
          strokeWidth={2.5}
          dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: 'hsl(var(--card))' }}
          activeDot={{ r: 6, fill: '#f59e0b' }}
          name="Pageviews"
          animationDuration={750}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
