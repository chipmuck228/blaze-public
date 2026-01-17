'use client'

import { useState } from 'react'
import { Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface DateRangePickerProps {
  value: {
    type: 'preset' | 'custom'
    preset?: 'last_7_days' | 'last_30_days' | 'last_90_days'
    startDate?: string
    endDate?: string
  }
  onChange: (value: {
    type: 'preset' | 'custom'
    preset?: 'last_7_days' | 'last_30_days' | 'last_90_days'
    startDate?: string
    endDate?: string
  }) => void
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [customStartDate, setCustomStartDate] = useState(value.startDate || '')
  const [customEndDate, setCustomEndDate] = useState(value.endDate || '')

  const handlePresetChange = (preset: string) => {
    if (preset === 'custom') {
      onChange({
        type: 'custom',
        startDate: customStartDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: customEndDate || new Date().toISOString().split('T')[0],
      })
    } else {
      onChange({
        type: 'preset',
        preset: preset as 'last_7_days' | 'last_30_days' | 'last_90_days',
      })
      setIsOpen(false)
    }
  }

  const handleCustomDateApply = () => {
    if (customStartDate && customEndDate) {
      if (new Date(customStartDate) > new Date(customEndDate)) {
        alert('Start date must be before end date')
        return
      }
      onChange({
        type: 'custom',
        startDate: customStartDate,
        endDate: customEndDate,
      })
      setIsOpen(false)
    }
  }

  const getDisplayText = () => {
    if (value.type === 'custom' && value.startDate && value.endDate) {
      const start = new Date(value.startDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
      const end = new Date(value.endDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      return `${start} - ${end}`
    }
    const presetLabels: Record<string, string> = {
      last_7_days: 'Last 7 Days',
      last_30_days: 'Last 30 Days',
      last_90_days: 'Last 90 Days',
    }
    return presetLabels[value.preset || 'last_30_days'] || 'Last 30 Days'
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-[280px] justify-start text-left font-normal',
            !value && 'text-muted-foreground'
          )}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {getDisplayText()}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Select Time Range</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Time Range</Label>
            <Select
              value={value.type === 'preset' ? value.preset : 'custom'}
              onValueChange={handlePresetChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                <SelectItem value="last_90_days">Last 90 Days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {value.type === 'custom' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  max={customEndDate || new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  min={customStartDate}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCustomDateApply}
                  className="flex-1"
                  size="sm"
                >
                  Apply
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
