import React from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import {
  BiBookOpen, BiHighlight, BiPencil, BiEraser, BiPointer, BiUndo, BiRedo, BiTrash, BiListUl,
} from 'react-icons/bi';
import { MdTranslate } from 'react-icons/md';
import { undone, redone } from '../redux/annotations/annotationsSlice';

export const HIGHLIGHT_COLORS = ['yellow', 'green', 'pink', 'blue'];
export const PEN_COLORS = ['#e53935', '#1e88e5', '#fb8c00', '#8e24aa'];
export const PEN_WIDTHS = [0.03, 0.05, 0.09];

const STATUS = {
  local: 'Saved on this device',
  idle: '',
  saving: 'Saving…',
  saved: 'Saved',
  offline: 'Offline · will sync later',
  error: 'Not synced yet · retrying',
};

const MODES = [
  { id: 'read', label: 'Read', Icon: BiBookOpen },
  { id: 'highlight', label: 'Highlight', Icon: BiHighlight },
  { id: 'draw', label: 'Draw', Icon: BiPencil },
];

const TOOLS = [
  { id: 'pen', label: 'Pen', Icon: BiPencil },
  { id: 'eraser', label: 'Eraser', Icon: BiEraser },
  { id: 'select', label: 'Select a drawing', Icon: BiPointer },
];

function Toolbar({
  mode, onMode, highlightColor, onHighlightColor, tool, onTool, penColor, onPenColor,
  penWidth, onPenWidth, canDelete, onDelete, count, onOpenList,
  showTranslation, onToggleTranslation,
}) {
  const dispatch = useDispatch();
  const { undo, redo, sync } = useSelector((store) => store.annotations);
  const status = STATUS[sync] || '';

  return (
    <div className="toolbar" role="toolbar" aria-label="Study tools">
      {mode !== 'read' && (
        <div className="toolbar-row toolbar-tools">
          {mode === 'highlight' && HIGHLIGHT_COLORS.map((name) => (
            <button
              key={name}
              type="button"
              className={`swatch hl-${name}${highlightColor === name ? ' on' : ''}`}
              aria-label={`${name} highlight`}
              aria-pressed={highlightColor === name}
              onClick={() => onHighlightColor(name)}
            />
          ))}
          {mode === 'draw' && TOOLS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={`tool${tool === id ? ' on' : ''}`}
              aria-label={label}
              title={label}
              aria-pressed={tool === id}
              onClick={() => onTool(id)}
            >
              <Icon aria-hidden="true" />
            </button>
          ))}
          {mode === 'draw' && tool === 'pen' && (
            <>
              <span className="divider" />
              {PEN_COLORS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`swatch${penColor === value ? ' on' : ''}`}
                  style={{ backgroundColor: value }}
                  aria-label={`Pen colour ${value}`}
                  aria-pressed={penColor === value}
                  onClick={() => onPenColor(value)}
                />
              ))}
              <button
                type="button"
                className="tool"
                aria-label="Change line thickness"
                title="Line thickness"
                onClick={() => onPenWidth(
                  PEN_WIDTHS[(PEN_WIDTHS.indexOf(penWidth) + 1) % PEN_WIDTHS.length],
                )}
              >
                <span
                  className="thickness"
                  style={{ height: `${2 + PEN_WIDTHS.indexOf(penWidth) * 3}px` }}
                />
              </button>
            </>
          )}
          {mode === 'draw' && tool === 'select' && (
            <button
              type="button"
              className="tool danger wide"
              disabled={!canDelete}
              onClick={onDelete}
            >
              <BiTrash aria-hidden="true" />
              <span>{canDelete ? 'Delete drawing' : 'Tap a drawing'}</span>
            </button>
          )}
          <span className="spacer" />
          <button
            type="button"
            className="tool"
            aria-label="Undo"
            title="Undo"
            disabled={undo.length === 0}
            onClick={() => dispatch(undone())}
          >
            <BiUndo aria-hidden="true" />
          </button>
          <button
            type="button"
            className="tool"
            aria-label="Redo"
            title="Redo"
            disabled={redo.length === 0}
            onClick={() => dispatch(redone())}
          >
            <BiRedo aria-hidden="true" />
          </button>
        </div>
      )}
      <div className="toolbar-row">
        {MODES.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`mode${mode === id ? ' on' : ''}`}
            aria-pressed={mode === id}
            onClick={() => onMode(id)}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
        <button
          type="button"
          className={`mode toggle${showTranslation ? ' on' : ''}`}
          aria-pressed={showTranslation}
          title={showTranslation ? 'Hide the English translation' : 'Show the English translation'}
          onClick={onToggleTranslation}
        >
          <MdTranslate aria-hidden="true" />
          <span>Translation</span>
        </button>
        <button type="button" className="mode" onClick={onOpenList}>
          <BiListUl aria-hidden="true" />
          <span>{`Marks${count ? ` (${count})` : ''}`}</span>
        </button>
      </div>
      <p className="save-status" role="status" aria-live="polite">
        {mode === 'draw' && tool !== 'select' ? 'Two fingers to scroll · ' : ''}
        {mode === 'highlight' ? 'Tap or drag across words · ' : ''}
        {mode === 'read' ? 'Tap an ayah number for tafsir · ' : ''}
        {status}
      </p>
    </div>
  );
}

Toolbar.propTypes = {
  mode: PropTypes.string.isRequired,
  onMode: PropTypes.func.isRequired,
  highlightColor: PropTypes.string.isRequired,
  onHighlightColor: PropTypes.func.isRequired,
  tool: PropTypes.string.isRequired,
  onTool: PropTypes.func.isRequired,
  penColor: PropTypes.string.isRequired,
  onPenColor: PropTypes.func.isRequired,
  penWidth: PropTypes.number.isRequired,
  onPenWidth: PropTypes.func.isRequired,
  canDelete: PropTypes.bool.isRequired,
  onDelete: PropTypes.func.isRequired,
  count: PropTypes.number.isRequired,
  onOpenList: PropTypes.func.isRequired,
  showTranslation: PropTypes.bool.isRequired,
  onToggleTranslation: PropTypes.func.isRequired,
};

export default Toolbar;
