# joeycatai-website — 重構規格書（Refactor Spec）

> 對照 Code Review 發現的 17 項問題，以頂尖工程實踐為標準，制定精確的修復規格。
> 原則：**架構邊界清晰、變更最小化、零冗餘**。

---

## 0. 設計原則

| 原則 | 說明 |
|------|------|
| 單一職責 | 每個 component/module 只做一件事 |
| DRY | icon、schema 生成、排序邏輯各只存在一處 |
| 安全預設 | SEO meta 必須有合理 fallback；不使用 `set:html` |
| 靜態優先 | 零外部 runtime 依賴（self-host fonts） |
| 平台感知 | Cloudflare Pages 的 `_headers` / trailing slash 要明確設定 |

---

## 1. SEO 層（`src/components/SEO.astro`）

### 1-A. 預設 OG Image

**現狀**：無 heroImage 時完全不輸出 `og:image`，社群分享無預覽圖。

**規格**：
- 在 `public/` 新增 `og-default.png`（1200×630, 帶品牌 logo + 名稱）
- `SEO.astro` 中，當 `image` 為空時 fallback 到 `/og-default.png`
- 對應設定預設的 `imageWidth=1200`、`imageHeight=630`、`imageType=image/png`

```diff
 // SEO.astro
-const ogImage = image && (image.startsWith('http') ? image : new URL(image, SITE.url));
+const fallbackImage = '/og-default.png';
+const resolvedImage = image || fallbackImage;
+const ogImage = resolvedImage.startsWith('http')
+  ? resolvedImage
+  : new URL(resolvedImage, SITE.url).toString();
+const ogWidth  = imageWidth  ?? 1200;
+const ogHeight = imageHeight ?? 630;
+const ogType   = imageType   ?? 'image/png';
```

### 1-B. Twitter Card 智慧降級

**現狀**：永遠 `summary_large_image`，無圖時顯示空白大框。

**規格**：
- 有自訂 image → `summary_large_image`
- 只有 fallback image 或無 image → `summary`

```diff
-<meta name="twitter:card" content="summary_large_image" />
+<meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
```

### 1-C. Props 介面精簡

移除不再需要的 `imageWidth`、`imageHeight`、`imageType` 外部傳入（改為內部計算 fallback），但保留 override 能力。不需更動呼叫端。

---

## 2. 結構化資料層（Schema.org）

### 2-A. Person Schema 加入 sameAs

**目標檔**：`src/site.config.ts` + `src/layouts/BaseLayout.astro`

**規格**：
- `site.config.ts` 新增 `socials` 陣列：

```ts
export const SITE = {
  // ... existing
  socials: [
    'https://github.com/joeycatai',
    'https://twitter.com/joeycatai',
    'https://linkedin.com/in/joeycatai',
  ],
};
```

- `BaseLayout.astro` 中的 `personSchema` 加入 `sameAs`:

```diff
 const personSchema = {
   '@context': 'https://schema.org',
   '@type': 'Person',
   name: SITE.author,
   url: SITE.url,
+  sameAs: SITE.socials,
 };
```

### 2-B. WebSite Schema 只在首頁輸出

**規格**：
- `BaseLayout.astro` 接收新 prop `isHome?: boolean`（預設 `false`）
- 只在 `isHome` 時注入 `websiteSchema`
- `personSchema` 同樣只在首頁注入
- `src/pages/index.astro` 傳入 `isHome`

```diff
 // BaseLayout.astro
-<script type="application/ld+json" set:html={JSON.stringify(websiteSchema)} />
-<script type="application/ld+json" set:html={JSON.stringify(personSchema)} />
+{isHome && <script type="application/ld+json" set:html={JSON.stringify(websiteSchema)} />}
+{isHome && <script type="application/ld+json" set:html={JSON.stringify(personSchema)} />}
```

### 2-C. Article Schema publisher 修正

**目標檔**：`src/layouts/BlogLayout.astro`

```diff
 const articleSchema = {
   // ...
   author: creator,
-  publisher: creator,
+  publisher: {
+    '@type': 'Organization',
+    name: SITE.name,
+    url: SITE.url,
+  },
 };
```

