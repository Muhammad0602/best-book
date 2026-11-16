// Helpers for freehand drawings. A "stroke" is a list of [x, y] points.
//
// On screen we work in pixels relative to the reading area. When saved,
// points are converted to "units": offsets from the centre of an anchor word,
// divided by the height of that word. See annotationsSlice.js.

export const round = (value) => Math.round(value * 1000) / 1000;

export const newId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r % 4) + 8).toString(16);
  });
};

export const toPixels = (stroke, anchor) => stroke.map(
  ([x, y]) => [anchor.cx + x * anchor.unit, anchor.cy + y * anchor.unit],
);

export const toUnits = (stroke, anchor) => stroke.map(
  ([x, y]) => [round((x - anchor.cx) / anchor.unit), round((y - anchor.cy) / anchor.unit)],
);

export const boundsOf = (strokes) => {
  const box = {
    left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity,
  };
  strokes.forEach((stroke) => stroke.forEach(([x, y]) => {
    box.left = Math.min(box.left, x);
    box.right = Math.max(box.right, x);
    box.top = Math.min(box.top, y);
    box.bottom = Math.max(box.bottom, y);
  }));
  return box;
};

export const boxesTouch = (a, b, margin) => (
  a.left - margin <= b.right && a.right + margin >= b.left
  && a.top - margin <= b.bottom && a.bottom + margin >= b.top
);

// A smooth SVG path through the points.
export const pathOf = (stroke) => {
  if (stroke.length === 0) return '';
  const [first] = stroke;
  if (stroke.length === 1) return `M${first[0]} ${first[1]}l0.01 0`;
  let d = `M${round(first[0])} ${round(first[1])}`;
  for (let i = 1; i < stroke.length - 1; i += 1) {
    const [x, y] = stroke[i];
    const [nx, ny] = stroke[i + 1];
    d += `Q${round(x)} ${round(y)} ${round((x + nx) / 2)} ${round((y + ny) / 2)}`;
  }
  const last = stroke[stroke.length - 1];
  return `${d}L${round(last[0])} ${round(last[1])}`;
};

const distanceToSegment = (p, a, b) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length = dx * dx + dy * dy;
  const t = length === 0
    ? 0
    : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
};

export const distanceToStroke = (point, stroke) => {
  if (stroke.length === 1) return Math.hypot(point[0] - stroke[0][0], point[1] - stroke[0][1]);
  let best = Infinity;
  for (let i = 1; i < stroke.length; i += 1) {
    best = Math.min(best, distanceToSegment(point, stroke[i - 1], stroke[i]));
  }
  return best;
};

// Add points so that no two neighbours are further apart than `step`.
export const densify = (stroke, step) => {
  if (stroke.length < 2) return stroke;
  const out = [stroke[0]];
  for (let i = 1; i < stroke.length; i += 1) {
    const [ax, ay] = stroke[i - 1];
    const [bx, by] = stroke[i];
    const pieces = Math.ceil(Math.hypot(bx - ax, by - ay) / step);
    for (let k = 1; k <= pieces; k += 1) {
      out.push([ax + ((bx - ax) * k) / pieces, ay + ((by - ay) * k) / pieces]);
    }
  }
  return out;
};

// Rub out the part of a stroke that lies within `radius` of `centre`.
// Returns the pieces that are left, or null when nothing was touched.
export const eraseFromStroke = (stroke, centre, radius) => {
  if (distanceToStroke(centre, stroke) > radius) return null;
  const dense = densify(stroke, Math.max(1.5, radius / 2));
  const pieces = [];
  let current = [];
  dense.forEach((point) => {
    if (Math.hypot(point[0] - centre[0], point[1] - centre[1]) <= radius) {
      if (current.length > 1) pieces.push(current);
      current = [];
    } else {
      current.push(point);
    }
  });
  if (current.length > 1) pieces.push(current);
  return pieces;
};

// Drop points that add no detail, to keep saved drawings small.
export const simplify = (stroke, tolerance) => {
  if (stroke.length < 3) return stroke;
  const out = [stroke[0]];
  for (let i = 1; i < stroke.length - 1; i += 1) {
    const previous = out[out.length - 1];
    if (distanceToSegment(stroke[i], previous, stroke[i + 1]) > tolerance
      || Math.hypot(stroke[i][0] - previous[0], stroke[i][1] - previous[1]) > tolerance * 12) {
      out.push(stroke[i]);
    }
  }
  out.push(stroke[stroke.length - 1]);
  return out;
};

export const splitWords = (text) => (text || '').trim().split(/\s+/).filter(Boolean);
