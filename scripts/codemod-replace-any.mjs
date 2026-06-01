#!/usr/bin/env node
/**
 * Bulk-replace common `any` patterns under src/ for ESLint no-explicit-any cleanup.
 * Run: node scripts/codemod-replace-any.mjs
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src")

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (/\.(ts|tsx)$/.test(name)) out.push(p)
  }
  return out
}

const REPLACEMENTS = [
  [/\bcatch\s*\(\s*(\w+)\s*:\s*any\s*\)/g, "catch ($1: unknown)"],
  [/Record<string,\s*any>/g, "Record<string, unknown>"],
  [/:\s*any\[\]/g, ": unknown[]"],
  [/:\s*any\s*=/g, ": StringKeyRecord ="],
  [/:\s*any\s*\)/g, ": StringKeyRecord)"],
  [/\(e:\s*any\)/g, "(e: Record<string, unknown>)"],
  [/\(item:\s*any\)/g, "(item: Record<string, unknown>)"],
  [/\(inst:\s*any\)/g, "(inst: Record<string, unknown>)"],
  [/\(group:\s*any\)/g, "(group: Record<string, unknown>)"],
  [/\(p:\s*any\)/g, "(p: Record<string, unknown>)"],
  [/\(c:\s*any\)/g, "(c: Record<string, unknown>)"],
  [/Promise<any\[\]>/g, "Promise<Record<string, unknown>[]>"],
  [/Promise<any>/g, "Promise<Record<string, unknown> | null>"],
  [/Promise<any \| null>/g, "Promise<Record<string, unknown> | null>"],
  [/\?:\s*any\b/g, "?: unknown"],
  [/\(row as any\)/g, "(row as Record<string, unknown>)"],
  [/\((\w+) as any\)/g, "($1 as Record<string, unknown>)"],
]

const NEEDS_STRING_KEY = /StringKeyRecord/

let filesChanged = 0

for (const file of walk(root)) {
  let text = fs.readFileSync(file, "utf8")
  const original = text

  for (const [re, repl] of REPLACEMENTS) {
    text = text.replace(re, repl)
  }

  if (NEEDS_STRING_KEY.test(text) && !text.includes("StringKeyRecord")) {
    if (text.startsWith('"use client"') || text.startsWith("'use client'")) {
      text = text.replace(
        /^(["']use client["']\s*\n)/,
        `$1import type { StringKeyRecord } from "@/lib/typed-error"\n`
      )
    } else {
      const importMatch = text.match(/^import .+$/m)
      if (importMatch) {
        const idx = text.lastIndexOf(importMatch[0])
        const lineEnd = text.indexOf("\n", idx)
        text =
          text.slice(0, lineEnd + 1) +
          'import type { StringKeyRecord } from "@/lib/typed-error"\n' +
          text.slice(lineEnd + 1)
      }
    }
  }

  if (text !== original) {
    fs.writeFileSync(file, text)
    filesChanged++
  }
}

console.log(`Updated ${filesChanged} files under src/`)
