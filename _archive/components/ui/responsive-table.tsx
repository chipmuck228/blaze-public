/**
 * 响应式表格组件
 * 在小屏幕上显示为卡片列表，在大屏幕上显示为表格
 */

'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreVertical } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface ResponsiveTableColumn<T = any> {
  key: string
  label: string
  render?: (value: any, row: T) => React.ReactNode
  className?: string
  mobileLabel?: string // 移动端显示的标签（如果不同）
}

interface ResponsiveTableProps<T = any> {
  data: T[]
  columns: ResponsiveTableColumn<T>[]
  actions?: (row: T) => React.ReactNode
  emptyMessage?: string
  className?: string
}

export function ResponsiveTable<T extends Record<string, any>>({
  data,
  columns,
  actions,
  emptyMessage = "No data available",
  className,
}: ResponsiveTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <>
      {/* 移动端：卡片列表视图 */}
      <div className="block md:hidden space-y-4">
        {data.map((row, index) => (
          <Card key={index} className="overflow-hidden">
            <CardContent className="p-4 space-y-3">
              {columns.map((column) => {
                const value = row[column.key]
                const displayValue = column.render
                  ? column.render(value, row)
                  : value

                return (
                  <div key={column.key} className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {column.mobileLabel || column.label}
                    </span>
                    <span className="text-sm">{displayValue || "N/A"}</span>
                  </div>
                )
              })}
              {actions && (
                <div className="flex justify-end pt-2 border-t">
                  {actions(row)}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 桌面端：表格视图 */}
      <div className="hidden md:block overflow-x-auto">
        <Table className={className}>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={column.className}>
                  {column.label}
                </TableHead>
              ))}
              {actions && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow key={index}>
                {columns.map((column) => {
                  const value = row[column.key]
                  const displayValue = column.render
                    ? column.render(value, row)
                    : value

                  return (
                    <TableCell key={column.key} className={column.className}>
                      {displayValue || "N/A"}
                    </TableCell>
                  )
                })}
                {actions && (
                  <TableCell className="text-right">
                    {actions(row)}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}