### 2-D. BreadcrumbList Schema

**目標檔**：`src/layouts/BlogLayout.astro`、`src/layouts/ProjectLayout.astro`

**規格**：
- 新增 helper `src/lib/breadcrumb.ts`：

```ts
export function buildBreadcrumb(
  items: Array<{ name: string; href: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.href,
    })),
  };
}
```

- BlogLayout 注入：`首頁 → 文章 → {title}`
- ProjectLayout 注入：`首頁 → 專案 → {title}`

---

## 3. Icon 系統（消除重複 SVG）

### 3-A. 新增 `src/components/icons/` 目錄

**規格**：
- 每個 icon 一個 Astro component，接收 `class` prop
- 新建以下檔案：

| 檔案 | 用途 |
|------|------|
| `IconGitHub.astro` | GitHub logo |
| `IconTwitter.astro` | X/Twitter logo |
| `IconLinkedIn.astro` | LinkedIn logo |
| `IconExternal.astro` | 外部連結箭頭 |
| `IconArrowLeft.astro` | 返回箭頭 |
| `IconRSS.astro` | RSS icon |
| `IconMenu.astro` | 漢堡選單 |
| `IconSun.astro` | 太陽（亮色模式） |
| `IconMoon.astro` | 月亮（深色模式） |
| `IconMail.astro` | Email |
| `IconChevron.astro` | 右箭頭 chevron |

**元件模板**（所有 icon 統一結構）：

```astro
---
interface Props { class?: string }
const { class: cls = 'w-5 h-5' } = Astro.props;
---
<svg xmlns="http://www.w3.org/2000/svg" class={cls} fill="currentColor" viewBox="0 0 24 24">
  <path d="..." />
</svg>
```

### 3-B. 消除 `set:html`

**影響檔案**：`Footer.astro`、`contact.astro`

**規格**：
- `Footer.astro`：`socials` 陣列改為引用 icon component，不再用字串 + `set:html`
- `contact.astro`：同上

改造後 Footer 結構：

```astro
---
import IconGitHub from './icons/IconGitHub.astro';
import IconTwitter from './icons/IconTwitter.astro';
import IconLinkedIn from './icons/IconLinkedIn.astro';

const socials = [
  { label: 'GitHub',      href: 'https://github.com/joeycatai',      Icon: IconGitHub },
  { label: 'Twitter / X', href: 'https://twitter.com/joeycatai',     Icon: IconTwitter },
  { label: 'LinkedIn',    href: 'https://linkedin.com/in/joeycatai', Icon: IconLinkedIn },
];
---
{socials.map(({ label, href, Icon }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} class="...">
    <Icon />
  </a>
))}
```

---

## 4. 字型載入策略

### 4-A. Self-host Google Fonts

**現狀**：3 個外部請求（preconnect × 2 + CSS），render-blocking。

**規格**：
- 安裝 `@fontsource-variable/inter` 和 `@fontsource/jetbrains-mono`
- 在 `src/styles/global.css` 中 import（Astro 會自動 bundle）
- 移除 `BaseLayout.astro` 中的 3 行 `<link>` 標籤
- 更新 `tailwind.config.mjs` 的 `fontFamily`，指向 local font-face

```diff
 // BaseLayout.astro <head>
-<link rel="preconnect" href="https://fonts.googleapis.com" />
-<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
-<link href="https://fonts.googleapis.com/css2?..." rel="stylesheet" />
```

```css
/* global.css 頂部 */
@import '@fontsource-variable/inter';
@import '@fontsource/jetbrains-mono/400.css';
@import '@fontsource/jetbrains-mono/500.css';
```

---

## 5. 平台設定（Cloudflare Pages）

### 5-A. Trailing Slash

**目標檔**：`astro.config.mjs`

```diff
 export default defineConfig({
   site: 'https://joeycatai.com',
+  trailingSlash: 'never',
   // ...
 });
```

### 5-B. `public/_headers`

新增檔案，Cloudflare Pages 會自動套用：

