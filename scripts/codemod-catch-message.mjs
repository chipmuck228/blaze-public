#!/usr/bin/env node
/**
 * Replace `.message` access on common catch variable names with getErrorMessage().
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src")
const VARS = ["error", "err", "e", "stripeError"]

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (/\.(ts|tsx)$/.test(name)) out.push(p)
  }
  return out
}

let filesChanged = 0

for (const file of walk(root)) {
  let text = fs.readFileSync(file, "utf8")
  const original = text

  for (const v of VARS) {
    text = text.replace(new RegExp(`\\b${v}\\.message\\b`, "g"), `getErrorMessage(${v})`)
  }

  if (text.includes("getErrorMessage(") && !text.includes("getErrorMessage")) {
    // noop
  }

  if (text.includes("getErrorMessage(") && !/from ["']@\/lib\/typed-error["']/.test(text)) {
    const importLine = 'import { getErrorMessage } from "@/lib/typed-error"\n'
    if (text.startsWith('"use client"') || text.startsWith("'use client'")) {
      text = text.replace(/^(["']use client["']\s*\n)/, `$1${importLine}`)
    } else {
      const m = text.match(/^import .+$/m)
      if (m) {
        const idx = text.lastIndexOf(m[0])
        const lineEnd = text.indexOf("\n", idx)
        text = text.slice(0, lineEnd + 1) + importLine + text.slice(lineEnd + 1)
      } else {
        text = importLine + text
      }
    }
  }

  if (text !== original) {
    fs.writeFileSync(file, text)
    filesChanged++
  }
}

console.log(`Updated ${filesChanged} files`)
