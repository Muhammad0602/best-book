import React, {
  useEffect, useLayoutEffect, useMemo, useRef, useState,
} from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { changeApplied } from '../redux/annotations/annotationsSlice';
import { ARABIC_EDITION } from '../redux/chapters/chaptersSlice';
import {
  boundsOf, boxesTouch, distanceToStroke, eraseFromStroke, newId, pathOf, round,
  simplify, toPixels, toUnits,
} from '../lib/geometry';

const GROUP_WINDOW = 1500; // strokes drawn this quickly belong together (an "X")

// Where the anchor word of a drawing currently sits inside the reading area.
const anchorOf = (article, origin, ayah, anchor) => {
  const word = article.querySelector(
    `[data-ayah="${ayah}"] .w[data-t="${anchor.text}"][data-w="${anchor.word}"]`,
  );
  if (!word) return null;
  const rect = word.getBoundingClientRect();
  if (!rect.height) return null;
  return {
    cx: rect.left - origin.left + rect.width / 2,
    cy: rect.top - origin.top + rect.height / 2,
    unit: rect.height,
  };
};

const distanceToRect = (x, y, rect) => Math.hypot(
  Math.max(rect.left - x, 0, x - rect.right),
  Math.max(rect.top - y, 0, y - rect.bottom),
);

// The word closest to the middle of a freshly drawn stroke.
const nearestWord = (article, origin, box) => {
  const x = (box.left + box.right) / 2 + origin.left;
  const y = (box.top + box.bottom) / 2 + origin.top;
  // When the ayahs flow one after another, several of them share a line: look
  // at every ayah that is level with the stroke.
  const blocks = [];
  let blockDistance = Infinity;
  article.querySelectorAll('[data-ayah]').forEach((candidate) => {
    const rect = candidate.getBoundingClientRect();
    const distance = Math.max(rect.top - y, 0, y - rect.bottom);
    blocks.push({ candidate, distance });
    if (distance < blockDistance) blockDistance = distance;
  });
  let best = null;
  let bestScore = Infinity;
  blocks.filter(({ distance }) => distance <= blockDistance + 1).forEach(({ candidate }) => {
    candidate.querySelectorAll('.w').forEach((word) => {
      const rect = word.getBoundingClientRect();
      if (!rect.height) return;
      const centre = Math.hypot(x - (rect.left + rect.right) / 2, y - (rect.top + rect.bottom) / 2);
      const score = distanceToRect(x, y, rect) * 1000 + centre;
      if (score < bestScore) {
        best = { word, rect, block: candidate };
        bestScore = score;
      }
    });
  });
  if (!best) return null;
  return {
    ayah: Number(best.block.dataset.ayah),
    anchor: { text: best.word.dataset.t, word: Number(best.word.dataset.w) },
    geometry: {
      cx: best.rect.left - origin.left + best.rect.width / 2,
      cy: best.rect.top - origin.top + best.rect.height / 2,
      unit: best.rect.height,
    },
  };
};

