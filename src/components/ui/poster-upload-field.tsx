"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export interface PosterUploadFieldProps {
  id: string
  label: string
  hint?: string
  /** URL for preview (blob URL or existing poster URL) */
  previewSrc: string | null
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClear: () => void
  disabled?: boolean
  accept?: string
  /** Show loading spinner next to input */
  isLoading?: boolean
  /** Optional: custom trigger (e.g. Label as button). If set, input is hidden and this triggers it. */
  trigger?: React.ReactNode
}

/**
 * Poster upload field with responsive layout:
 * - Small screen: vertical (controls on top, preview below)
 * - Large screen (sm+): horizontal (controls left, preview right)
 */
export function PosterUploadField({
  id,
  label,
  hint,
  previewSrc,
  onFileChange,
  onClear,
  disabled = false,
  accept = "image/jpeg,image/jpg,image/png,image/webp",
  isLoading = false,
  trigger,
}: PosterUploadFieldProps) {
  const showPreview = !!previewSrc
  const showClear = showPreview

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <div className="flex-1 min-w-0 space-y-2">
        <Label htmlFor={trigger ? undefined : id} className="text-sm">
          {label}
        </Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        <div className="flex flex-wrap items-center gap-2">
          {trigger ? (
            <>
              <Input
                id={id}
                type="file"
                accept={accept}
                onChange={onFileChange}
                disabled={disabled}
                className="hidden"
              />
              {trigger}
            </>
          ) : (
            <Input
              id={id}
              type="file"
              accept={accept}
              onChange={onFileChange}
              disabled={disabled}
              className="max-w-[240px] h-9 text-sm"
            />
          )}
          {showClear && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClear}
              disabled={disabled}
            >
              Clear
            </Button>
          )}
          {isLoading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
        </div>
      </div>
      {showPreview && (
        <div className="rounded-md border overflow-hidden bg-muted/30 w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0">
          <img
            src={previewSrc}
            alt="Poster preview"
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>
  )
}
