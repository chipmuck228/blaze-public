/**
 * Traffic 数据导出工具函数
 */

export interface ExportData {
  summary?: {
    visits: number
    bounce_rate: number
    unique_visitors: number
    pageviews: number
  }
  visitsChart?: Array<{
    date: string
    visits: number
    unique_visitors: number
    pageviews: number
  }>
  sources?: Array<{
    name: string
    visits: number
    percentage: number
  }>
  devices?: Array<{
    name: string
    visits: number
    percentage: number
  }>
  browsers?: Array<{
    name: string
    visits: number
    percentage: number
  }>
  operatingSystems?: Array<{
    name: string
    visits: number
    percentage: number
  }>
  geography?: Array<{
    name: string
    visits: number
    percentage: number
  }>
  keywords?: Array<{
    query: string
    clicks: number
    impressions: number
    ctr: number
    position: number
  }>
}

/**
 * 导出为 CSV 格式
 */
export function exportToCSV(data: ExportData, filename: string = 'traffic-data') {
  const csvRows: string[] = []

  // 添加摘要数据
  if (data.summary) {
    csvRows.push('Summary')
    csvRows.push('Metric,Value')
    csvRows.push(`Visits,${data.summary.visits}`)
    csvRows.push(`Bounce Rate,${data.summary.bounce_rate.toFixed(2)}%`)
    csvRows.push(`Unique Visitors,${data.summary.unique_visitors}`)
    csvRows.push(`Pageviews,${data.summary.pageviews}`)
    csvRows.push('')
  }

  // 添加访问趋势数据
  if (data.visitsChart && data.visitsChart.length > 0) {
    csvRows.push('Visits Over Time')
    csvRows.push('Date,Visits,Unique Visitors,Pageviews')
    data.visitsChart.forEach((row) => {
      csvRows.push(`${row.date},${row.visits},${row.unique_visitors},${row.pageviews}`)
    })
    csvRows.push('')
  }

  // 添加来源数据
  if (data.sources && data.sources.length > 0) {
    csvRows.push('Traffic Sources')
    csvRows.push('Source,Visits,Percentage')
    data.sources.forEach((row) => {
      csvRows.push(`${row.name},${row.visits},${row.percentage}%`)
    })
    csvRows.push('')
  }

  // 添加设备数据
  if (data.devices && data.devices.length > 0) {
    csvRows.push('Devices')
    csvRows.push('Device,Visits,Percentage')
    data.devices.forEach((row) => {
      csvRows.push(`${row.name},${row.visits},${row.percentage}%`)
    })
    csvRows.push('')
  }

  // 添加浏览器数据
  if (data.browsers && data.browsers.length > 0) {
    csvRows.push('Browsers')
    csvRows.push('Browser,Visits,Percentage')
    data.browsers.forEach((row) => {
      csvRows.push(`${row.name},${row.visits},${row.percentage}%`)
    })
    csvRows.push('')
  }

  // 添加操作系统数据
  if (data.operatingSystems && data.operatingSystems.length > 0) {
    csvRows.push('Operating Systems')
    csvRows.push('OS,Visits,Percentage')
    data.operatingSystems.forEach((row) => {
      csvRows.push(`${row.name},${row.visits},${row.percentage}%`)
    })
    csvRows.push('')
  }

  if (data.geography && data.geography.length > 0) {
    csvRows.push('Geography')
    csvRows.push('Country,Visits,Percentage')
    data.geography.forEach((row) => {
      csvRows.push(`${row.name},${row.visits},${row.percentage}%`)
    })
    csvRows.push('')
  }

  if (data.keywords && data.keywords.length > 0) {
    csvRows.push('Search Keywords (GSC)')
    csvRows.push('Query,Clicks,Impressions,CTR,Position')
    data.keywords.forEach((row) => {
      csvRows.push(
        `"${row.query.replace(/"/g, '""')}",${row.clicks},${row.impressions},${row.ctr}%,${row.position}`
      )
    })
  }

  // 创建 CSV 内容
  const csvContent = csvRows.join('\n')

  // 创建 Blob 并下载
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
