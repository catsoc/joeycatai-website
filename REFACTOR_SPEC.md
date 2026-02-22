# 重構計劃 Spec — 跨領域專家審查

> **核心約束：程式碼只能下降，不能上升。**
> 當前原始碼共 ~1,403 行（不含 node_modules、content、config）。
> 本 spec 每一項重構都標示預估淨減行數，總計目標淨減 **~150–200 行**。

---

## 一、軟體工程（Linus Torvalds 視角）

> *"Bad programmers worry about the code. Good programmers worry about data structures and their relationships."*

### 1.1 SVG 圖示重複：提取為共用片段

**問題**：同一份 GitHub SVG path（~350 字元）在 4 個檔案中複製貼上。

| 圖示 | 出現位置 |
|------|----------|
| GitHub icon | `Footer.astro:8`, `ProjectCard.astro:77`, `ProjectLayout.astro:62`, `contact.astro:15` |
| X/Twitter icon | `Footer.astro:13`, `contact.astro:21` |
| External link icon | `ProjectCard.astro:64`, `ProjectLayout.astro:54` |
| Back arrow icon | `BlogLayout.astro:53-55`, `ProjectLayout.astro:26-28` |

**方案**：建立 `src/components/icons/` 目錄，每個 SVG 一個 `.astro` 元件，各處改為 import。但因約束「不能增加程式碼」，更精簡的做法是：

**推薦方案**：在 `site.config.ts` 中以 string 常數集中定義所有 SVG path data（僅 `d` 屬性值），各處以 `<svg><path d={ICONS.github}/></svg>` 引用。SVG 外殼的 class/fill 各處自行控制，只消滅 path 重複。

- 消除 4 處 GitHub SVG 完整重複 → 每處省 ~3 行
- 消除 2 處 X icon、2 處 external-link、2 處 back-arrow 重複
- **預估淨減：~25 行**

### 1.2 排序邏輯重複

**問題**：`.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())` 出現 7 次。

```
index.astro:9, index.astro:15
blog/index.astro:7
tags/[tag].astro:31, tags/[tag].astro:32
rss.xml.ts:12
projects/index.astro:10
```

**方案**：在 `site.config.ts` 匯出一個 `byDateDesc` 比較函式。各處改用 `.sort(byDateDesc)`。

- **預估淨減：~6 行**（7 處長行換短行）

### 1.3 Props 介面重複

**問題**：`BaseLayout.astro` 的 `Props` 介面與 `SEO.astro` 的 `Props` 幾乎完全相同——BaseLayout 只是把 props 原封不動傳給 SEO。

**方案**：讓 `BaseLayout` 直接 `import type { Props as SEOProps } from '@/components/SEO.astro'` 然後 `export interface Props extends SEOProps { lang?: ... }`，刪除重複欄位定義。

- **預估淨減：~8 行**

### 1.4 font-family 雙重宣告

**問題**：`global.css:11` 以 CSS 設定 `font-family: 'Inter', system-ui, sans-serif`，同時 `tailwind.config.mjs:8` 也設定 `fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] }`。兩者做同一件事。

**方案**：刪除 `global.css` 中的 `font-family` 行，保留 Tailwind config（Tailwind 的 `font-sans` 已透過 `@tailwind base` 注入 body）。

- **預估淨減：~1 行**

### 1.5 背景色雙重宣告

**問題**：`global.css:6` `html { background-color: white; }` 與 `global.css:10` `body { @apply bg-white ... }` 設定了兩層白色背景。`html` 層的目的是防止 dark mode flash，但 `html.dark` 跟 `body dark:bg-slate-900` 也重複了。

**方案**：保留 `html`/`html.dark` 的背景色（防 flash 用），從 body 的 `@apply` 中移除 `bg-white dark:bg-slate-900`。

- **預估淨減：~0 行**（長度不變，但消除語義重複，降低維護負擔）

### 1.6 accent 色票 = Tailwind blue

**問題**：`tailwind.config.mjs:12-24` 定義的 accent 色票（50–950）與 Tailwind 內建的 `blue` 完全一致，是手動複製貼上。

**方案**：

```js
const colors = require('tailwindcss/colors');
// ...
colors: { accent: colors.blue }
```

刪除 12 行色碼定義，換成 1 行引用。

- **預估淨減：~11 行**

---

## 二、SEO 專家視角

> *搜尋引擎看的是結構化語義、爬蟲可及性、以及 meta 資訊的正確性。*

