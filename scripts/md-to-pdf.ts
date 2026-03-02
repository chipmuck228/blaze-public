#!/usr/bin/env node

/**
 * Markdown to PDF 转换工具
 * 
 * 使用方法:
 *   npm run md-to-pdf <input.md> [output.pdf]
 *   npm run md-to-pdf -- --dir <directory> [--output <output-dir>]
 *   npm run md-to-pdf -- --pattern "PRD-*.md" [--output pdfs/]
 * 
 * 示例:
 *   npm run md-to-pdf PRD-01-项目概述与产品定位.md
 *   npm run md-to-pdf PRD-01-项目概述与产品定位.md output.pdf
 *   npm run md-to-pdf -- --dir . --pattern "PRD-*.md" --output pdfs/
 */

import { mdToPdf } from 'md-to-pdf'
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs'
import { join, dirname, basename, extname, resolve } from 'path'

interface Options {
  input?: string
  output?: string
  dir?: string
  pattern?: string
  outputDir?: string
  help?: boolean
}

// 解析命令行参数
function parseArgs(): Options {
  const args = process.argv.slice(2)
  const options: Options = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    
    if (arg === '--help' || arg === '-h') {
      options.help = true
    } else if (arg === '--dir' || arg === '-d') {
      options.dir = args[++i]
    } else if (arg === '--pattern' || arg === '-p') {
      options.pattern = args[++i]
    } else if (arg === '--output' || arg === '-o') {
      options.outputDir = args[++i]
    } else if (!options.input && !arg.startsWith('--')) {
      options.input = arg
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        options.output = args[++i]
      }
    }
  }

  return options
}

// 显示帮助信息
function showHelp() {
  console.log(`
Markdown to PDF 转换工具

使用方法:
  npm run md-to-pdf <input.md> [output.pdf]
  npm run md-to-pdf -- --dir <directory> [--output <output-dir>]
  npm run md-to-pdf -- --pattern "PRD-*.md" [--output pdfs/]

选项:
  <input.md>              输入 Markdown 文件路径
  [output.pdf]            输出 PDF 文件路径（可选，默认为输入文件名.pdf）
  --dir, -d <directory>    转换目录中的所有 .md 文件
  --pattern, -p <pattern> 文件匹配模式（如 "PRD-*.md"）
  --output, -o <dir>      输出目录（批量转换时使用）
  --help, -h              显示帮助信息

示例:
  # 转换单个文件
  npm run md-to-pdf PRD-01-项目概述与产品定位.md
  
  # 转换单个文件并指定输出
  npm run md-to-pdf PRD-01-项目概述与产品定位.md output.pdf
  
  # 转换目录中所有 PRD 文件（PRD 已归置到 docs/prd/）
  npm run md-to-pdf -- --dir docs/prd --pattern "PRD-*.md" --output pdfs/
  
  # 转换目录中所有 .md 文件
  npm run md-to-pdf -- --dir docs/prd --output pdfs/
`)
}

// 匹配文件名模式
function matchPattern(filename: string, pattern: string): boolean {
  // 简单的通配符匹配（支持 * 和 ?）
  const regex = new RegExp(
    '^' + pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.') + '$'
  )
  return regex.test(filename)
}

// 获取目录中的所有 .md 文件
function getMarkdownFiles(dir: string, pattern?: string): string[] {
  const files: string[] = []
  
  try {
    const entries = readdirSync(dir)
    
    for (const entry of entries) {
      const fullPath = join(dir, entry)
      const stat = statSync(fullPath)
      
      if (stat.isFile() && extname(entry) === '.md') {
        if (!pattern || matchPattern(entry, pattern)) {
          files.push(fullPath)
        }
      }
    }
  } catch (error: any) {
    console.error(`❌ 读取目录失败: ${error.message}`)
    process.exit(1)
  }
  
  return files.sort()
}

