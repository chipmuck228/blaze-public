import fs from "fs"
import { execSync } from "child_process"

const files = execSync('grep -rl "Record<string, unknown>)" src --include="*.ts" --include="*.tsx"', {
  encoding: "utf8",
})
  .trim()
  .split("\n")
  .filter(Boolean)

const patterns = [
  [/\.map\(\(([a-zA-Z_][a-zA-Z0-9_]*): Record<string, unknown>\)/g, ".map(($1)"],
  [/\.filter\(\(([a-zA-Z_][a-zA-Z0-9_]*): Record<string, unknown>\)/g, ".filter(($1)"],
  [/\.forEach\(\(([a-zA-Z_][a-zA-Z0-9_]*): Record<string, unknown>\)/g, ".forEach(($1)"],
  [/\.find\(\(([a-zA-Z_][a-zA-Z0-9_]*): Record<string, unknown>\)/g, ".find(($1)"],
  [/\.some\(\(([a-zA-Z_][a-zA-Z0-9_]*): Record<string, unknown>\)/g, ".some(($1)"],
  [/\.every\(\(([a-zA-Z_][a-zA-Z0-9_]*): Record<string, unknown>\)/g, ".every(($1)"],
]

let updated = 0
for (const file of files) {
  let content = fs.readFileSync(file, "utf8")
  const orig = content
  for (const [re, rep] of patterns) {
    content = content.replace(re, rep)
  }
  if (content !== orig) {
    fs.writeFileSync(file, content)
    updated++
  }
}
console.log(`Updated ${updated} files`)
