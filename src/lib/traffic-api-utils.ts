/**
 * Traffic API 工具函数
 * 用于统一处理日期范围计算
 */

export interface DateRange {
  start: Date
  end: Date
  startStr: string
  endStr: string
}

/**
 * 从查询参数计算日期范围
 */
export function getDateRangeFromParams(
  period: string | null,
  startDateParam: string | null,
  endDateParam: string | null
): DateRange {
  let endDate = new Date()
  let startDate = new Date()

  // 如果提供了自定义日期范围，使用自定义日期
  if (startDateParam && endDateParam) {
    startDate = new Date(startDateParam)
    endDate = new Date(endDateParam)
    // 设置时间为当天的开始和结束
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(23, 59, 59, 999)
  } else {
    // 否则使用预设周期
    switch (period) {
      case 'last_7_days':
        startDate.setDate(endDate.getDate() - 7)
        break
      case 'last_30_days':
        startDate.setDate(endDate.getDate() - 30)
        break
      case 'last_90_days':
        startDate.setDate(endDate.getDate() - 90)
        break
      default:
        startDate.setDate(endDate.getDate() - 30)
    }
  }

  return {
    start: startDate,
    end: endDate,
    startStr: startDate.toISOString(),
    endStr: endDate.toISOString(),
  }
}
