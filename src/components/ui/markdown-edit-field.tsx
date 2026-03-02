"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ReactMarkdown from "react-markdown"

export interface MarkdownEditFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  disabled?: boolean
  hint?: string
}

/**
 * Markdown 编辑字段：编辑 | 预览 双 Tab，存库为 Markdown 源码，Web 端可同源渲染。
 */
export function MarkdownEditField({
  id,
  label,
  value,
  onChange,
  placeholder = "Supports **Markdown**: headers, *italic*, lists, [links](url)",
  rows = 4,
  disabled = false,
  hint,
}: MarkdownEditFieldProps) {
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit")

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "edit" | "preview")} className="w-full">
        <TabsList className="grid w-full max-w-[200px] grid-cols-2 h-8">
          <TabsTrigger value="edit" className="text-xs">Edit</TabsTrigger>
          <TabsTrigger value="preview" className="text-xs">Preview</TabsTrigger>
        </TabsList>
        <TabsContent value="edit" className="mt-2">
          <Textarea
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            disabled={disabled}
            className="text-sm resize-y min-h-[80px] font-mono"
          />
        </TabsContent>
        <TabsContent value="preview" className="mt-2">
          <div className="rounded-md border bg-muted/30 p-3 min-h-[80px] text-sm max-w-none">
            {value.trim() ? (
              <ReactMarkdown
                components={{
                  h1: ({ children }) => <h1 className="text-lg font-semibold mt-2 mb-1 first:mt-0">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-base font-semibold mt-2 mb-1 first:mt-0">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-semibold mt-1.5 mb-0.5 first:mt-0">{children}</h3>,
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-0.5">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>,
                  li: ({ children }) => <li className="leading-snug">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                      {children}
                    </a>
                  ),
                }}
              >
                {value}
              </ReactMarkdown>
            ) : (
              <p className="text-muted-foreground italic">Nothing to preview.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
