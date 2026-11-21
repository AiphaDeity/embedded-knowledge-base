# 嵌入式开发知识库

独立的 VitePress 静态站点。一级栏目为学习笔记、题库、项目经验、技术文档。网页栏目、目录和迁移后的笔记标题使用无序号名称。

## 本地运行

```powershell
npm ci
npm run dev
```

打开终端输出的地址。构建静态站点用 `npm run build`，产物在 `.vitepress/dist`。

## 内容维护

- `notes/` 按飞书已有主题组织。各专题可直接阅读迁入的正文，每篇文首保留飞书原文入口。
- `questions/` 收录老题库和随课练习的入口。独立题库平台继续维护题目和练习功能。
- `projects/` 按项目入口组织，文章按实际进度写明验证条件和结果。
- `reference/` 收录配置、流程、官方手册及接口参考。
- 可运行的示例通过链接跳转到现有的嵌入式代码模板库。

## 飞书内容

已迁入 108 篇飞书正文，包含图片、画板、内嵌工作表和附件。画板使用静态预览，思维导图和流程图可点击查看大图，也保留了可展开的源内容。本站另有 7 篇整理稿与清单。

## GitHub Pages

站点路径已配置为 `/embedded-knowledge-base/`。公开发布前审阅飞书正文、图片和附件的分享范围。在 GitHub 仓库的 Pages 设置中选择 GitHub Actions，使用 Actions 中的 `Deploy knowledge base to GitHub Pages` 手动部署 `main`。

