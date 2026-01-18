# 富文本编辑器安装指南

## 当前实现

项目使用 **TipTap** 作为富文本编辑器，已完全移除 react-quill 相关代码。

## 安装依赖

在项目根目录执行：

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-image @tiptap/extension-color
```

## 组件位置

- **组件文件：** `src/components/admin/RichTextEditor.tsx`
- **使用位置：** `src/app/admin/newsletter/templates/page.tsx`

## 功能特性

TipTap 编辑器支持以下功能：

- ✅ **文本格式：** 粗体、斜体、删除线
- ✅ **标题：** H1、H2、H3
- ✅ **列表：** 有序列表、无序列表
- ✅ **链接：** 插入和编辑链接
- ✅ **图片：** 插入图片（通过 URL）
- ✅ **撤销/重做：** 支持撤销和重做操作
- ✅ **自动回退：** 如果 TipTap 未安装，自动回退到 Textarea

## 自动回退机制

如果 TipTap 依赖未安装，`RichTextEditor` 组件会自动回退到普通的 `Textarea`，并显示安装提示。

## 测试

安装完成后，访问 `/admin/newsletter/templates` 页面，创建或编辑模板时应该能看到 TipTap 富文本编辑器。
