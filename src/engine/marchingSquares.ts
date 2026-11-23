import { ScalarField } from './inkBleedField';

export interface Point {
  x: number;
  y: number;
}

const THRESHOLD = 0.5;

const CASE_SEGMENTS: number[][][] = [
  [], // 0
  [[2, 3]], // 1
  [[1, 2]], // 2
  [[1, 3]], // 3
  [[0, 1]], // 4
  [], // 5 (saddle)
  [[0, 2]], // 6
  [[0, 3]], // 7
  [[0, 3]], // 8
  [[0, 2]], // 9
  [], // 10 (saddle)
  [[0, 1]], // 11
  [[1, 3]], // 12
  [[1, 2]], // 13
  [[2, 3]], // 14
  [], // 15
];

function lerpEdge(vA: number, vB: number): number {
  const denom = vB - vA;
  if (Math.abs(denom) < 1e-6) return 0.5;
  const t = (THRESHOLD - vA) / denom;
  return t < 0.002 ? 0.002 : t > 0.998 ? 0.998 : t;
}

/**
 * Extracts closed, sub-pixel accurate vector contour loops from the scalar field.
 */
export function extractContourLoops(field: ScalarField): Point[][] {
  const { cols, rows, cellW, cellH, data } = field;
  const totalHoriz = cols * rows;

  // Each edge key maps to up to 2 connected neighbor edge keys (undirected degree-2 graph)
  const adjA = new Int32Array(totalHoriz * 2).fill(-1);
  const adjB = new Int32Array(totalHoriz * 2).fill(-1);
  const edgeX = new Float32Array(totalHoriz * 2);
  const edgeY = new Float32Array(totalHoriz * 2);
  const activeEdges: number[] = [];

  function addLink(k1: number, x1: number, y1: number, k2: number, x2: number, y2: number) {
    if (adjA[k1] === -1) {
      adjA[k1] = k2;
      edgeX[k1] = x1;
      edgeY[k1] = y1;
      activeEdges.push(k1);
    } else {
      adjB[k1] = k2;
    }

    if (adjA[k2] === -1) {
      adjA[k2] = k1;
      edgeX[k2] = x2;
      edgeY[k2] = y2;
      activeEdges.push(k2);
    } else {
      adjB[k2] = k1;
    }
  }

  for (let y = 0; y < rows - 1; y++) {
    const row0 = y * cols;
    const row1 = (y + 1) * cols;

    for (let x = 0; x < cols - 1; x++) {
      const vTL = data[row0 + x];
      const vTR = data[row0 + x + 1];
      const vBR = data[row1 + x + 1];
      const vBL = data[row1 + x];

      const mask =
        (vTL >= THRESHOLD ? 8 : 0) |
        (vTR >= THRESHOLD ? 4 : 0) |
        (vBR >= THRESHOLD ? 2 : 0) |
        (vBL >= THRESHOLD ? 1 : 0);

      if (mask === 0 || mask === 15) continue;

      let segs: number[][];
      if (mask === 5) {
        const center = 0.25 * (vTL + vTR + vBR + vBL);
        segs =
          center >= THRESHOLD
            ? [
                [0, 3],
                [1, 2],
              ]
            : [
                [0, 1],
                [2, 3],
              ];
      } else if (mask === 10) {
        const center = 0.25 * (vTL + vTR + vBR + vBL);
        segs =
          center >= THRESHOLD
            ? [
                [0, 1],
                [2, 3],
              ]
            : [
                [0, 3],
                [1, 2],
              ];
      } else {
        segs = CASE_SEGMENTS[mask];
      }

      for (let s = 0; s < segs.length; s++) {
        const e1 = segs[s][0];
        const e2 = segs[s][1];

        let k1 = 0,
          x1 = 0,
          y1 = 0;
        if (e1 === 0) {
          k1 = row0 + x;
          x1 = (x + lerpEdge(vTL, vTR)) * cellW;
          y1 = y * cellH;
        } else if (e1 === 1) {
          k1 = totalHoriz + row0 + x + 1;
          x1 = (x + 1) * cellW;
          y1 = (y + lerpEdge(vTR, vBR)) * cellH;
        } else if (e1 === 2) {
          k1 = row1 + x;
          x1 = (x + lerpEdge(vBL, vBR)) * cellW;
          y1 = (y + 1) * cellH;
        } else {
          k1 = totalHoriz + row0 + x;
          x1 = x * cellW;
          y1 = (y + lerpEdge(vTL, vBL)) * cellH;
        }

        let k2 = 0,
          x2 = 0,
          y2 = 0;
        if (e2 === 0) {
          k2 = row0 + x;
          x2 = (x + lerpEdge(vTL, vTR)) * cellW;
          y2 = y * cellH;
        } else if (e2 === 1) {
          k2 = totalHoriz + row0 + x + 1;
          x2 = (x + 1) * cellW;
          y2 = (y + lerpEdge(vTR, vBR)) * cellH;
        } else if (e2 === 2) {
          k2 = row1 + x;
          x2 = (x + lerpEdge(vBL, vBR)) * cellW;
          y2 = (y + 1) * cellH;
        } else {
          k2 = totalHoriz + row0 + x;
          x2 = x * cellW;
          y2 = (y + lerpEdge(vTL, vBL)) * cellH;
        }

        addLink(k1, x1, y1, k2, x2, y2);
      }
    }
  }

  // Chain connected edge keys into closed polygon loops
  const visited = new Uint8Array(totalHoriz * 2);
  const loops: Point[][] = [];

  for (let i = 0; i < activeEdges.length; i++) {
    const startKey = activeEdges[i];
    if (visited[startKey]) continue;

    const loop: Point[] = [];
    let curr = startKey;
    let prev = -1;
    let guard = 0;

    while (curr !== -1 && !visited[curr] && guard < 100000) {
      visited[curr] = 1;
      loop.push({ x: edgeX[curr], y: edgeY[curr] });

      const nA = adjA[curr];
      const nB = adjB[curr];
      const next = nA !== prev && nA !== -1 && !visited[nA] ? nA : nB !== prev && nB !== -1 && !visited[nB] ? nB : -1;

      prev = curr;
      curr = next;
      guard++;
    }

    if (loop.length >= 4) {
      loops.push(loop);
    }
  }

  return loops;
}

