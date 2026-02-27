#!/usr/bin/env bash
# 删除当前分支上所有目录中的 .md、.sql 以及测试用 .sh 文件（从 Git 中移除）
# 使用前请确保在仓库根目录且已 checkout 到目标分支（如 beta-1）
# 用法: bash scripts/cleanup-branch-files.sh

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "=== 清理 .md / .sql / 测试用 .sh 文件（仓库: $REPO_ROOT）==="

# 排除的路径（不处理）
skip() {
  case "$1" in
    */.git/*|*/node_modules/*|*/.next/*|*/out/*|*/dist/*) return 0 ;;
    *) return 1 ;;
  esac
}

# 1. 删除所有 .md
echo ""
echo "[1/3] 删除 .md 文件..."
find . -type f -name "*.md" | while read -r f; do
  skip "$f" && continue
  git rm -f "$f" 2>/dev/null && echo "  已删除: $f" || true
done

# 2. 删除所有 .sql
echo ""
echo "[2/3] 删除 .sql 文件..."
find . -type f -name "*.sql" | while read -r f; do
  skip "$f" && continue
  git rm -f "$f" 2>/dev/null && echo "  已删除: $f" || true
done

# 3. 删除测试用 .sh（test-*.sh, check-*.sh 等）
echo ""
echo "[3/3] 删除测试用 .sh 文件..."
find . -type f -name "*.sh" | while read -r f; do
  skip "$f" && continue
  base=$(basename "$f")
  if [[ "$base" == test-* ]] || [[ "$base" == check-* ]] || [[ "$base" == *-test.sh ]]; then
    git rm -f "$f" 2>/dev/null && echo "  已删除: $f" || true
  fi
done

echo ""
echo "=== 清理完成。请执行: git status && git commit -m '...' && git push ==="
