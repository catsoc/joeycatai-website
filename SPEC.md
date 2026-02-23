# joeycatai-website — 修復規格書

> 基於 Code Review 發現的問題，依優先度分組。
> 原則：**維持現有功能、縮小改動範圍、消除重複、明確功能邊界**。

---

## 現狀快照

| 檔案 | 問題 |
|------|------|
| `lib/content.ts` + `pages/tags/*` + `layouts/BlogLayout.astro` | Tag URL 未正規化，含空白/特殊字元會產生不安全路徑；display name 丟失 |
| `tailwind.config.mjs:36` | `require()` 在 ESM 模組中 |
| `Footer.astro:4–19` | GitHub/Twitter/LinkedIn SVG 字串 + `set:html` |
| `contact.astro:4–23` | 同一批 SVG 字串重複一次 + `set:html` |
| `site.config.ts` + `Footer.astro` + `contact.astro` | 社群資料分散重複，容易漂移 |
| `BaseLayout.astro` + `components/SEO.astro` | `lang` 未傳入 SEO，`og:locale` 寫死 `zh_TW` |
| `lib/content.ts` + `pages/projects/index.astro` | 專案排序邏輯分散（featured 邏輯只在頁面） |
| `components/SEO.astro:35,51` | 無 heroImage 時完全不輸出 `og:image` |
| `public/` | 缺少 `_headers`（安全標頭） |
| `astro.config.mjs` | 缺少 `trailingSlash` 設定 |
| `content/blog/hello-world.mdx:25` | 寫 `Astro 4.x`，實際版本為 5.x |

---

## 修復項目

---

### FIX-1｜Tag URL 正規化

**優先度：HIGH**
**新增檔案：** `src/lib/tags.ts`
**影響檔案：** `src/lib/content.ts`、`src/pages/tags/[tag].astro`、`src/pages/tags/index.astro`、`src/layouts/BlogLayout.astro`、`src/pages/blog/index.astro`

**問題：**
- `joeycatai-website.mdx` 的 tags 含 `Tailwind CSS`（有空白）
- `getTagBuckets()` 做 `tag.toLowerCase()` → key = `tailwind css`
- `tags/index.astro` 產生 `href="/tags/tailwind css"` → 瀏覽器顯示 `/tags/tailwind%20css`
- `[tag].astro` 的 `getStaticPaths` 產生 `params: { tag: 'tailwind css' }` → Astro 建立含空白的目錄名
- 若未來出現 `C++`、`Node.js`、`C#` 等 tag，問題會擴大
- `getTagIndex()` 回傳 lowercase key，tags 頁面顯示 `tailwind css` 而非原始 `Tailwind CSS`

**規格：**

1. 新增 `src/lib/tags.ts`：

```ts
/** 將 tag 轉為 URL-safe slug：小寫、空白轉 -、去除不安全字元 */
export function toTagSlug(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')       // 空白 → -
    .replace(/[^\w\u4e00-\u9fff\u3400-\u4dbf-]/g, '') // 保留英數、CJK、-
    .replace(/-+/g, '-')        // 連續 - 合併
    .replace(/^-|-$/g, '');     // 去掉頭尾 -
}

/**
 * 從所有內容建立 tag 映射表
 * key = slug, value = { display: 原始名稱, count: 出現次數 }
 */
export type TagInfo = { display: string; count: number };

export function buildTagMap(
  entries: Array<{ data: { tags: string[] } }>
): Map<string, TagInfo> {
  const map = new Map<string, TagInfo>();
  for (const entry of entries) {
    for (const tag of entry.data.tags) {
      const slug = toTagSlug(tag);
      const existing = map.get(slug);
      if (existing) {
        existing.count++;
      } else {
        map.set(slug, { display: tag, count: 1 });
      }
    }
  }
  return map;
}
```

2. 修改 `src/lib/content.ts` — `getTagIndex` 改為回傳 slug + display name：