### 2.1 結構化資料作用域錯誤

**問題**：`BaseLayout.astro:70-71` 在**每一頁**都輸出 `WebSite` + `Person` JSON-LD schema。根據 Google 的指南，`WebSite` schema 只需出現在首頁，`Person` schema 應出現在 About 頁或首頁。

**方案**：將 WebSite schema 移至 `index.astro`，Person schema 移至 `about.astro`，從 BaseLayout 中刪除。

- 減少所有其他頁面的 HTML 輸出量
- **預估淨減：~12 行**（BaseLayout 中刪除 schema 相關程式碼）

### 2.2 404 頁缺少 `noindex`

**問題**：`404.astro` 沒有 `<meta name="robots" content="noindex">`。若被搜尋引擎索引，會傷害 SEO 品質。

**方案**：在 `SEO.astro` 的 Props 加入 `noindex?: boolean`，404 頁傳入。但因約束，更精簡的做法是：直接在 404.astro 用 `<Fragment slot="head">` 插入一行 meta。

- **預估淨減：0 行**（增加 1 行，但屬必要 SEO 修正）

### 2.3 缺少預設 OG Image fallback

**問題**：`SEO.astro:27` 當 `image` 為 undefined 時，不輸出任何 `og:image`。社群平台分享時會顯示空白或隨機擷取。

**方案**：在 `site.config.ts` 加入 `defaultOgImage` 欄位，SEO.astro 改用 `image ?? SITE.defaultOgImage` fallback。不增加行數，只修改現有行。

- **預估淨減：0 行**（修改現有邏輯，不增不減）

### 2.4 `og:locale` 硬編碼

**問題**：`SEO.astro:45` 的 `og:locale` 硬編碼為 `zh_TW`，但 content schema 支持 `en` 語系。英文文章的 og:locale 不正確。

**方案**：將 `lang` 納入 SEO Props，locale 動態生成。可在現有 `article` 判斷邏輯旁處理，不增行數。

- **預估淨減：0 行**

---

## 三、UI 設計師視角

> *視覺一致性、留白節奏、色彩層級是否清晰。*

### 3.1 ProjectCard 的巢狀 group 衝突

**問題**：`ProjectCard.astro:19` 外層 div 有 `group`，但 `:40` 內層連結也有 `group`。Tailwind 的 `group-hover` 會被內層覆蓋，導致 hover 行為不可預期。

**方案**：移除內層 `group`，title 的 hover 改用 `:hover` 直接綁定而非 `group-hover`。

- **預估淨減：~1 行**（簡化 class）

### 3.2 「精選」badge 內聯樣式

**問題**：`ProjectCard.astro:34` 的「精選」badge 樣式直接寫在 HTML 中，長度 ~120 字元，但 `.tag` 元件已存在於 `global.css`。

**方案**：在 `global.css` 加入 `.tag-featured` 變體（僅覆蓋顏色），或直接使用 `.tag` + 額外 amber class。

- **預估淨減：~2 行**（長 class 換短 class）

### 3.3 contact 頁面可合併至 about 頁 footer

**問題**：`contact.astro` 共 62 行，內容僅 3 個社交連結 + 1 段提示文字。這些資訊與 Footer、About 頁重疊度極高。從 UX 角度，獨立頁面的資訊密度不足。

**方案**：將聯繫資訊整合到 `about.astro` 底部的一個 section，刪除 `contact.astro`，Nav 連結移除「聯繫」。

- **預估淨減：~55 行**（刪除整個 contact.astro，about 頁增加 ~7 行）

---

## 四、UX 設計師視角

> *使用者流程、操作回饋、資訊架構的合理性。*

### 4.1 Blog tag filter 缺少「無結果」回饋

**問題**：`blog/index.astro:64-83` 的 tag filter 用 `display:none` 隱藏不符合的文章。當過濾結果為 0 篇時，使用者看到完全空白的 grid，沒有任何提示。

**方案**：在 script 中加入判斷——若所有 post 都 hidden，顯示「此標籤下暫無文章」。這可以在現有 script 內加 ~3 行，但同時可刪除 blog/index.astro 上方重複的空狀態判斷（`:41-44` 在 SSG 階段判斷 `sorted.length === 0`——若完全沒文章，根本不會有 tag filter）。

- **預估淨減：~2 行**（刪除死碼，加入更正確的空狀態處理）

### 4.2 Mobile menu 缺少 aria-expanded