// 转换单个文件
async function convertFile(inputPath: string, outputPath?: string): Promise<void> {
  let tempStylePath: string | null = null
  
  try {
    // 检查输入文件是否存在
    if (!existsSync(inputPath)) {
      console.error(`❌ 文件不存在: ${inputPath}`)
      process.exit(1)
    }

    // 确定输出路径
    const finalOutputPath = outputPath || inputPath.replace(/\.md$/i, '.pdf')
    
    // 确保输出目录存在
    const outputDir = dirname(finalOutputPath)
    if (outputDir !== '.' && !existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true })
    }

    console.log(`📄 正在转换: ${basename(inputPath)} → ${basename(finalOutputPath)}`)

    // 读取 Markdown 文件
    const markdown = readFileSync(inputPath, 'utf-8')

    // 创建临时样式文件
    const styleContent = `
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
        line-height: 1.6;
        color: #333;
      }
      h1, h2, h3, h4, h5, h6 {
        color: #1a1a1a;
        margin-top: 1.5em;
        margin-bottom: 0.5em;
      }
      h1 {
        border-bottom: 2px solid #eaecef;
        padding-bottom: 0.3em;
      }
      h2 {
        border-bottom: 1px solid #eaecef;
        padding-bottom: 0.3em;
      }
      code {
        background-color: #f6f8fa;
        padding: 0.2em 0.4em;
        border-radius: 3px;
        font-size: 85%;
      }
      pre {
        background-color: #f6f8fa;
        padding: 1em;
        border-radius: 6px;
        overflow-x: auto;
      }
      table {
        border-collapse: collapse;
        width: 100%;
        margin: 1em 0;
      }
      th, td {
        border: 1px solid #dfe2e5;
        padding: 0.6em 1em;
        text-align: left;
      }
      th {
        background-color: #f6f8fa;
        font-weight: 600;
      }
      blockquote {
        border-left: 4px solid #dfe2e5;
        padding-left: 1em;
        color: #6a737d;
        margin: 1em 0;
      }
      a {
        color: #0366d6;
        text-decoration: none;
      }
      a:hover {
        text-decoration: underline;
      }
    `
    
    // 创建临时样式文件
    tempStylePath = join(dirname(finalOutputPath), `.temp-style-${Date.now()}.css`)
    writeFileSync(tempStylePath, styleContent)

    // 转换为 PDF
    const pdf = await mdToPdf(
      { content: markdown, path: inputPath },
      {
        dest: finalOutputPath,
        pdf_options: {
          format: 'A4',
          margin: {
            top: '20mm',
            right: '20mm',
            bottom: '20mm',
            left: '20mm',
          },
          printBackground: true,
        },
        stylesheet: tempStylePath ? [tempStylePath] : undefined,
      }
    )

    if (pdf) {
      writeFileSync(finalOutputPath, pdf.content)
      console.log(`✅ 转换成功: ${finalOutputPath}`)
    } else {
      console.error(`❌ 转换失败: ${inputPath}`)
      process.exit(1)
    }
  } catch (error: any) {
    console.error(`❌ 转换错误: ${error.message}`)
    if (error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  } finally {
    // 清理临时样式文件
    if (tempStylePath && existsSync(tempStylePath)) {
      try {
        unlinkSync(tempStylePath)
      } catch (e) {
        // 忽略删除错误
      }
    }
  }
}

// 批量转换
async function convertDirectory(dir: string, pattern?: string, outputDir?: string): Promise<void> {
  const files = getMarkdownFiles(dir, pattern)
  
  if (files.length === 0) {
    console.log(`⚠️  未找到匹配的 Markdown 文件`)
    if (pattern) {
      console.log(`   目录: ${dir}`)
      console.log(`   模式: ${pattern}`)
    }
    return
  }

  console.log(`📁 找到 ${files.length} 个文件，开始转换...\n`)

  // 创建输出目录
  if (outputDir && !existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  // 转换每个文件
  for (const file of files) {
    const filename = basename(file, '.md')
    const outputPath = outputDir 
      ? join(outputDir, `${filename}.pdf`)
      : file.replace(/\.md$/i, '.pdf')
    
    await convertFile(file, outputPath)
  }

  console.log(`\n✨ 批量转换完成！共转换 ${files.length} 个文件`)
  if (outputDir) {
    console.log(`📂 输出目录: ${outputDir}`)
  }
}

// 主函数
async function main() {
  const options = parseArgs()

  // 显示帮助
  if (options.help) {
    showHelp()
    return
  }

  // 批量转换模式
  if (options.dir) {
    const dir = resolve(options.dir)
    await convertDirectory(dir, options.pattern, options.outputDir)
    return
  }

  // 单个文件转换模式
  if (options.input) {
    const inputPath = resolve(options.input)
    await convertFile(inputPath, options.output)
    return
  }

  // 没有参数，显示帮助
  console.log('❌ 请提供输入文件或使用 --dir 选项\n')
  showHelp()
  process.exit(1)
}

// 运行主函数
main().catch((error) => {
  console.error('❌ 发生错误:', error)
  process.exit(1)
})