/**
 * Simplifies near-collinear/micro-spaced vertices without eroding small loops.
 */
function simplifyClosedLoop(pts: Point[], distTol: number, angleTol: number): Point[] {
  if (pts.length <= 8) return pts;

  const filtered: Point[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const prev = filtered[filtered.length - 1];
    const curr = pts[i];
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    if (dx * dx + dy * dy >= distTol * distTol) {
      filtered.push(curr);
    }
  }

  if (filtered.length <= 8) return filtered;

  // Remove nearly-collinear points
  const out: Point[] = [];
  const n = filtered.length;
  for (let i = 0; i < n; i++) {
    const p0 = filtered[(i - 1 + n) % n];
    const p1 = filtered[i];
    const p2 = filtered[(i + 1) % n];
    const vx1 = p1.x - p0.x;
    const vy1 = p1.y - p0.y;
    const vx2 = p2.x - p1.x;
    const vy2 = p2.y - p1.y;
    const len1 = Math.hypot(vx1, vy1);
    const len2 = Math.hypot(vx2, vy2);
    if (len1 > 1e-4 && len2 > 1e-4) {
      const cross = Math.abs(vx1 * vy2 - vy1 * vx2) / (len1 * len2);
      if (cross > angleTol) {
        out.push(p1);
      }
    }
  }

  return out.length >= 4 ? out : filtered;
}

/**
 * Applies Chaikin corner-cutting smoothing pass.
 */
function chaikinPass(pts: Point[], ratio: number): Point[] {
  const n = pts.length;
  const result: Point[] = new Array(n * 2);
  const inv = 1 - ratio;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    result[i * 2] = { x: a.x * inv + b.x * ratio, y: a.y * inv + b.y * ratio };
    result[i * 2 + 1] = { x: a.x * ratio + b.x * inv, y: a.y * ratio + b.y * inv };
  }
  return result;
}

/**
 * Converts extracted contour loops into a crisp, smooth compound SVG path string
 * compatible with fill-rule="evenodd".
 */
export function buildCompoundSvgPath(loops: Point[][], roundness: number, precisionDecimals = 2): string {
  const roundNorm = Math.max(0, Math.min(1, roundness / 100));
  const parts: string[] = [];
  const fmt = (v: number) => v.toFixed(precisionDecimals);

  for (let l = 0; l < loops.length; l++) {
    let pts = simplifyClosedLoop(loops[l], 0.45, 0.015);
    if (pts.length < 4) continue;

    // Apply Chaikin corner-rounding scaled by roundness, preserving small inner pockets
    if (pts.length > 12 && roundNorm > 0.25) {
      const passes = roundNorm > 0.72 ? 2 : 1;
      const ratio = 0.16 + roundNorm * 0.12; // 0.16..0.28
      for (let p = 0; p < passes; p++) {
        pts = chaikinPass(pts, ratio);
      }
    }

    const n = pts.length;
    if (roundNorm < 0.08) {
      // Crisp geometric polyline
      let d = `M${fmt(pts[0].x)},${fmt(pts[0].y)}`;
      for (let i = 1; i < n; i++) {
        d += `L${fmt(pts[i].x)},${fmt(pts[i].y)}`;
      }
      d += 'Z';
      parts.push(d);
    } else {
      // Closed C1 Quadratic B-Spline through edge midpoints
      const last = pts[n - 1];
      const first = pts[0];
      const startX = (last.x + first.x) * 0.5;
      const startY = (last.y + first.y) * 0.5;
      let d = `M${fmt(startX)},${fmt(startY)}`;
      for (let i = 0; i < n; i++) {
        const curr = pts[i];
        const next = pts[(i + 1) % n];
        const mx = (curr.x + next.x) * 0.5;
        const my = (curr.y + next.y) * 0.5;
        d += `Q${fmt(curr.x)},${fmt(curr.y)} ${fmt(mx)},${fmt(my)}`;
      }
      d += 'Z';
      parts.push(d);
    }
  }

  return parts.join('');
}