```ts
import { toTagSlug, buildTagMap } from './tags';

export async function getTagIndex(): Promise<Array<{ slug: string; display: string; count: number }>> {
  const [posts, projects] = await Promise.all([getPublishedPosts(), getProjects()]);
  const tagMap = buildTagMap([...posts, ...projects]);
  return [...tagMap.entries()]
    .map(([slug, info]) => ({ slug, display: info.display, count: info.count }))
    .sort((a, b) => b.count - a.count);
}
```

`hasTag` 也改用 slug 比對：

```ts
const hasTag = (item: TaggedEntry, targetSlug: string) =>
  item.data.tags.some((tag) => toTagSlug(tag) === targetSlug);
```

`getItemsByTag` 參數改為接受 slug：

```ts
export async function getItemsByTag(
  slug: string
): Promise<{ posts: BlogEntry[]; projects: ProjectEntry[] }> {
  const [posts, projects] = await Promise.all([getPublishedPosts(), getProjects()]);
  return {
    posts: posts.filter((post) => hasTag(post, slug)),
    projects: projects.filter((project) => hasTag(project, slug)),
  };
}
```

3. `src/pages/tags/index.astro` — 使用 slug 作為 href，display 作為顯示文字：

```astro
{tags.map(({ slug, display, count }) => (
  <a href={`/tags/${slug}`} ...>
    {display}
    <span ...>{count}</span>
  </a>
))}
```

4. `src/pages/tags/[tag].astro` — `getStaticPaths` 使用 slug：

```ts
export async function getStaticPaths() {
  const tags = await getTagIndex();
  return tags.map(({ slug, display }) => ({
    params: { tag: slug },
    props: { slug, display },
  }));
}
```

頁面標題改為顯示原始名稱：`<h1>#{display}</h1>`

5. `src/layouts/BlogLayout.astro:77` — tag 連結改用 slug helper：

```astro
---
import { toTagSlug } from '@/lib/tags';
// ...existing imports...
---
{tags.map((tag) => (
  <a href={`/tags/${toTagSlug(tag)}`} class="tag hover:opacity-80 transition-opacity">
    {tag}
  </a>
))}
```

6. `src/pages/blog/index.astro` — filter buttons 的 `data-tag` 改用 slug，保留原始名稱顯示：

```astro
---
import { toTagSlug } from '@/lib/tags';
// ...existing imports...
const allTags = [...new Map(
  sorted.flatMap((post) => post.data.tags.map((t) => [toTagSlug(t), t] as const))
).entries()].sort((a, b) => a[0].localeCompare(b[0]));
---
{allTags.map(([slug, display]) => (
  <button data-tag={slug} ...>{display}</button>
))}
```

grid items 的 `data-tags` 也用 slug：

```astro
<div data-tags={post.data.tags.map((t) => toTagSlug(t)).join(',')}>
```

**驗收：**
- `/tags/tailwind-css` 可正常訪問（而非 `/tags/tailwind%20css`）
- tags index 頁面顯示 `Tailwind CSS`（原始大小寫），連結指向 `/tags/tailwind-css`
- 文章頁的 tag 連結指向 slug 版 URL
- blog index 的 tag filter 正常運作
- `npm run verify` 通過

---

### FIX-2｜Tailwind ESM 修正

**優先度：HIGH**
**影響檔案：** `tailwind.config.mjs`
**改動行數：** 2 行

**問題：** `package.json` 設定 `"type": "module"`，但 `tailwind.config.mjs` 使用 CommonJS 的 `require()`。
目前靠 Tailwind 內部 polyfill 可以跑，但在嚴格 ESM 環境或未來升版時可能無聲斷裂。

**修法：**

```diff
+import typography from '@tailwindcss/typography';
+
 export default {
   // ...
-  plugins: [require('@tailwindcss/typography')],
+  plugins: [typography],
 };
```

**驗收：** `npm run build` 無警告、`npm run dev` 正常啟動。

---

