# CLAUDE.md — 給 AI 的專案導覽

這份文件讓 AI 協作者快速理解本專案，避免每次都要重新探索。

---

## 專案概述

**joeycatai.com** — JoeyCatAI 的個人網站，包含技術部落格與專案展示。

- 框架：Astro 5（靜態輸出）
- 樣式：Tailwind CSS v3 + Typography plugin
- 內容：MDX（Markdown + JSX）
- 部署：Cloudflare Pages
- 語言：主要繁體中文（zh-TW），schema 支援英文但尚未啟用

---

## 目錄結構

```
src/
├── components/         # UI 元件（Nav, Footer, SEO, BlogCard, ProjectCard…）
├── content/
│   ├── blog/          # 部落格文章（.mdx）← 新增文章放這裡
│   └── projects/      # 專案展示（.mdx）← 新增專案放這裡
├── layouts/
│   ├── BaseLayout.astro   # 所有頁面的根 layout
│   ├── BlogLayout.astro   # 文章頁 layout
│   └── ProjectLayout.astro
├── lib/
│   ├── content.ts     # 取得文章/專案的 helper functions
│   └── site.config.ts # 網站基本資訊（名稱、URL、作者）
├── pages/             # 路由（index, blog, projects, tags, rss, llms.txt）
└── styles/
    └── global.css     # Tailwind 指令 + 自訂 component class
public/
├── robots.txt
├── favicon.svg
└── og-default.svg     # 預設 OG 圖（注意：SVG 格式，見已知問題）
```

---

## 新增內容的方式

### 新增部落格文章

在 `src/content/blog/` 建立 `[slug].mdx`：

```mdx
---
title: '文章標題'
description: '一句話描述，也會出現在 SEO meta 和列表卡片'
pubDate: 2026-02-23
tags: ['標籤A', '標籤B']
lang: 'zh-TW'
draft: false
# 選填
updatedDate: 2026-02-24
heroImage: './cover.png'   # 放在同目錄，Astro 會優化
---

文章內容（支援 MDX，可用 JSX 元件）
```

**必填欄位**：`title`, `description`, `pubDate`
**預設值**：`tags: []`, `draft: false`, `lang: 'zh-TW'`
**`draft: true`** 時文章不會出現在列表和 sitemap

### 新增專案

在 `src/content/projects/` 建立 `[slug].mdx`：

```mdx
---
title: '專案名稱'
description: '一句話描述'
pubDate: 2026-02-23
tags: ['AI', 'Web']
status: 'active'        # active | completed | archived
featured: false         # true 會出現在首頁
# 選填
github: 'https://github.com/...'
demo: 'https://...'
heroImage: './cover.png'
---

專案說明內容
```

**必填欄位**：`title`, `description`, `pubDate`
**預設值**：`tags: []`, `featured: false`, `status: 'completed'`

---

## 核心設定檔

| 檔案 | 用途 |
|------|------|
| `src/lib/site.config.ts` | 網站名稱、URL、作者名、Twitter handle |
| `astro.config.mjs` | Astro 整合設定（sitemap、MDX、Tailwind）|
| `src/content.config.ts` | 內容 schema 定義（新增欄位在這裡加）|
| `tailwind.config.mjs` | 字型、accent 色系、Typography 設定 |
| `src/styles/global.css` | 全域樣式、自訂 class（.btn, .card, .tag）|

---

## 重要行為

- **Sitemap**：`@astrojs/sitemap` 自動產生，draft 文章不會出現
- **RSS**：`/rss.xml`，只含部落格（不含專案）
- **llms.txt**：`/llms.txt`，讓 AI 爬蟲讀取所有文章和專案列表
- **Tag 頁面**：設定 `noindex,follow`，不被搜尋引擎索引（正確做法）
- **Dark mode**：用 `localStorage` 儲存，inline script 防止 FOUC

---

## 不要動的東西

- `src/components/SEO.astro`：meta 邏輯已完整，動之前先理解整個 props 鏈
- `src/layouts/BaseLayout.astro` 的 dark mode inline script：順序很重要
- `public/robots.txt`：已設定允許所有爬蟲並指向 sitemap

---

## 已知問題

1. **OG 預設圖是 SVG**：Facebook、LinkedIn 不支援 SVG OG image，分享時可能無縮圖
2. **Google Fonts 從 CDN 載入**：有隱私疑慮（GDPR），考慮未來改為自託管
3. **多語言 schema 未完成**：`lang: 'en'` 選項存在但無 hreflang tag 實作
4. **無 CI/CD pipeline**：沒有 GitHub Actions 自動驗證

---

## 常用指令

```bash
npm run dev       # 本地開發 http://localhost:4321
npm run build     # 產出靜態檔案到 dist/
npm run verify    # type check + build（推送前建議執行）
npm run preview   # 預覽 build 結果
```
