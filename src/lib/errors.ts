/**
 * 错误消息处理工具函数
 * 用于将技术错误转换为用户友好的消息
 */

// 字段名称映射（中文）
const FIELD_NAMES_ZH: Record<string, string> = {
  franchise_id: 'Franchise',
  category_id: '课程分类',
  name: '程序名称',
  display_name: '显示名称',
  start_date: '开始日期',
  end_date: '结束日期',
  offering_id: '课程',
  series_id: '程序系列',
  location_id: '地点',
  // 添加更多字段映射...
}

// 字段名称映射（英文）
const FIELD_NAMES_EN: Record<string, string> = {
  franchise_id: 'Franchise',
  category_id: 'Category',
  name: 'Name',
  display_name: 'Display Name',
  start_date: 'Start Date',
  end_date: 'End Date',
  offering_id: 'Offering',
  series_id: 'Series',
  location_id: 'Location',
}

/**
 * 格式化字段名称
 */
export function formatFieldName(field: string, locale: 'zh' | 'en' = 'zh'): string {
  const fieldNames = locale === 'zh' ? FIELD_NAMES_ZH : FIELD_NAMES_EN
  return fieldNames[field] || field
}

/**
 * 格式化验证错误消息
 */
export function formatValidationError(
  missingFields: string[],
  locale: 'zh' | 'en' = 'zh'
): string {
  if (missingFields.length === 0) {
    return locale === 'zh' ? '验证失败' : 'Validation failed'
  }

  const fieldNames = missingFields.map(f => formatFieldName(f, locale))
  
  if (locale === 'zh') {
    if (missingFields.length === 1) {
      return `请填写必填字段：${fieldNames[0]}`
    }
    return `请填写以下必填字段：${fieldNames.join('、')}`
  } else {
    if (missingFields.length === 1) {
      return `Please fill in required field: ${fieldNames[0]}`
    }
    return `Please fill in required fields: ${fieldNames.join(', ')}`
  }
}

/**
 * 格式化数据库错误消息
 */
export function formatDatabaseError(error: any, locale: 'zh' | 'en' = 'zh'): string {
  if (!error) {
    return locale === 'zh' ? '数据库操作失败' : 'Database operation failed'
  }

  const errorMessage = error.message || String(error)
  
  // 处理常见的数据库错误
  if (errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint')) {
    if (errorMessage.includes('name')) {
      return locale === 'zh' 
        ? '程序名称已存在（不区分大小写），请使用不同的名称'
        : 'Program name already exists (case-insensitive), please use a different name'
    }
    return locale === 'zh'
      ? '数据已存在，请检查是否有重复记录'
      : 'Data already exists, please check for duplicate records'
  }

  if (errorMessage.includes('not null constraint') || errorMessage.includes('null value')) {
    const fieldMatch = errorMessage.match(/column "(\w+)"/i)
    if (fieldMatch) {
      const field = fieldMatch[1]
      const fieldName = formatFieldName(field, locale)
      return locale === 'zh'
        ? `${fieldName} 不能为空`
        : `${fieldName} cannot be empty`
    }
    return locale === 'zh'
      ? '必填字段不能为空'
      : 'Required fields cannot be empty'
  }

  if (errorMessage.includes('foreign key constraint')) {
    return locale === 'zh'
      ? '关联数据不存在，请检查关联的ID是否正确'
      : 'Related data does not exist, please check if the related ID is correct'
  }

  if (errorMessage.includes('check constraint')) {
    return locale === 'zh'
      ? '数据验证失败，请检查输入的数据是否符合要求'
      : 'Data validation failed, please check if the input data meets the requirements'
  }

  // 返回原始错误消息（如果无法识别）
  return errorMessage
}

/**
 * 格式化操作错误消息
 */
export function formatOperationError(
  operation: string,
  error: any,
  locale: 'zh' | 'en' = 'zh'
): string {
  const operationNames: Record<string, { zh: string; en: string }> = {
    create: { zh: '创建', en: 'Create' },
    update: { zh: '更新', en: 'Update' },
    delete: { zh: '删除', en: 'Delete' },
    fetch: { zh: '获取', en: 'Fetch' },
  }

  const operationName = operationNames[operation]?.[locale] || operation
  const errorMessage = formatDatabaseError(error, locale)

  return locale === 'zh'
    ? `${operationName}失败：${errorMessage}`
    : `${operationName} failed: ${errorMessage}`
}

/**
 * 创建标准化的错误响应
 */
export function createErrorResponse(
  error: any,
  statusCode: number = 400,
  locale: 'zh' | 'en' = 'zh'
): { error: string; details?: any } {
  // 如果是验证错误（包含 missingFields）
  if (error.missingFields && Array.isArray(error.missingFields)) {
    return {
      error: formatValidationError(error.missingFields, locale),
      details: {
        missingFields: error.missingFields,
        fieldNames: error.missingFields.map((f: string) => ({
          field: f,
          name: formatFieldName(f, locale),
        })),
      },
    }
  }

  // 如果是数据库错误
  if (error.message || error.code) {
    return {
      error: formatDatabaseError(error, locale),
      details: {
        code: error.code,
        message: error.message,
      },
    }
  }

  // 默认错误消息
  return {
    error: locale === 'zh' ? '操作失败' : 'Operation failed',
    details: error,
  }
}