### FIX-3｜Icon 元件化（消除 SVG 重複與 `set:html`）

**優先度：HIGH**
**新增檔案：** `src/components/icons/` 下 5 個檔案
**影響檔案：** `Footer.astro`、`contact.astro`

**問題：**
1. GitHub SVG 在 `Footer.astro` 和 `contact.astro` 各複製一份，共 2 處——改 icon 要改兩個地方
2. 使用 `set:html` 渲染 SVG 字串，雖然目前資料來源固定，但維護成本高且比元件化更容易引入風險
3. Icon 跟業務邏輯混在同一個陣列，不易替換

**補充界線：**
- `set:html={JSON.stringify(schema)}`（JSON-LD）屬 Astro 官方常見做法，不在此 fix 範圍
- 本 fix 只處理「SVG 字串 + `set:html`」這類可由元件取代的情境
- `contact.astro:47-49` 的右箭頭 chevron 是直接寫在模板中的 inline SVG（非 `set:html`），僅用一處，不額外建元件

**規格：**

新增以下元件，統一結構：

```
src/components/icons/
  IconGitHub.astro
  IconTwitter.astro
  IconLinkedIn.astro
  IconMail.astro
  IconRSS.astro
```

每個元件的介面：

```astro
---
interface Props { class?: string }
const { class: cls = 'w-5 h-5' } = Astro.props;
---
<svg xmlns="http://www.w3.org/2000/svg" class={cls} fill="currentColor" viewBox="0 0 24 24">
  <path d="..." />
</svg>
```

改造後 `Footer.astro` 的 socials 區塊（socials 來源依 FIX-4 的 `SITE.socials`）：

```astro
---
import { SITE } from '@/site.config';
import IconGitHub from './icons/IconGitHub.astro';
import IconTwitter from './icons/IconTwitter.astro';
import IconLinkedIn from './icons/IconLinkedIn.astro';
import IconRSS from './icons/IconRSS.astro';

const iconById = {
  github: IconGitHub,
  twitter: IconTwitter,
  linkedin: IconLinkedIn,
} as const;

const socials = SITE.socials.map((social) => ({
  ...social,
  Icon: iconById[social.id],
}));
---
{socials.map(({ label, href, Icon }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} class="...">
    <Icon />
  </a>
))}
```

`contact.astro` 同樣改為 icon 元件映射，移除所有 SVG 字串與 `set:html`；Email 資料來源由 FIX-4 定義。`contact.astro:47-49` 的右箭頭 chevron SVG 保持 inline 不動。

**驗收：**
- `src/components/icons/` 下有 5 個 `.astro` 檔案
- `Footer.astro` 和 `contact.astro` 不再有任何 SVG 字串變數
- `set:html` 在這兩個檔案中不再出現（JSON-LD 的 `set:html` 不在此範圍）
- 視覺外觀與修改前完全一致

---

### FIX-4｜社群資料集中（Single Source of Truth）

**優先度：HIGH**
**影響檔案：** `src/site.config.ts`、`src/components/Footer.astro`、`src/pages/contact.astro`

**問題：**
- 社群連結目前在 Footer 與 Contact 各定義一份，修改帳號時容易只改到一邊
- Contact 頁 Email 目前是頁面內硬寫，與社群資料一樣缺少集中來源
- Contact 頁目前缺少 LinkedIn（Footer 有），兩邊不一致

**規格：**

1. `src/site.config.ts` 新增集中資料結構（社群 + 聯絡）：

```ts
export const SITE = {
  // ...existing fields...
  socials: [
    { id: 'github' as const, label: 'GitHub', href: 'https://github.com/joeycatai', handle: '@joeycatai' },
    { id: 'twitter' as const, label: 'Twitter / X', href: 'https://twitter.com/joeycatai', handle: '@joeycatai' },
    { id: 'linkedin' as const, label: 'LinkedIn', href: 'https://linkedin.com/in/joeycatai', handle: '/in/joeycatai' },
  ],
  contact: {
    email: 'hello@joeycatai.com',
  },
};
```