**問題**：`Nav.astro:59-67` 的 mobile menu 按鈕沒有 `aria-expanded` 狀態切換。螢幕閱讀器使用者無法得知選單是否展開。

**方案**：在現有 click handler（`:94-95`）中加入 `mobileBtn?.setAttribute('aria-expanded', ...)`，並在 button 預設加 `aria-expanded="false"`。

- **預估淨減：0 行**（修改現有行）

### 4.3 tag filter 的啟動狀態不明確

**問題**：頁面載入時，沒有任何 tag button 處於 active 狀態（`bg-accent-200`），使用者不清楚目前顯示的是「全部」。

**方案**：在「全部」按鈕上預設加入 active class。

- **預估淨減：0 行**（修改現有行）

---

## 五、Web Performance 工程師視角

> *每一毫秒都是轉換率。Core Web Vitals 是排名因素。*

### 5.1 Google Fonts 外部請求是效能瓶頸

**問題**：`BaseLayout.astro:54-58` 載入 Google Fonts 需要：
1. DNS lookup `fonts.googleapis.com`
2. DNS lookup `fonts.gstatic.com`（crossorigin preconnect）
3. 下載 CSS 檔（render-blocking）
4. 解析後再下載 `.woff2` 字型檔

這在慢網路下會顯著延遲 FCP（First Contentful Paint）。

**方案**：改用 `system-ui` font stack，完全移除 Google Fonts 載入。Inter 與系統字型差異微小，對個人網站而言不值得效能代價。

```css
font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
```

同時移除 `JetBrains Mono`，code block 改用 `ui-monospace, 'Cascadia Code', 'Fira Code', monospace`。

- 刪除 BaseLayout 中 4 行 Google Fonts link
- 簡化 tailwind.config.mjs 中的 fontFamily
- 刪除 global.css 中的 body font-family
- **預估淨減：~6 行**
- **效能收益：消除 2 次 DNS lookup + 1 次 render-blocking CSS 請求**

### 5.2 缺少 `<meta name="theme-color">`

**問題**：行動裝置瀏覽器的網址列顏色未設定，在深色模式下可能顯示白色網址列。

**方案**：在 BaseLayout head 中加入：
```html
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0f172a" media="(prefers-color-scheme: dark)">
```

- **預估淨減：-2 行**（增加 2 行，但屬必要 PWA/UX 修正）

### 5.3 Hero image 未設 loading 策略

**問題**：`BlogLayout.astro:63` 和 `ProjectLayout.astro:35` 的 hero image 沒有 `loading="lazy"`。但因為它們是 above-the-fold 內容，實際上應該用 `loading="eager"` + `fetchpriority="high"`，或至少不加 lazy（瀏覽器預設就是 eager）。目前行為正確但語義不明確。

**方案**：加入 `fetchpriority="high"` 到 layout hero image，讓瀏覽器優先載入 LCP 元素。修改現有 img tag 屬性即可。

- **預估淨減：0 行**

---

## 六、無障礙（Accessibility）專家視角

> *WCAG 2.1 AA 合規不是選項，是義務。*

### 6.1 `set:html` 繞過無障礙語義

**問題**：`Footer.astro:45` 和 `contact.astro:42` 使用 `set:html={icon}` 注入 SVG。這會繞過 Astro 的 HTML 處理。注入的 SVG 沒有 `aria-hidden="true"` 或 `role="img"`，螢幕閱讀器會嘗試讀取 SVG 內容。

**方案**：在 SVG string 中加入 `aria-hidden="true"`。若改用 1.1 的集中 icon 方案，可在生成時統一加入。

- **預估淨減：0 行**（修改現有 string 內容）

### 6.2 Nav 連結缺少 `aria-current`

**問題**：`Nav.astro` 的 active 連結只有視覺樣式區分（accent 色），沒有 `aria-current="page"` 屬性。

**方案**：在 `linkClass` 函式中，當 `isActive(href)` 為 true 時，回傳包含 `aria-current="page"` 的物件，或直接在 `<a>` tag 上條件渲染。

- **預估淨減：0 行**（修改現有 template）

### 6.3 Tag filter 缺少 ARIA role

**問題**：`blog/index.astro:23-37` 的 tag filter 按鈕群組沒有 `role="tablist"` / `role="tab"` / `aria-selected`。

**方案**：用 `role="group"` + `aria-label="文章分類篩選"` 包裹按鈕群組，各按鈕加 `aria-pressed`。

