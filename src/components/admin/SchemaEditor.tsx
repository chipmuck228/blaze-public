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
import { Plus, Trash2, Code, LayoutGrid, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const FIELD_TYPES = ['text', 'number', 'boolean', 'select', 'multiselect', 'array', 'date', 'time', 'object'] as const
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
        <div className="flex items-center justify-between gap-3 mb-3">
          {title && <span className="text-sm font-medium text-muted-foreground">{title}</span>}
          <TabsList className="h-9 rounded-lg bg-muted/60 p-0.5">
            <TabsTrigger value="visual" className="gap-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm px-3">
              <LayoutGrid className="h-4 w-4" />
              Visual
            </TabsTrigger>
            <TabsTrigger value="json" className="gap-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm px-3">
              <Code className="h-4 w-4" />
              JSON
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="visual" className="mt-3 space-y-3">
          <div className="rounded-lg border border-border/80 bg-muted/20 p-4" style={{ minHeight }}>
            {fieldEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                <p className="text-sm font-medium">No fields defined</p>
                <p className="text-xs mt-1">Add a field or switch to JSON to edit raw schema.</p>
                <Button type="button" variant="outline" size="sm" className="mt-4 rounded-lg gap-2 border-dashed" onClick={addField}>
                  <Plus className="h-4 w-4" />
                  Add field
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
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
                <Button type="button" variant="outline" size="sm" className="w-full gap-2 mt-2 rounded-lg border-dashed h-9" onClick={addField}>
                  <Plus className="h-4 w-4" />
                  Add field
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="json" className="mt-3">
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
  const [objectDefaultJson, setObjectDefaultJson] = useState('')
  const [objectPropertiesJson, setObjectPropertiesJson] = useState('')
  const type = (def.type as string) ?? 'text'
  const label = (def.label as string) ?? fieldKey
  const required = !!def.required
  const displayScope = (def.display_scope as string) ?? 'admin'

  useEffect(() => {
    if (type === 'object' && expanded) {
      setObjectDefaultJson(
        def.default !== undefined && def.default !== null && typeof def.default === 'object'
          ? JSON.stringify(def.default, null, 2)
          : ''
      )
      setObjectPropertiesJson(
        def.properties !== undefined && def.properties !== null && typeof def.properties === 'object'
          ? JSON.stringify(def.properties, null, 2)
          : '{}'
      )
    }
  }, [type, expanded, def.default, def.properties])

  const update = (partial: Record<string, unknown>) => {
    onUpdate({ def: { ...def, ...partial } })
  }

  return (
    <Card className="overflow-hidden rounded-lg border border-border/80 shadow-none">
      <CardHeader className="py-3 px-4 space-y-3">
        {/* Row 1: Move + Key + Type badge + Label */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center shrink-0">
            {onMoveUp && (
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground" onClick={onMoveUp} title="Move up">
                <ChevronUp className="h-4 w-4" />
              </Button>
            )}
            {onMoveDown && (
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground" onClick={onMoveDown} title="Move down">
                <ChevronDown className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Input
            value={fieldKey}
            onChange={(e) => {
              const v = e.target.value.replace(/[^a-z0-9_]/gi, '_')
              if (v && v !== fieldKey) onUpdate({ key: v })
            }}
            placeholder="field_key"
            className="font-mono text-sm h-8 w-[140px] shrink-0 rounded-md"
          />
          <Badge variant="secondary" className="font-mono text-xs shrink-0 rounded-md">
            {type}
          </Badge>
          <Input
            value={label}
            onChange={(e) => update({ label: e.target.value })}
            placeholder="Label"
            className="h-8 flex-1 min-w-[120px] rounded-md"
          />
        </div>
        {/* Row 2: Required, Type select, Scope select, Expand, Delete */}
        <div className="flex flex-wrap items-center gap-3 pl-[4.5rem]">
          <div className="flex items-center gap-1.5">
            <Checkbox
              id={`req-${fieldKey}`}
              checked={required}
              onCheckedChange={(c) => update({ required: c === true })}
              className="rounded"
            />
            <Label htmlFor={`req-${fieldKey}`} className="text-xs cursor-pointer text-muted-foreground">Required</Label>
          </div>
          <Select value={type} onValueChange={(v) => update({ type: v })}>
            <SelectTrigger className="w-[110px] h-8 rounded-md text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIELD_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={displayScope} onValueChange={(v) => update({ display_scope: v })}>
            <SelectTrigger className="w-[90px] h-8 rounded-md text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DISPLAY_SCOPES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex-1" />
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground" onClick={() => setExpanded(!expanded)} title={expanded ? 'Collapse' : 'More options'}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-md text-muted-foreground hover:text-destructive" onClick={onRemove} title="Remove field">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0 pb-4 px-4 border-t bg-muted/20 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
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
            {type === 'object' && (
              <>
                <div className="col-span-full space-y-1">
                  <Label className="text-xs">Default (JSON object)</Label>
                  <Textarea
                    value={objectDefaultJson}
                    onChange={(e) => {
                      const v = e.target.value
                      setObjectDefaultJson(v)
                      const t = v.trim()
                      if (!t) {
                        update({ default: undefined })
                        return
                      }
                      try {
                        const parsed = JSON.parse(t)
                        if (typeof parsed === 'object' && parsed !== null) update({ default: parsed })
                      } catch {
                        // allow invalid JSON while typing
                      }
                    }}
                    onBlur={() => {
                      const t = objectDefaultJson.trim()
                      if (!t) {
                        update({ default: undefined })
                        return
                      }
                      try {
                        const parsed = JSON.parse(t)
                        if (typeof parsed === 'object' && parsed !== null) {
                          update({ default: parsed })
                          setObjectDefaultJson(JSON.stringify(parsed, null, 2))
                        }
                      } catch {
                        if (def.default !== undefined && def.default !== null && typeof def.default === 'object') {
                          setObjectDefaultJson(JSON.stringify(def.default, null, 2))
                        }
                      }
                    }}
                    placeholder='{"key": "value"}'
                    className="font-mono text-xs min-h-[80px] resize-y"
                    rows={4}
                  />
                </div>
                <div className="col-span-full space-y-1">
                  <Label className="text-xs">Properties (JSON object of field defs)</Label>
                  <Textarea
                    value={objectPropertiesJson}
                    onChange={(e) => {
                      const v = e.target.value
                      setObjectPropertiesJson(v)
                      const t = v.trim()
                      if (!t) {
                        update({ properties: undefined })
                        return
                      }
                      try {
                        const parsed = JSON.parse(t)
                        if (typeof parsed === 'object' && parsed !== null) update({ properties: parsed })
                      } catch {
                        // allow invalid JSON while typing
                      }
                    }}
                    onBlur={() => {
                      const t = objectPropertiesJson.trim()
                      if (!t) {
                        update({ properties: {} })
                        setObjectPropertiesJson('{}')
                        return
                      }
                      try {
                        const parsed = JSON.parse(t)
                        if (typeof parsed === 'object' && parsed !== null) {
                          update({ properties: parsed })
                          setObjectPropertiesJson(JSON.stringify(parsed, null, 2))
                        }
                      } catch {
                        if (def.properties !== undefined && def.properties !== null && typeof def.properties === 'object') {
                          setObjectPropertiesJson(JSON.stringify(def.properties, null, 2))
                        }
                      }
                    }}
                    placeholder='{"propKey": {"type": "boolean", "label": "Label"}}'
                    className="font-mono text-xs min-h-[120px] resize-y"
                    rows={6}
                  />
                  <p className="text-[10px] text-muted-foreground">Nested field definitions, e.g. portal_config with is_course_type, show_meal_service, show_care_service.</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