2. `Footer.astro` 不再自行硬寫社群 URL，改從 `SITE.socials` 讀取。

3. `contact.astro` 改為讀取 `SITE.contact.email` 與 `SITE.socials`（社群全同步，含 LinkedIn）。

4. 保留 `twitterHandle` 給 SEO Twitter meta 使用（不破壞既有介面）。

> **備註**：`twitterHandle` 與 `socials` 中 twitter 條目的 `handle` 存在重複。這是刻意的短期妥協——`twitterHandle` 被 `SEO.astro` 直接引用，目前不值得為了消除此重複而改動 SEO 介面。後續可在需要時整合。

**驗收：**
- GitHub/Twitter/LinkedIn URL 只在 `site.config.ts` 定義一次
- Email 只在 `site.config.ts` 定義一次
- Footer 與 Contact 社群資料一致（Contact 額外顯示 Email）

---

### FIX-5｜`og:locale` 與頁面語言一致

**優先度：HIGH**
**影響檔案：** `src/layouts/BaseLayout.astro`、`src/components/SEO.astro`

**問題：**
- `BaseLayout` 已有 `lang` prop，但沒有傳給 `SEO`
- `SEO.astro` 的 `og:locale` 固定 `zh_TW`，未來英語內容會輸出錯誤 locale

**規格：**

1. `SEO.astro` 新增 `lang?: 'zh-TW' | 'en'` prop，預設 `zh-TW`。
2. 依 `lang` 推導 `og:locale`：

```ts
const localeMap: Record<string, string> = { 'zh-TW': 'zh_TW', en: 'en_US' };
const ogLocale = localeMap[lang] ?? 'zh_TW';
```

3. `BaseLayout.astro` 呼叫 `<SEO ...>` 時傳入 `lang={lang}`：

```diff
 <SEO
   title={title}
   ...
   robots={robots}
+  lang={lang}
 />
```

**驗收：**
- 中文頁面輸出 `og:locale=zh_TW`
- 英文頁面（設定 `lang: 'en'`）輸出 `og:locale=en_US`

---

### FIX-6｜專案排序邏輯收斂

**優先度：HIGH**
**影響檔案：** `src/lib/content.ts`、`src/pages/projects/index.astro`

**問題：**
- `getProjects()` 只按日期排序
- `projects/index.astro` 又加一段 inline sort（featured 置頂）
- 排序規則分散，未來易產生行為不一致

**規格：**

1. 在 `src/lib/content.ts` 新增專用方法：

```ts
export async function getProjectsSorted(): Promise<ProjectEntry[]> {
  const projects = await getCollection('projects');
  return [...projects].sort((a, b) => {
    if (a.data.featured !== b.data.featured) return a.data.featured ? -1 : 1;
    return b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
  });
}
```

2. `src/pages/projects/index.astro` 改用 `getProjectsSorted()`，移除 inline sort。

3. `getProjects()` 保留既有語意（純日期排序），避免混淆。

**驗收：**
- 專案列表維持「featured 優先，其次日期新到舊」
- 排序邏輯僅在 `src/lib/content.ts` 維護

---

### FIX-7｜SEO og:image Fallback

**優先度：MEDIUM**
**影響檔案：** `src/components/SEO.astro`；新增 `public/og-default.png`

**問題：** `heroImage` 為空時，`og:image` meta tag 完全不輸出。
把網址貼到 LINE、Facebook、Twitter 時，沒有封面圖，分享卡片顯示空白。

> **備註**：`og-default.png` 需手動設計產出（1200×630，帶 `joeycatai` 字樣），不是純程式碼任務。可用 Figma、Canva 等工具製作。

**規格：**

1. 新增 `public/og-default.png`（尺寸：1200×630，帶網站名稱）

2. `SEO.astro` 修改邏輯——用 `isDefaultImage` 判斷，避免 fallback 尺寸覆蓋真實值：

