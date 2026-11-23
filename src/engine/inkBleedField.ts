import { BubbleNode, BubbleParams } from '../types/bubbles';

export interface ScalarField {
  cols: number;
  rows: number;
  cellW: number;
  cellH: number;
  data: Float32Array;
}

const THRESHOLD = 0.5;

/**
 * Calibrates core sigma so that an isolated bubble ring has exact half-width = strokeWidth / 2
 * at field value = THRESHOLD (0.5), regardless of inkBleed amount.
 */
function solveCoreSigma(halfW: number, p: number, beta: number, sigmaBleed: number): number {
  const haloAtEdge = beta * Math.exp(-Math.pow(halfW / sigmaBleed, 2));
  const targetCore = Math.max(0.05, THRESHOLD - haloAtEdge);
  const ratio = Math.min(0.98, targetCore / Math.max(0.05, 1 - beta));
  const negLn = -Math.log(ratio);
  return halfW / Math.pow(Math.max(1e-4, negLn), 1 / p);
}

/**
 * Computes the 2D scalar potential field for all screenprinted bubble rings and ink-bleed junctions.
 * Padded with a 1-cell zero border on all edges so Marching Squares always produces closed contours.
 */
export function computeInkBleedField(
  bubbles: BubbleNode[],
  artW: number,
  artH: number,
  params: BubbleParams,
  targetGridMax: number
): ScalarField {
  const aspect = artW / artH;
  const cols = aspect >= 1 ? targetGridMax : Math.max(80, Math.round(targetGridMax * aspect));
  const rows = aspect >= 1 ? Math.max(80, Math.round(targetGridMax / aspect)) : targetGridMax;

  const cellW = artW / (cols - 1);
  const cellH = artH / (rows - 1);

  const data = new Float32Array(cols * rows);

  const halfW = Math.max(0.75, params.strokeWidth * 0.5);
  const bleedNorm = Math.max(0, Math.min(1, params.inkBleed / 100));
  const roundNorm = Math.max(0, Math.min(1, params.roundness / 100));
  const orgNorm = Math.max(0, Math.min(1, params.organicness / 100));

  // Kernel shape parameters
  const p = 3.0 - roundNorm * 1.18;
  const beta = bleedNorm * 0.44;
  const sigmaBleed = halfW + 3.5 + bleedNorm * (15.0 + params.strokeWidth * 1.75);
  const sigmaCore = solveCoreSigma(halfW, p, beta, sigmaBleed);

  // Max effective distance where field contribution > ~0.004
  const maxRange = Math.max(
    sigmaCore * Math.pow(5.5, 1 / p),
    bleedNorm > 0.01 ? sigmaBleed * 2.35 : sigmaCore * Math.pow(5.5, 1 / p)
  );

  // Precompute 1D radial-ring kernel LUT for ultra-fast evaluation
  const LUT_SIZE = 256;
  const lut = new Float32Array(LUT_SIZE);
  const invMaxRange = 1 / maxRange;

  for (let i = 0; i < LUT_SIZE; i++) {
    const d = (i / (LUT_SIZE - 1)) * maxRange;
    const core = (1 - beta) * Math.exp(-Math.pow(d / sigmaCore, p));
    const halo = beta > 0 ? beta * Math.exp(-Math.pow(d / sigmaBleed, 2)) : 0;
    lut[i] = core + halo;
  }

  const maxDeformScale = 1 + orgNorm * 0.16;

  // Accumulate each bubble within its tight bounding box (leaving 1-cell border at 0)
  for (let b = 0; b < bubbles.length; b++) {
    const bubble = bubbles[b];
    const cx = bubble.x;
    const cy = bubble.y;
    const r = bubble.radius;
    const outerReach = r * maxDeformScale + maxRange;
    const innerReach = Math.max(0, r * (2 - maxDeformScale) - maxRange);
    const outerReachSq = outerReach * outerReach;
    const innerReachSq = innerReach * innerReach;

    const minGx = Math.max(1, Math.floor((cx - outerReach) / cellW));
    const maxGx = Math.min(cols - 2, Math.ceil((cx + outerReach) / cellW));
    const minGy = Math.max(1, Math.floor((cy - outerReach) / cellH));
    const maxGy = Math.min(rows - 2, Math.ceil((cy + outerReach) / cellH));

    if (minGx > maxGx || minGy > maxGy) continue;

    const hasOrg = orgNorm > 0.005;
    const a2 = bubble.deformAmp2 * orgNorm;
    const p2 = bubble.deformPhase2;
    const a3 = bubble.deformAmp3 * orgNorm;
    const p3 = bubble.deformPhase3;

    for (let gy = minGy; gy <= maxGy; gy++) {
      const py = gy * cellH;
      const dy = py - cy;
      const dySq = dy * dy;
      const rowOffset = gy * cols;

      for (let gx = minGx; gx <= maxGx; gx++) {
        const px = gx * cellW;
        const dx = px - cx;
        const distSq = dx * dx + dySq;

        if (distSq > outerReachSq || distSq < innerReachSq) continue;

        const dist = Math.sqrt(distSq);
        let effR = r;
        if (hasOrg && dist > 1e-4) {
          const angle = Math.atan2(dy, dx);
          effR = r * (1 + a2 * Math.cos(2 * angle + p2) + a3 * Math.cos(3 * angle + p3));
        }

        const d = Math.abs(dist - effR);
        if (d >= maxRange) continue;

        const t = d * invMaxRange * (LUT_SIZE - 1);
        const idx = t | 0;
        const frac = t - idx;
        const v = idx + 1 < LUT_SIZE ? lut[idx] + (lut[idx + 1] - lut[idx]) * frac : lut[LUT_SIZE - 1];
        data[rowOffset + gx] += v;
      }
    }
  }

  return { cols, rows, cellW, cellH, data };
}