```
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/_astro/*
  Cache-Control: public, max-age=31536000, immutable
```

### 5-C. Favicon 完整集 + Web App Manifest

**新增檔案**：

| 路徑 | 說明 |
|------|------|
| `public/favicon-32x32.png` | 32×32 PNG favicon |
| `public/favicon-16x16.png` | 16×16 PNG favicon |
| `public/apple-touch-icon.png` | 180×180 iOS 書籤 |
| `public/og-default.png` | 1200×630 社群分享預設圖 |
| `public/site.webmanifest` | PWA manifest |

`BaseLayout.astro` `<head>` 新增：

```html
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
<link rel="manifest" href="/site.webmanifest" />
```

---

## 6. Content 工具層精簡（`src/lib/content.ts`）

### 6-A. 新增 featured-first 排序

**規格**：新增 `getProjectsSorted()` 供 projects 列表頁使用，包含 featured 優先邏輯。

```ts
export async function getProjectsSorted(): Promise<ProjectEntry[]> {
  const projects = await getCollection('projects');
  return [...projects].sort((a, b) => {
    if (a.data.featured !== b.data.featured) return a.data.featured ? -1 : 1;
    return b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
  });
}
```

`src/pages/projects/index.astro` 改用 `getProjectsSorted()` 取代手動 sort。

### 6-B. RSS 加入 categories

```diff
 items: posts.map((post) => ({
   title: post.data.title,
   description: post.data.description,
   pubDate: post.data.pubDate,
   link: `/blog/${post.id}`,
+  categories: post.data.tags,
 })),
```

---

## 7. Tailwind Config ESM 修正

**目標檔**：`tailwind.config.mjs`

```diff
+import typography from '@tailwindcss/typography';
+
 export default {
   // ...
-  plugins: [require('@tailwindcss/typography')],
+  plugins: [typography],
 };
```

---

## 8. 內容修正

**目標檔**：`src/content/blog/hello-world.mdx:25`

```diff
-Astro 4.x        → 靜態網站框架
+Astro 5.x        → 靜態網站框架
```

---

## 變更總覽

| # | 範圍 | 新增檔案 | 修改檔案 | 影響 |
|---|------|----------|----------|------|
| 1 | SEO 預設圖 + twitter card | `public/og-default.png` | `SEO.astro` | 社群曝光 |
| 2 | Schema.org | `src/lib/breadcrumb.ts` | `site.config.ts`, `BaseLayout.astro`, `BlogLayout.astro`, `ProjectLayout.astro`, `index.astro` | 搜尋曝光 |
| 3 | Icon 系統 | `src/components/icons/*.astro` (11 files) | `Nav.astro`, `Footer.astro`, `BlogLayout.astro`, `ProjectLayout.astro`, `ProjectCard.astro`, `contact.astro` | 程式碼品質 |
| 4 | 字型 self-host | — | `BaseLayout.astro`, `global.css`, `tailwind.config.mjs`, `package.json` | 效能 |
| 5 | 平台設定 | `public/_headers`, `public/site.webmanifest`, favicon 集 | `astro.config.mjs`, `BaseLayout.astro` | 安全 + SEO |
| 6 | Content 工具 | — | `content.ts`, `projects/index.astro`, `rss.xml.ts` | 程式碼品質 |
| 7 | Tailwind ESM | — | `tailwind.config.mjs` | 一致性 |
| 8 | 內容修正 | — | `hello-world.mdx` | 正確性 |

**新增檔案**：~16 個（11 icons + breadcrumb.ts + og-default.png + _headers + webmanifest + favicons）
**修改檔案**：~16 個
**刪除檔案**：0 個

---

## 不做的事

| 項目 | 原因 |
|------|------|
| View Transitions | 功能性變更，不屬於架構修正範圍，且需完整 QA |
| `rel="me"` 連結 | 依賴使用者是否使用 Mastodon/IndieWeb，列為 optional follow-up |
| description 長度驗證 | 屬於內容編輯規範而非程式碼強制 |
| 完整 CSP header | 需測試所有外部資源，列為後續 hardening 項目 |