```diff
-const ogImage = image && (image.startsWith('http') ? image : new URL(image, SITE.url));
+const isDefaultImage = !image;
+const resolvedImage = image ?? '/og-default.png';
+const ogImage = resolvedImage.startsWith('http')
+  ? resolvedImage
+  : new URL(resolvedImage, SITE.url).toString();
+const ogWidth  = isDefaultImage ? 1200 : imageWidth;
+const ogHeight = isDefaultImage ? 630 : imageHeight;
+const ogType   = isDefaultImage ? 'image/png' : imageType;
```

3. Twitter Card 智慧降級：有自訂 image 才用大卡片

```diff
-<meta name="twitter:card" content="summary_large_image" />
+<meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
```

4. og:image 相關 meta 改為永遠輸出（`ogImage` 現在永遠有值）：

```diff
-{ogImage && <meta property="og:image" content={String(ogImage)} />}
-{ogImage && <meta property="og:image:alt" content={fullTitle} />}
-{imageWidth && <meta property="og:image:width" content={String(imageWidth)} />}
-{imageHeight && <meta property="og:image:height" content={String(imageHeight)} />}
-{imageType && <meta property="og:image:type" content={imageType} />}
+<meta property="og:image" content={ogImage} />
+<meta property="og:image:alt" content={fullTitle} />
+{ogWidth && <meta property="og:image:width" content={String(ogWidth)} />}
+{ogHeight && <meta property="og:image:height" content={String(ogHeight)} />}
+{ogType && <meta property="og:image:type" content={ogType} />}
```

5. twitter:image 也改為無條件輸出（與 og:image 一致）：

```diff
-{ogImage && <meta name="twitter:image" content={String(ogImage)} />}
+<meta name="twitter:image" content={ogImage} />
```

**驗收：**
- About、Contact 等無 heroImage 的頁面，`og:image` 指向 `/og-default.png`，twitter:card 為 `summary`
- 有 heroImage 的文章頁，`og:image` 指向該文章圖片，twitter:card 為 `summary_large_image`
- 有 heroImage 但某欄位為 undefined 時，不會錯誤 fallback 到 1200/630

---

### FIX-8｜Cloudflare Pages 安全標頭

**優先度：MEDIUM**
**新增檔案：** `public/_headers`

**問題：** 缺少基本 HTTP 安全標頭，瀏覽器無法防範 clickjacking 及 MIME sniffing 攻擊。
Cloudflare Pages 會自動讀取 `public/_headers` 並套用。

**規格：**

```
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/_astro/*
  Cache-Control: public, max-age=31536000, immutable
```

**說明：**
- `X-Frame-Options: DENY` — 禁止此網站被 iframe 嵌入（防 clickjacking）
- `X-Content-Type-Options: nosniff` — 禁止瀏覽器猜測 MIME type
- `Referrer-Policy` — 跨站連結不洩漏完整 URL
- `/_astro/*` 的 cache 規則 — Astro 靜態資產帶 hash，永久快取安全

**驗收：** 部署至 Cloudflare Pages 後，用 curl 或 browser devtools 可見上述 response header。

---

### FIX-9｜Trailing Slash 統一

**優先度：MEDIUM**
**影響檔案：** `astro.config.mjs`

**問題：** 未設定時，`/about` 和 `/about/` 都可訪問，Google 可能將兩者視為重複頁面，影響 SEO。

**修法：**

```diff
 export default defineConfig({
   site: 'https://joeycatai.com',
+  trailingSlash: 'never',
   // ...
 });
```

**驗收：**
- `npm run build` 成功
- sitemap 輸出的 URL 不帶結尾斜線
- `SEO.astro` 的 canonical URL 與 sitemap 一致（`Astro.url.pathname` 在 `trailingSlash: 'never'` 下不帶 `/`）

---

### FIX-10｜文章版本號修正

**優先度：LOW**
**影響檔案：** `src/content/blog/hello-world.mdx:25`