function DrawingLayer({
  articleRef, surah, drawings, active, tool, color, width, selectedId, onSelect, layoutKey,
  translationEdition,
}) {
  const dispatch = useDispatch();
  const svgRef = useRef(null);
  const gesture = useRef(null);
  const pointers = useRef(new Map());
  const lastGroup = useRef(null);
  const [tick, setTick] = useState(0);
  const [anchors, setAnchors] = useState({});
  const [live, setLive] = useState(null);
  const [overrides, setOverrides] = useState(null);
  const [eraser, setEraser] = useState(null);

  // Re-place the drawings whenever the text reflows.
  useEffect(() => {
    const article = articleRef.current;
    if (!article) return undefined;
    let settle = null;
    const place = () => setTick((value) => value + 1);
    // Lay out again shortly after, in case the page was still settling.
    const bump = () => {
      place();
      clearTimeout(settle);
      settle = setTimeout(place, 300);
    };
    let observer = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(bump);
      observer.observe(article);
    }
    window.addEventListener('resize', bump);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(bump);
    return () => {
      clearTimeout(settle);
      if (observer) observer.disconnect();
      window.removeEventListener('resize', bump);
    };
  }, [articleRef]);

  const shown = useMemo(() => {
    if (!overrides) return drawings;
    return drawings
      .map((drawing) => (drawing.id in overrides ? overrides[drawing.id] : drawing))
      .filter(Boolean);
  }, [drawings, overrides]);

  useLayoutEffect(() => {
    const article = articleRef.current;
    if (!article) return;
    const origin = article.getBoundingClientRect();
    const next = {};
    drawings.forEach((drawing) => {
      const anchor = anchorOf(article, origin, drawing.ayah, drawing.data.anchor);
      if (anchor) next[drawing.id] = anchor;
    });
    setAnchors(next);
  }, [drawings, tick, articleRef, layoutKey]);

  const originOf = () => articleRef.current.getBoundingClientRect();
  const pointOf = (event, origin) => [event.clientX - origin.left, event.clientY - origin.top];

  const referenceUnit = () => {
    const word = articleRef.current.querySelector('.w[data-t="ar"]');
    const height = word ? word.getBoundingClientRect().height : 0;
    return height || 40;
  };

  const widthOf = (drawing) => Math.max(1, drawing.data.width * anchors[drawing.id].unit);

  const hitTest = (point) => {
    let best = null;
    let bestDistance = Infinity;
    drawings.forEach((drawing) => {
      const anchor = anchors[drawing.id];
      if (!anchor) return;
      const reach = Math.max(14, anchor.unit * 0.3) + widthOf(drawing) / 2;
      drawing.data.strokes.forEach((stroke) => {
        const distance = distanceToStroke(point, toPixels(stroke, anchor));
        if (distance <= reach && distance < bestDistance) {
          best = drawing;
          bestDistance = distance;
        }
      });
    });
    return best;
  };

  const eraseAt = (point) => {
    const { work, radius } = gesture.current;
    let touched = false;
    drawings.forEach((drawing) => {
      const current = work.has(drawing.id) ? work.get(drawing.id) : drawing;
      const anchor = anchors[drawing.id];
      if (!current || !anchor) return;
      const reach = radius + widthOf(drawing) / 2;
      const strokes = [];
      let changed = false;
      current.data.strokes.forEach((stroke) => {
        const pieces = eraseFromStroke(toPixels(stroke, anchor), point, reach);
        if (pieces === null) {
          strokes.push(stroke);
        } else {
          changed = true;
          pieces.forEach((piece) => strokes.push(toUnits(piece, anchor)));
        }
      });
      if (!changed) return;
      touched = true;
      work.set(drawing.id, strokes.length > 0
        ? { ...current, data: { ...current.data, strokes }, updatedAt: new Date().toISOString() }
        : null);
    });
    if (touched) setOverrides(Object.fromEntries(work));
  };

  const finishPen = (points, widthPx) => {
    const article = articleRef.current;
    const stroke = simplify(points, 0.5);
    const box = boundsOf([stroke]);
    const now = new Date().toISOString();
    const last = lastGroup.current;
    const previous = last && Date.now() - last.time < GROUP_WINDOW
      ? drawings.find((drawing) => drawing.id === last.id)
      : null;
    if (previous && anchors[previous.id] && previous.data.color === color) {
      // Add to the mark that was just drawn (second line of an X, ...).
      const anchor = anchors[previous.id];
      const previousBox = boundsOf(previous.data.strokes.map((s) => toPixels(s, anchor)));
      if (boxesTouch(previousBox, box, anchor.unit * 0.8)) {
        const updated = {
          ...previous,
          data: {
            ...previous.data,
            strokes: [...previous.data.strokes, toUnits(stroke, anchor)],
          },
          updatedAt: now,
        };
        dispatch(changeApplied({ removed: [previous], added: [updated] }));
        lastGroup.current = { id: previous.id, time: Date.now() };
        return;
      }
    }
    const target = nearestWord(article, originOf(), box);
    if (!target) return;
    const annotation = {
      id: newId(),
      surah,
      ayah: target.ayah,
      type: 'drawing',
      data: {
        anchor: target.anchor,
        edition: target.anchor.text === 'ar' ? ARABIC_EDITION : translationEdition,
        strokes: [toUnits(stroke, target.geometry)],
        color,
        width: round(widthPx / target.geometry.unit),
      },
      createdAt: now,
      updatedAt: now,
    };
    dispatch(changeApplied({ added: [annotation] }));
    lastGroup.current = { id: annotation.id, time: Date.now() };
  };

  const finishErase = (work) => {
    const removed = [];
    const added = [];
    work.forEach((result, id) => {
      const original = drawings.find((drawing) => drawing.id === id);
      if (!original) return;
      removed.push(original);
      if (result) added.push(result);
    });
    if (removed.length > 0) dispatch(changeApplied({ removed, added }));
  };

  const abandon = () => {
    gesture.current = null;
    setLive(null);
    setOverrides(null);
    setEraser(null);
  };

  const onPointerDown = (event) => {
    if (!active) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (event.pointerType === 'touch' && pointers.current.size >= 2) {
      // Two fingers scroll the page instead of drawing.
      abandon();
      gesture.current = { type: 'pan' };
      return;
    }
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    try {
      svgRef.current.setPointerCapture(event.pointerId);
    } catch (error) {
      // Not essential: drawing still works while the pointer stays on the page.
    }
    const point = pointOf(event, originOf());
    if (tool === 'select') {
      const hit = hitTest(point);
      onSelect(hit ? hit.id : null);
    } else if (tool === 'eraser') {
      const radius = Math.max(10, referenceUnit() * 0.2);
      gesture.current = {
        type: 'erase', id: event.pointerId, work: new Map(), radius,
      };
      setEraser({ x: point[0], y: point[1], r: radius });
      eraseAt(point);
    } else {
      const widthPx = Math.max(1.5, width * referenceUnit());
      gesture.current = {
        type: 'pen', id: event.pointerId, points: [point], widthPx,
      };
      setLive({ points: [point], widthPx });
    }
  };

  const onPointerMove = (event) => {
    const previous = pointers.current.get(event.pointerId);
    const { current } = gesture;
    if (!previous || !current) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (current.type === 'pan') {
      window.scrollBy(0, (previous.y - event.clientY) / Math.max(1, pointers.current.size));
      return;
    }
    if (current.id !== event.pointerId) return;
    const point = pointOf(event, originOf());
    if (current.type === 'pen') {
      const last = current.points[current.points.length - 1];
      if (Math.hypot(point[0] - last[0], point[1] - last[1]) < 1.5) return;
      current.points.push(point);
      setLive({ points: current.points.slice(), widthPx: current.widthPx });
    } else if (current.type === 'erase') {
      setEraser({ x: point[0], y: point[1], r: current.radius });
      eraseAt(point);
    }
  };

  const endPointer = (event, cancelled) => {
    pointers.current.delete(event.pointerId);
    const { current } = gesture;
    if (!current) return;
    if (current.type === 'pan') {
      if (pointers.current.size === 0) gesture.current = null;
      return;
    }
    if (current.id !== event.pointerId) return;
    if (!cancelled && current.type === 'pen') finishPen(current.points, current.widthPx);
    if (!cancelled && current.type === 'erase') finishErase(current.work);
    abandon();
  };

  return (
    <svg
      ref={svgRef}
      className={`draw-layer${active ? ` active tool-${tool}` : ''}`}
      aria-hidden="true"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => endPointer(event, false)}
      onPointerCancel={(event) => endPointer(event, true)}
    >
      {shown.map((drawing) => {
        const anchor = anchors[drawing.id];
        if (!anchor) return null;
        const d = drawing.data.strokes.map((stroke) => pathOf(toPixels(stroke, anchor))).join('');
        const strokeWidth = Math.max(1, drawing.data.width * anchor.unit);
        return (
          <g key={drawing.id}>
            {active && selectedId === drawing.id && (
              <path className="draw-halo" d={d} strokeWidth={strokeWidth + 12} />
            )}
            <path className="draw-stroke" d={d} stroke={drawing.data.color} strokeWidth={strokeWidth} />
          </g>
        );
      })}
      {live && (
        <path className="draw-stroke" d={pathOf(live.points)} stroke={color} strokeWidth={live.widthPx} />
      )}
      {eraser && <circle className="draw-eraser" cx={eraser.x} cy={eraser.y} r={eraser.r} />}
    </svg>
  );
}

DrawingLayer.propTypes = {
  articleRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) }).isRequired,
  surah: PropTypes.number.isRequired,
  drawings: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  active: PropTypes.bool.isRequired,
  tool: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired,
  width: PropTypes.number.isRequired,
  selectedId: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  layoutKey: PropTypes.string,
  translationEdition: PropTypes.string.isRequired,
};

DrawingLayer.defaultProps = { selectedId: null, layoutKey: '' };

export default DrawingLayer;
