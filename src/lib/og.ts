import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { SITE } from '@/site.config';

export interface OgProps {
  title: string;
  description?: string;
  tags?: string[];
}

// 1x1 透明 PNG，build 環境無網路時作為佔位（Cloudflare Pages 有網路，會生成真實圖片）
const FALLBACK_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQI12NgYGBg' +
    'AAAABQABpfZFQAAAAABJRU5ErkJggg==',
  'base64',
);

// 模組級快取：key = `weight:text`，避免同一頁面的 regular + bold 重複下載
const fontCache = new Map<string, ArrayBuffer>();

async function fetchFont(weight: 400 | 700, text: string): Promise<ArrayBuffer> {
  const cacheKey = `${weight}:${text}`;
  if (fontCache.has(cacheKey)) return fontCache.get(cacheKey)!;

  // 用 text 參數做字元子集，讓 Google Fonts 只回傳這頁需要的字形
  const params = new URLSearchParams({
    family: `Noto Sans TC:wght@${weight}`,
    display: 'swap',
    text,
  });

  const css = await fetch(`https://fonts.googleapis.com/css2?${params}`, {
    headers: {
      // 舊 UA 讓 Google Fonts 回傳 woff（satori 支援的格式，不需 brotli 解壓）
      'User-Agent': 'Mozilla/5.0 (compatible; AstroOgBot/1.0)',
    },
  }).then((r) => r.text());

  const urlMatch = css.match(/src:\s*url\(([^)]+)\)/);
  if (!urlMatch) throw new Error(`[og] 無法解析 Google Fonts CSS（weight: ${weight}）`);

  const data = await fetch(urlMatch[1]).then((r) => r.arrayBuffer());
  fontCache.set(cacheKey, data);
  return data;
}

function titleFontSize(title: string): number {
  if (title.length > 35) return 48;
  if (title.length > 20) return 60;
  return 72;
}

export async function generateOgImage({ title, description = '', tags = [] }: OgProps): Promise<Buffer> {
  // 字元集 = 頁面文字 + 基本 ASCII（確保標點符號、英文都在子集裡）
  const charSet =
    title +
    description +
    tags.join('') +
    SITE.name +
    ' ·#.,!?-()ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  const [regular, bold] = await Promise.all([fetchFont(400, charSet), fetchFont(700, charSet)]);

  const fonts = [
    { data: regular, name: 'Noto Sans TC', weight: 400 as const, style: 'normal' as const },
    { data: bold, name: 'Noto Sans TC', weight: 700 as const, style: 'normal' as const },
  ];

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px',
          backgroundColor: '#0f172a',
          fontFamily: '"Noto Sans TC", sans-serif',
          position: 'relative',
          overflow: 'hidden',
        },
        children: [
          // 頂部藍色漸層線
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: '0',
                left: '0',
                right: '0',
                height: '4px',
                background: 'linear-gradient(90deg, #1d4ed8, #60a5fa)',
              },
            },
          },
          // 網站名稱
          {
            type: 'div',
            props: {
              style: { display: 'flex', alignItems: 'center' },
              children: [
                {
                  type: 'span',
                  props: {
                    style: { color: '#60a5fa', fontSize: '20px', fontWeight: 600, letterSpacing: '0.03em' },
                    children: SITE.name,
                  },
                },
              ],
            },
          },
          // 主標題 + 描述
          {
            type: 'div',
            props: {
              style: { display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, justifyContent: 'center' },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      color: '#f1f5f9',
                      fontSize: `${titleFontSize(title)}px`,
                      fontWeight: 700,
                      lineHeight: 1.3,
                      maxWidth: '1040px',
                    },
                    children: title,
                  },
                },
                ...(description
                  ? [
                      {
                        type: 'div',
                        props: {
                          style: { color: '#94a3b8', fontSize: '26px', lineHeight: 1.5, maxWidth: '900px' },
                          children: description.length > 75 ? `${description.slice(0, 75)}…` : description,
                        },
                      },
                    ]
                  : []),
              ],
            },
          },
          // 標籤列
          {
            type: 'div',
            props: {
              style: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
              children: tags.slice(0, 5).map((tag) => ({
                type: 'div',
                props: {
                  style: {
                    backgroundColor: 'rgba(37,99,235,0.25)',
                    color: '#93c5fd',
                    padding: '6px 18px',
                    borderRadius: '999px',
                    fontSize: '19px',
                    fontWeight: 500,
                    border: '1px solid rgba(96,165,250,0.35)',
                  },
                  children: `#${tag}`,
                },
              })),
            },
          },
        ],
      },
    },
    { width: 1200, height: 630, fonts },
  );

  return Buffer.from(new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng());
}

/**
 * 安全版本：build 環境無法連網時回傳佔位 PNG，不讓整個 build 失敗
 * Cloudflare Pages 有對外網路，會生成真實 OG 圖
 */
export async function generateOgImageSafe(props: OgProps): Promise<Buffer> {
  try {
    return await generateOgImage(props);
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    console.warn(`[og] 跳過 OG 圖生成（${props.title}）：${reason}`);
    return FALLBACK_PNG;
  }
}