- **預估淨減：0 行**

---

## 七、資安工程師視角

> *攻擊面分析：靜態站的風險在於供應鏈與 headers。*

### 7.1 缺少安全 headers

**問題**：靜態站部署在 Cloudflare Pages 上，但沒有設定 `_headers` 檔案。缺少：
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

**方案**：在 `public/` 下建立 `_headers` 檔（Cloudflare Pages 會自動讀取），約 6 行。

- **預估淨減：-6 行**（增加，但屬安全必要項目）

### 7.2 外部連結的 `rel` 屬性

**問題**：所有外部連結都有 `rel="noopener noreferrer"`，正確。但 `about.astro` 的 Astro 連結（`Footer.astro:29`）缺少 `noreferrer`——目前有 `noopener noreferrer`，正確。無問題。

- **狀態：已合格 ✓**

---

## 八、內容策略師視角

> *資訊架構是否服務於使用者意圖？*

### 8.1 導航項目精簡

**問題**：Nav 有 5 個項目：首頁、關於我、專案、文章、聯繫。對個人網站而言偏多，特別是「聯繫」頁面內容薄弱（見 3.3）。

**方案**：若合併 contact → about，Nav 從 5 項減為 4 項。更符合 Hick's Law（選項越少，決策越快）。

- **配合 3.3 一併處理**

### 8.2 Tags 頁面的必要性

**問題**：`tags/index.astro` 和 `tags/[tag].astro` 提供 tag 瀏覽功能，但 blog 頁面本身已有 tag filter。兩套機制重疊。

**方案**：保留 `tags/[tag].astro`（SEO 可索引），但可考慮移除 `tags/index.astro` 並將 Nav 中不存在的 tags 入口保持現狀（目前 Nav 中沒有 tags 連結，只靠 blog 頁面的 tag 按鈕導向）。若 `tags/index.astro` 沒有外部連結指向它，可安全移除。

- **預估淨減：~33 行**（刪除 tags/index.astro）
- **前提**：確認無外部連結指向 `/tags`

---

## 重構優先序與淨減行數匯總

| 優先序 | 項目 | 來源視角 | 淨減行數 | 難度 |
|--------|------|----------|----------|------|
| P0 | 5.1 移除 Google Fonts | Performance | ~6 | 低 |
| P0 | 2.1 結構化資料移出 BaseLayout | SEO | ~12 | 低 |
| P0 | 2.2 404 加 noindex | SEO | ~0 | 低 |
| P1 | 1.1 SVG icon 去重 | Engineering | ~25 | 中 |
| P1 | 1.6 accent 色票用 Tailwind blue | Engineering | ~11 | 低 |
| P1 | 3.3 合併 contact → about | UI/UX | ~55 | 中 |
| P1 | 1.2 排序函式抽出 | Engineering | ~6 | 低 |
| P1 | 1.3 Props 介面去重 | Engineering | ~8 | 低 |
| P2 | 8.2 移除 tags/index | Content | ~33 | 低 |
| P2 | 4.1 tag filter 空狀態 | UX | ~2 | 低 |
| P2 | 3.1 ProjectCard group 修正 | UI | ~1 | 低 |
| P2 | 3.2 精選 badge 用 .tag 變體 | UI | ~2 | 低 |
| P2 | 1.4 font-family 去重 | Engineering | ~1 | 低 |
| P3 | 6.1–6.3 無障礙修正 | A11y | 0 | 低 |
| P3 | 4.2–4.3 ARIA 補強 | UX/A11y | 0 | 低 |
| P3 | 5.2 theme-color | Performance | -2 | 低 |
| P3 | 5.3 hero fetchpriority | Performance | 0 | 低 |
| P3 | 7.1 安全 headers | Security | -6 | 低 |
| P3 | 2.3–2.4 OG 修正 | SEO | 0 | 低 |

**總預估淨減：~154 行**（從 ~1,403 行降至 ~1,249 行，降幅 ~11%）

---

## 執行原則

1. **每項重構獨立一個 commit**，方便 revert
2. **先跑 `astro build` 確認無 breakage 再 commit**
3. **不新增任何 npm dependency**
4. **不新增任何新頁面**（只刪除或合併）
5. **不改變 URL 結構**（除了明確標註刪除的頁面）
6. **每個 commit message 標註對應的 spec 項目編號**（如 `refactor(1.1): deduplicate SVG icons`）