**問題：** 文章寫 `Astro 4.x`，實際使用版本為 `5.17.3`。

**修法：**

```diff
-Astro 4.x        → 靜態網站框架
+Astro 5.x        → 靜態網站框架
```

**驗收：** 文章頁渲染正確顯示 `Astro 5.x`。

---

## 變更總覽

| # | 優先度 | 新增 | 修改 | 主要效益 |
|---|--------|------|------|----------|
| FIX-1 | HIGH | `src/lib/tags.ts` | `content.ts`, `tags/*.astro`, `BlogLayout.astro`, `blog/index.astro` | Tag URL 安全正規化 + display name 保留 |
| FIX-2 | HIGH | — | `tailwind.config.mjs` | 消除 ESM/CJS 不一致 |
| FIX-3 | HIGH | `src/components/icons/*.astro` (5 個) | `Footer.astro`, `contact.astro` | 消除 SVG 重複、移除 `set:html` |
| FIX-4 | HIGH | — | `site.config.ts`, `Footer.astro`, `contact.astro` | 社群與 Email 資料單一來源 |
| FIX-5 | HIGH | — | `BaseLayout.astro`, `SEO.astro` | locale 與頁面語言一致 |
| FIX-6 | HIGH | — | `content.ts`, `projects/index.astro` | 排序規則集中維護 |
| FIX-7 | MEDIUM | `public/og-default.png` (手動產出) | `SEO.astro` | 社群分享有封面圖 |
| FIX-8 | MEDIUM | `public/_headers` | — | 基本 HTTP 安全標頭 |
| FIX-9 | MEDIUM | — | `astro.config.mjs` | URL 一致性、SEO |
| FIX-10 | LOW | — | `hello-world.mdx` | 內容正確性 |

**新增檔案：** 7 個（`tags.ts` + 5 icons + `_headers`）+ 1 個需手動產生的圖檔（`og-default.png`）
**修改檔案：** 12 個
**刪除檔案：** 0 個
**功能異動：** Tag URL 從 `tailwind css` 變為 `tailwind-css`（語意等價，無外部連結相容問題——站點尚未上線被索引）

---

## 不做的事

| 項目 | 原因 |
|------|------|
| View Transitions | 功能性變更，不屬於修復範圍 |
| Self-host 字型 | 需安裝新套件、測試字重，列為後續獨立 PR |
| Schema.org BreadcrumbList | 增強性功能，不在此次修復範圍 |
| 完整 CSP header | 需對所有外部資源逐一設定，列為後續 hardening |
| 多語系路由 | 目前 `lang` 僅影響 SEO locale，完整 i18n 路由是架構性變更 |
| CI/CD workflow | 有價值但獨立於程式碼修復，列為後續 PR |
| README 補齊 | 文件任務，不混入程式碼重構 PR |
| 舊 tag URL redirect | 站點尚未上線，無既有外部連結需相容 |

---

## 驗收清單

實作完成後，依序檢查：

1. **型別與建置**：`npm run verify`（= `astro check` + `astro build`）必須 0 errors
2. **Tag 路由**：`/tags/tailwind-css` 可訪問；build output 目錄不含空白
3. **Tag 顯示**：tags index 顯示原始大小寫（`Tailwind CSS`），連結指向 slug
4. **SEO locale**：中文頁 `og:locale=zh_TW`；英文頁 `og:locale=en_US`
5. **SEO image**：無圖頁有 `og:image` 指向 default；有圖頁指向該圖，尺寸正確
6. **Twitter card**：無圖頁 `summary`；有圖頁 `summary_large_image`
7. **社群一致**：Footer 與 Contact 的 GitHub/Twitter/LinkedIn URL 完全一致
8. **set:html**：Footer 和 contact 不再有 SVG 字串的 `set:html`
9. **排序**：專案列表 featured 優先、日期新到舊；邏輯只在 `content.ts`
10. **Trailing slash**：sitemap 和 canonical URL 不帶結尾 `/`
