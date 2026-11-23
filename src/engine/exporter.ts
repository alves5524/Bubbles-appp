import { BubbleNode, BubbleParams, getArtboardDimensions } from '../types/bubbles';
import { computeInkBleedField } from './inkBleedField';
import { buildCompoundSvgPath, extractContourLoops } from './marchingSquares';

export function generateSvgPath(
  bubbles: BubbleNode[],
  params: BubbleParams,
  gridResolution: number
): string {
  const { width, height } = getArtboardDimensions(params.aspectRatio);
  const field = computeInkBleedField(bubbles, width, height, params, gridResolution);
  const loops = extractContourLoops(field);
  return buildCompoundSvgPath(loops, params.roundness, gridResolution > 400 ? 2 : 1);
}

/**
 * Generates a subtle deterministic tileable serigraphy micro-grain pattern canvas
 */
let cachedGrainCanvas: HTMLCanvasElement | null = null;
export function getSerigraphyGrainCanvas(): HTMLCanvasElement {
  if (cachedGrainCanvas) return cachedGrainCanvas;
  const size = 160;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const img = ctx.createImageData(size, size);
  const buf = img.data;
  let s = 1337;
  for (let i = 0; i < buf.length; i += 4) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const n = (s >>> 24) & 255;
    // Soft monochrome paper/screenprint tooth
    const val = n > 128 ? 255 : 0;
    const alpha = Math.abs(n - 128) * 0.28;
    buf[i] = val;
    buf[i + 1] = val;
    buf[i + 2] = val;
    buf[i + 3] = alpha;
  }
  ctx.putImageData(img, 0, 0);
  cachedGrainCanvas = canvas;
  return canvas;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportAsSvg(bubbles: BubbleNode[], params: BubbleParams): void {
  const { width, height } = getArtboardDimensions(params.aspectRatio);
  const pathData = generateSvgPath(bubbles, params, 560);

  const bgElement =
    params.surfaceColor !== 'transparent'
      ? `  <rect width="${width}" height="${height}" fill="${params.surfaceColor}" />\n`
      : '';

  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
${bgElement}  <path d="${pathData}" fill="${params.lineColor}" fill-rule="evenodd" />
</svg>
`;

  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  triggerDownload(blob, `serigrafia-bolhas-${params.seed}.svg`);
}

export function exportAsPng(
  bubbles: BubbleNode[],
  params: BubbleParams,
  multiplier: 1 | 2 | 3 = 2
): Promise<void> {
  return new Promise((resolve, reject) => {
    const { width, height } = getArtboardDimensions(params.aspectRatio);
    const pathData = generateSvgPath(bubbles, params, 560);

    const canvas = document.createElement('canvas');
    canvas.width = width * multiplier;
    canvas.height = height * multiplier;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas context unavailable'));
      return;
    }

    ctx.save();
    ctx.scale(multiplier, multiplier);

    if (params.surfaceColor !== 'transparent') {
      ctx.fillStyle = params.surfaceColor;
      ctx.fillRect(0, 0, width, height);
    }

    const p2d = new Path2D(pathData);
    ctx.fillStyle = params.lineColor;
    ctx.fill(p2d, 'evenodd');

    if (params.surfaceGrain > 0 && params.surfaceColor !== 'transparent') {
      const pattern = ctx.createPattern(getSerigraphyGrainCanvas(), 'repeat');
      if (pattern) {
        ctx.globalAlpha = (params.surfaceGrain / 100) * 0.22;
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, width, height);
      }
    }

    ctx.restore();

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Falha ao gerar PNG'));
          return;
        }
        triggerDownload(blob, `serigrafia-bolhas-${params.seed}-${multiplier}x.png`);
        resolve();
      },
      'image/png',
      1.0
    );
  });
}
