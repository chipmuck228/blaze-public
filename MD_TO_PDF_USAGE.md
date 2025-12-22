# Markdown to PDF 转换工具使用说明

## 简介

这是一个命令行工具，用于将 Markdown 文件转换为格式化的 PDF 文档。特别适用于将 PRD 文档转换为 PDF 格式。

## 安装

确保已安装所有依赖：

```bash
npm install
```

## 使用方法

### 1. 转换单个文件

```bash
# 基本用法（输出到同目录，文件名自动改为 .pdf）
npm run md-to-pdf PRD-01-项目概述与产品定位.md

# 指定输出文件
npm run md-to-pdf PRD-01-项目概述与产品定位.md output.pdf

# 使用相对路径
npm run md-to-pdf ./docs/README.md ./pdfs/README.pdf
```

### 2. 批量转换

```bash
# 转换当前目录中所有 PRD 文件到 pdfs/ 目录
npm run md-to-pdf -- --dir . --pattern "PRD-*.md" --output pdfs/

# 转换所有核心功能 PRD 文件（PRD-01 到 PRD-08）
npm run md-to-pdf -- --dir . --pattern "PRD-0[1-8]-*.md" --output pdfs/

# 转换当前目录中所有 .md 文件
npm run md-to-pdf -- --dir . --output pdfs/

# 转换指定目录中的所有 .md 文件
npm run md-to-pdf -- --dir ./docs --output ./pdfs
```

### 3. 查看帮助

```bash
npm run md-to-pdf -- --help
```

## 命令行选项

| 选项 | 简写 | 说明 | 示例 |
|------|------|------|------|
| `<input.md>` | - | 输入 Markdown 文件路径 | `PRD-01.md` |
| `[output.pdf]` | - | 输出 PDF 文件路径（可选） | `output.pdf` |
| `--dir` | `-d` | 转换目录中的所有 .md 文件 | `--dir .` |
| `--pattern` | `-p` | 文件匹配模式（支持 * 和 ? 通配符） | `--pattern "PRD-*.md"` |
| `--output` | `-o` | 输出目录（批量转换时使用） | `--output pdfs/` |
| `--help` | `-h` | 显示帮助信息 | `--help` |

## 输出格式

- **PDF 格式**: A4
- **页边距**: 20mm（上下左右）
- **字体**: 系统默认字体（支持中文）
- **样式**: 优化的 Markdown 样式，包括：
  - 标题样式（带下划线）
  - 代码块样式（带背景色）
  - 表格样式（带边框）
  - 引用样式（带左边框）
  - 链接样式（蓝色）

## 使用示例

### 示例 1: 转换单个 PRD 文件

```bash
npm run md-to-pdf PRD-01-项目概述与产品定位.md
```

输出: `PRD-01-项目概述与产品定位.pdf`

### 示例 2: 批量转换所有 PRD 文件

```bash
npm run md-to-pdf -- --dir . --pattern "PRD-*.md" --output pdfs/
```

这会转换所有匹配 `PRD-*.md` 的文件到 `pdfs/` 目录。

### 示例 3: 转换所有核心功能 PRD

```bash
npm run md-to-pdf -- --dir . --pattern "PRD-0[1-8]-*.md" --output pdfs/
```

这会转换 PRD-01 到 PRD-08 的所有文件。

### 示例 4: 转换所有 Markdown 文件

```bash
npm run md-to-pdf -- --dir . --output pdfs/
```

这会转换当前目录中所有 `.md` 文件。

## 注意事项

1. **依赖安装**: 确保已运行 `npm install` 安装所有依赖
2. **输出目录**: 输出目录会自动创建（如果不存在）
3. **文件覆盖**: 如果输出文件已存在，会被覆盖
4. **中文支持**: 完全支持中文文件名和内容
5. **临时文件**: 工具会创建临时 CSS 文件，转换完成后自动清理

## 故障排除

### 问题 1: 找不到模块 'md-to-pdf'

**解决方案**: 运行 `npm install` 安装依赖

### 问题 2: 转换失败

**可能原因**:
- Markdown 文件格式错误
- 文件路径不正确
- 权限问题

**解决方案**:
- 检查文件路径是否正确
- 检查文件是否有读取权限
- 检查输出目录是否有写入权限

### 问题 3: 中文显示乱码

**解决方案**: 确保系统已安装中文字体，工具会自动使用系统字体

## 技术细节

- **工具**: `md-to-pdf` (基于 Puppeteer)
- **运行环境**: Node.js + TypeScript
- **执行器**: `tsx` (TypeScript 执行器)

## 相关文件

- 脚本文件: `scripts/md-to-pdf.ts`
- 使用说明: `scripts/README.md`
- 本文档: `MD_TO_PDF_USAGE.md`

