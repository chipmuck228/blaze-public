'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Code, LayoutGrid, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const FIELD_TYPES = ['text', 'number', 'boolean', 'select', 'multiselect', 'array', 'date', 'time'] as const
const DISPLAY_SCOPES = ['admin', 'web', 'both'] as const

export type SchemaFields = Record<string, Record<string, unknown>>

function emptySchema(): { fields: SchemaFields } {
  return { fields: {} }
}

function parseSchema(value: string): { fields: SchemaFields } {
  if (!value?.trim()) return emptySchema()
  try {
    const parsed = JSON.parse(value) as { fields?: SchemaFields }
    return {
      fields: typeof parsed?.fields === 'object' && parsed.fields !== null ? parsed.fields : {},
    }
  } catch {
    return emptySchema()
  }
}

interface SchemaEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  title?: string
  className?: string
  minHeight?: string
}

export function SchemaEditor({
  value,
  onChange,
  placeholder = '{"fields": {}}',
  title,
  className,
  minHeight = '320px',
}: SchemaEditorProps) {
  const [mode, setMode] = useState<'visual' | 'json'>('visual')
  const [jsonInput, setJsonInput] = useState(value)
  const [jsonError, setJsonError] = useState<string | null>(null)

  const schema = parseSchema(value)
  const fieldEntries = Object.entries(schema.fields)

  const syncJsonToValue = useCallback(() => {
    if (!jsonInput?.trim()) {
      onChange('{}')
      setJsonError(null)
      return
    }
    try {
      JSON.parse(jsonInput)
      onChange(jsonInput)
      setJsonError(null)
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : 'Invalid JSON')
    }
  }, [jsonInput, onChange])

  useEffect(() => {
    setJsonInput(value)
  }, [value])

  const updateFields = useCallback(
    (fields: SchemaFields) => {
      onChange(JSON.stringify({ fields }, null, 2))
    },
    [onChange]
  )

  const addField = useCallback(() => {
    const key = `field_${Date.now()}`
    const next = { ...schema.fields, [key]: { type: 'text', label: key, required: false } }
    updateFields(next)
  }, [schema.fields, updateFields])

  const removeField = useCallback(
    (key: string) => {
      const next = { ...schema.fields }
      delete next[key]
      updateFields(next)
    },
    [schema.fields, updateFields]
  )

  const updateField = useCallback(
    (prevKey: string, updates: { key?: string; def?: Record<string, unknown> }) => {
      const next = { ...schema.fields }
      const currentDef = next[prevKey] as Record<string, unknown> | undefined
      const targetKey = updates.key !== undefined && updates.key !== prevKey ? updates.key : prevKey
      if (targetKey !== prevKey) {
        delete next[prevKey]
        next[targetKey] = { ...currentDef, ...(updates.def ?? {}), ...(updates.key ? { label: updates.key } : {}) }
      } else if (updates.def !== undefined) {
        next[targetKey] = { ...currentDef, ...updates.def }
      }
      updateFields(next)
    },
    [schema.fields, updateFields]
  )

  const moveField = useCallback(
    (key: string, direction: 'up' | 'down') => {
      const keys = Object.keys(schema.fields)
      const i = keys.indexOf(key)
      if (i === -1) return
      const j = direction === 'up' ? i - 1 : i + 1
      if (j < 0 || j >= keys.length) return
      const reordered: SchemaFields = {}
      const newOrder = [...keys]
      const tmp = newOrder[i]
      newOrder[i] = newOrder[j]
      newOrder[j] = tmp
      newOrder.forEach((k) => {
        reordered[k] = schema.fields[k]
      })
      updateFields(reordered)
    },
    [schema.fields, updateFields]
  )

  const handleSwitchToVisual = () => {
    try {
      if (jsonInput?.trim()) JSON.parse(jsonInput)
      setJsonError(null)
      onChange(jsonInput)
      setMode('visual')
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : 'Invalid JSON')
    }
  }

  return (
    <div className={cn('flex flex-col', className)}>
      <Tabs value={mode} onValueChange={(v) => (v === 'json' ? setMode('json') : handleSwitchToVisual())}>
        <div className="flex items-center justify-between gap-2 mb-2">
          {title && <span className="text-sm font-medium text-muted-foreground">{title}</span>}
          <TabsList className="h-9">
            <TabsTrigger value="visual" className="gap-1.5">
              <LayoutGrid className="h-4 w-4" />
              Visual
            </TabsTrigger>
            <TabsTrigger value="json" className="gap-1.5">
              <Code className="h-4 w-4" />
              JSON
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="visual" className="mt-2 space-y-2">
          <div className="rounded-md border bg-muted/30 p-3" style={{ minHeight }}>
            {fieldEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <p className="text-sm">No fields defined.</p>
                <p className="text-xs mt-1">Add a field or switch to JSON to edit raw schema.</p>
                <Button type="button" variant="outline" size="sm" className="mt-3 gap-1" onClick={addField}>
                  <Plus className="h-4 w-4" />
                  Add field
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {fieldEntries.map(([key, def], index) => (
                  <FieldCard
                    key={key}
                    fieldKey={key}
                    def={def as Record<string, unknown>}
                    onUpdate={(updates) => updateField(key, updates)}
                    onRemove={() => removeField(key)}
                    onMoveUp={index > 0 ? () => moveField(key, 'up') : undefined}
                    onMoveDown={index < fieldEntries.length - 1 ? () => moveField(key, 'down') : undefined}
                  />
                ))}
                <Button type="button" variant="outline" size="sm" className="w-full gap-1 mt-1" onClick={addField}>
                  <Plus className="h-4 w-4" />
                  Add field
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="json" className="mt-2">
          <div className="space-y-2">
            <Textarea
              value={jsonInput}
              onChange={(e) => {
                const v = e.target.value
                setJsonInput(v)
                if (!v?.trim()) {
                  onChange('{}')
                  setJsonError(null)
                  return
                }
                try {
                  JSON.parse(v)
                  onChange(v)
                  setJsonError(null)
                } catch (err) {
                  setJsonError(err instanceof Error ? err.message : 'Invalid JSON')
                }
              }}
              onBlur={syncJsonToValue}
              placeholder={placeholder}
              className={cn(
                'font-mono text-sm min-h-[200px] resize-y',
                jsonError && 'border-destructive focus-visible:ring-destructive/20'
              )}
              style={{ minHeight }}
            />
            {jsonError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{jsonError}</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Edit JSON directly. Blur or switch to Visual to apply. Valid schema: <code className="rounded bg-muted px-1">&#123; &quot;fields&quot;: &#123; ... &#125; &#125;</code>
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function FieldCard({
  fieldKey,
  def,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  fieldKey: string
  def: Record<string, unknown>
  onUpdate: (updates: { key?: string; def?: Record<string, unknown> }) => void
  onRemove: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const type = (def.type as string) ?? 'text'
  const label = (def.label as string) ?? fieldKey
  const required = !!def.required
  const displayScope = (def.display_scope as string) ?? 'admin'

  const update = (partial: Record<string, unknown>) => {
    onUpdate({ def: { ...def, ...partial } })
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-3 px-4 flex flex-row items-center gap-2">
        <div className="flex items-center gap-1 shrink-0">
          {onMoveUp && (
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveUp}>
              ↑
            </Button>
          )}
          {onMoveDown && (
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveDown}>
              ↓
            </Button>
          )}
        </div>
        <div className="flex-1 grid grid-cols-[1fr,auto,1fr] gap-2 items-center min-w-0">
          <Input
            value={fieldKey}
            onChange={(e) => {
              const v = e.target.value.replace(/[^a-z0-9_]/gi, '_')
              if (v && v !== fieldKey) onUpdate({ key: v })
            }}
            placeholder="field_key"
            className="font-mono text-sm h-8"
          />
          <Badge variant="secondary" className="font-mono text-xs shrink-0">
            {type}
          </Badge>
          <Input
            value={label}
            onChange={(e) => update({ label: e.target.value })}
            placeholder="Label"
            className="h-8"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1">
            <Checkbox
              id={`req-${fieldKey}`}
              checked={required}
              onCheckedChange={(c) => update({ required: c === true })}
            />
            <Label htmlFor={`req-${fieldKey}`} className="text-xs cursor-pointer">Required</Label>
          </div>
          <Select value={type} onValueChange={(v) => update({ type: v })}>
            <SelectTrigger className="w-[100px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIELD_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={displayScope} onValueChange={(v) => update({ display_scope: v })}>
            <SelectTrigger className="w-[90px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DISPLAY_SCOPES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setExpanded(!expanded)}>
            {expanded ? '−' : '+'}
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0 pb-3 px-4 border-t space-y-3">
          <div className="grid grid-cols-2 gap-3 pt-3">
            <div className="space-y-1">
              <Label className="text-xs">Placeholder</Label>
              <Input
                value={(def.placeholder as string) ?? ''}
                onChange={(e) => update({ placeholder: e.target.value || undefined })}
                placeholder="Optional"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Input
                value={(def.description as string) ?? ''}
                onChange={(e) => update({ description: e.target.value || undefined })}
                placeholder="Optional"
                className="h-8 text-sm"
              />
            </div>
            {(type === 'number' || type === 'text') && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">Default</Label>
                  <Input
                    value={def.default !== undefined && def.default !== null ? String(def.default) : ''}
                    onChange={(e) => {
                      const v = e.target.value
                      if (type === 'number') update({ default: v === '' ? undefined : Number(v) })
                      else update({ default: v === '' ? undefined : v })
                    }}
                    placeholder="Optional"
                    className="h-8 text-sm"
                    type={type === 'number' ? 'number' : 'text'}
                  />
                </div>
                {type === 'number' && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">Min</Label>
                      <Input
                        type="number"
                        value={(def.min as number) ?? ''}
                        onChange={(e) => update({ min: e.target.value === '' ? undefined : Number(e.target.value) })}
                        placeholder="—"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Max</Label>
                      <Input
                        type="number"
                        value={(def.max as number) ?? ''}
                        onChange={(e) => update({ max: e.target.value === '' ? undefined : Number(e.target.value) })}
                        placeholder="—"
                        className="h-8 text-sm"
                      />
                    </div>
                  </>
                )}
              </>
            )}
            {(type === 'select' || type === 'multiselect') && (
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Options (comma-separated)</Label>
                <Input
                  value={Array.isArray(def.options) ? (def.options as string[]).join(', ') : ''}
                  onChange={(e) => {
                    const arr = e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                    update({ options: arr })
                  }}
                  placeholder="a, b, c"
                  className="h-8 text-sm"
                />
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
