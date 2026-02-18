# joeycatai.com

個人網站，使用 [Astro 4](https://astro.build) 建置，部署於 [Cloudflare Pages](https://pages.cloudflare.com)。

## 技術棧

| 層次 | 技術 |
|------|------|
| 框架 | Astro 4.x（`output: 'static'`） |
| 樣式 | Tailwind CSS 3 + `@tailwindcss/typography` |
| 內容 | Astro Content Collections（MDX） |
| 語法高亮 | Shiki 雙主題（`github-light` / `github-dark`） |
| OG 圖片 | satori + @resvg/resvg-js（build-time 靜態生成） |
| 部署 | Cloudflare Pages |
| 分析 | Google Analytics 4（可選） |

## 專案結構

```
joeycatai-website/
├── public/
│   ├── _headers          # Cloudflare Pages 安全標頭 + Cache-Control
│   └── favicon.svg
│
├── src/
│   ├── site.config.ts    # ★ 全站設定（name / url / gaId …）
│   │
│   ├── content/
│   │   ├── config.ts     # Zod schema（blog + projects）
│   │   ├── blog/         # .mdx 文章
│   │   └── projects/     # .mdx 專案
│   │
│   ├── layouts/
│   │   ├── BaseLayout.astro    # HTML shell（SEO / GA4 / ViewTransitions）
│   │   ├── BlogLayout.astro    # 文章版面（閱讀時間 / 複製按鈕）
│   │   └── ProjectLayout.astro # 專案版面
│   │
│   ├── components/
│   │   ├── Nav.astro           # 頂部導覽（深色切換 / 手機選單）
│   │   ├── Footer.astro        # 頁尾
│   │   ├── SEO.astro           # <head> meta / OG / Twitter Card
│   │   ├── BlogCard.astro      # 文章列表卡片
│   │   ├── ProjectCard.astro   # 專案列表卡片
│   │   └── FormattedDate.astro # <time> 封裝（zh-TW 日期格式）
│   │
│   ├── pages/
│   │   ├── index.astro         # 首頁
│   │   ├── about.astro         # 關於我
│   │   ├── contact.astro       # 聯繫
│   │   ├── 404.astro           # 404 頁面
│   │   ├── blog/
│   │   │   ├── index.astro     # 文章列表（標籤篩選）
│   │   │   └── [...slug].astro # 文章詳情
│   │   ├── projects/
│   │   │   ├── index.astro     # 專案列表
│   │   │   └── [...slug].astro # 專案詳情
│   │   ├── tags/
│   │   │   ├── index.astro     # 全部標籤
│   │   │   └── [tag].astro     # 單一標籤頁
│   │   ├── og/
│   │   │   └── [...route].png.ts  # OG 圖片端點（build-time 靜態生成）
│   │   └── rss.xml.ts          # RSS Feed
│   │
│   ├── lib/
│   │   └── og.ts               # OG 圖片生成（satori + resvg-js）
│   │
│   ├── utils/
│   │   ├── content.ts          # getSortedPosts / getSortedProjects / getAllTags
│   │   └── date.ts             # formatDate / isoDate / getReadingTime
│   │
│   └── styles/
│       └── global.css          # Tailwind 入口 + Shiki 深色模式 + 複製按鈕
│
├── astro.config.mjs
├── tailwind.config.mjs
└── tsconfig.json
```

## 快速開始

```bash
# 安裝依賴
npm install

# 啟動開發伺服器（http://localhost:4321）
npm run dev

# 建置靜態檔案
npm run build

# 預覽建置結果
npm run preview
```

## 內容管理

### 新增文章

在 `src/content/blog/` 新增 `.mdx` 檔案：

```mdx
---
title: '文章標題'
description: '摘要說明'
pubDate: 2026-02-18
tags: ['Astro', 'TypeScript']
draft: false
---

內容...
```

| 欄位 | 型別 | 說明 |
|------|------|------|
| `title` | string（1–100） | 文章標題 |
| `description` | string（1–300） | 摘要 |
| `pubDate` | Date | 發布日期 |
| `updatedDate` | Date（可選） | 最後更新日期 |
| `heroImage` | string（可選） | 封面圖 URL |
| `tags` | string[]（可選） | 標籤列表 |
| `draft` | boolean | `true` 則不公開 |
| `lang` | `'zh-TW'` \| `'en'` | 語系（預設 `zh-TW`） |

### 新增專案

在 `src/content/projects/` 新增 `.mdx` 檔案，schema 可參考 `src/content/config.ts`。

## 設定

所有全站設定集中於 `src/site.config.ts`：

```typescript
export const SITE = {
  name: 'joeycatai',            // 站名
  url: 'https://joeycatai.com', // 正式網址（含 https://）
  description: '...',           // 站台描述
  author: 'joeycatai',          // 作者名
  twitterHandle: '@joeycatai',  // Twitter / X 帳號
  gaId: '',                     // GA4 Measurement ID（G-XXXXXXXXXX，留空停用）
};
```

### 啟用 Google Analytics 4

1. 至 [analytics.google.com](https://analytics.google.com) 建立資源
2. 複製 Measurement ID（格式：`G-XXXXXXXXXX`）
3. 填入 `src/site.config.ts` 的 `gaId` 欄位

## 部署（Cloudflare Pages）

Build 設定：
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Node.js version**: 20

`public/_headers` 已設定完整的 Content Security Policy、快取策略，部署後自動生效。

## 功能清單

- [x] 深色 / 淺色模式切換（localStorage 持久化）
- [x] 全站 SEO（Open Graph / Twitter Card / JSON-LD）
- [x] OG 圖片 build-time 自動生成（satori + CJK 字型）
- [x] MDX 文章與標籤系統
- [x] RSS Feed（`/rss.xml`）
- [x] Sitemap 自動生成
- [x] View Transitions 平滑頁面切換
- [x] 文章閱讀時間估算
- [x] 程式碼區塊一鍵複製
- [x] Cloudflare Pages 安全標頭（CSP / XFO / XCTO）
- [x] Google Analytics 4（條件載入）
- [x] 手機版響應式導覽選單
