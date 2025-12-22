# 脚本工具说明

## Markdown to PDF 转换工具

### 安装依赖

```bash
npm install
```

### 使用方法

#### 1. 转换单个文件

```bash
# 基本用法（输出到同目录，文件名自动改为 .pdf）
npm run md-to-pdf PRD-01-项目概述与产品定位.md

# 指定输出文件
npm run md-to-pdf PRD-01-项目概述与产品定位.md output.pdf

# 使用绝对路径
npm run md-to-pdf /path/to/file.md /path/to/output.pdf
```

#### 2. 批量转换

```bash
# 转换当前目录中所有 PRD 文件到 pdfs/ 目录
npm run md-to-pdf -- --dir . --pattern "PRD-*.md" --output pdfs/

# 转换当前目录中所有 .md 文件
npm run md-to-pdf -- --dir . --output pdfs/

# 转换指定目录中的所有 .md 文件
npm run md-to-pdf -- --dir ./docs --output ./pdfs
```

#### 3. 查看帮助

```bash
npm run md-to-pdf -- --help
```

### 选项说明

- `<input.md>` - 输入 Markdown 文件路径
- `[output.pdf]` - 输出 PDF 文件路径（可选）
- `--dir, -d <directory>` - 转换目录中的所有 .md 文件
- `--pattern, -p <pattern>` - 文件匹配模式（支持 * 和 ? 通配符）
- `--output, -o <dir>` - 输出目录（批量转换时使用）
- `--help, -h` - 显示帮助信息

### 示例

```bash
# 转换单个 PRD 文件
npm run md-to-pdf PRD-01-项目概述与产品定位.md

# 转换所有 PRD 文件到 pdfs 目录
npm run md-to-pdf -- --dir . --pattern "PRD-*.md" --output pdfs/

# 转换所有核心功能 PRD 文件
npm run md-to-pdf -- --dir . --pattern "PRD-0[1-8]-*.md" --output pdfs/

# 转换所有 Markdown 文件
npm run md-to-pdf -- --dir . --output pdfs/
```

### 输出格式

- PDF 格式：A4
- 页边距：20mm（上下左右）
- 字体：系统默认字体（支持中文）
- 样式：优化的 Markdown 样式，包括代码块、表格、引用等

### 注意事项

1. 确保已安装所有依赖：`npm install`
2. 输出目录会自动创建（如果不存在）
3. 如果输出文件已存在，会被覆盖
4. 支持中文文件名和内容

