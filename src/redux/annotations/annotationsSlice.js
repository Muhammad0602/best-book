import { createSlice } from '@reduxjs/toolkit';

/*
  An annotation is a plain object:
    { id, surah, ayah, type, data, createdAt, updatedAt }

  type 'highlight' -> data: { text: 'ar' | 'en', edition, start, end, color }
    start/end are word indexes inside the ayah (inclusive).

  type 'drawing' -> data: { anchor: { text, word }, edition, strokes, color, width }
    Every point is stored relative to the centre of the anchor word and
    measured in "word heights", so a mark keeps its place next to the same
    word on any screen size.

  `outbox` holds the ids that still have to be sent to the server.
*/

export const GUEST = 'guest';

export const initialState = {
  ownerId: GUEST,
  items: {},
  outbox: {},
  seq: 0,
  undo: [],
  redo: [],
  sync: 'local',
};

const HISTORY_LIMIT = 100;

const applyChange = (state, { removed = [], added = [] }) => {
  const track = state.ownerId !== GUEST;
  removed.forEach((annotation) => {
    delete state.items[annotation.id];
    if (track) {
      state.seq += 1;
      state.outbox[annotation.id] = { op: 'delete', seq: state.seq };
    }
  });
  added.forEach((annotation) => {
    state.items[annotation.id] = annotation;
    if (track) {
      state.seq += 1;
      state.outbox[annotation.id] = { op: 'upsert', seq: state.seq };
    }
  });
};

export const annotationsSlice = createSlice({
  name: 'annotations',
  initialState,
  reducers: {
    // Replace everything with the data of another owner (login / logout).
    ownerLoaded: (state, action) => {
      const { ownerId, items, outbox } = action.payload;
      state.ownerId = ownerId;
      state.items = items || {};
      state.outbox = outbox || {};
      state.undo = [];
      state.redo = [];
      state.sync = ownerId === GUEST ? 'local' : 'idle';
    },
    // A user edit: { removed: [annotations], added: [annotations] }.
    changeApplied: (state, action) => {
      applyChange(state, action.payload);
      state.undo.push(action.payload);
      if (state.undo.length > HISTORY_LIMIT) state.undo.shift();
      state.redo = [];
    },
    undone: (state) => {
      const change = state.undo.pop();
      if (!change) return;
      applyChange(state, { removed: change.added, added: change.removed });
      state.redo.push(change);
    },
    redone: (state) => {
      const change = state.redo.pop();
      if (!change) return;
      applyChange(state, change);
      state.undo.push(change);
    },
    historyCleared: (state) => {
      state.undo = [];
      state.redo = [];
    },
    // Marks rewritten for a new edition of the text: not a user edit, so
    // there is nothing to undo.
    migrated: (state, action) => {
      applyChange(state, { added: action.payload });
      state.undo = [];
      state.redo = [];
    },
    // Annotations fetched from the server. Local edits that are still
    // waiting in the outbox win over what the server has.
    remoteMerged: (state, action) => {
      const next = {};
      action.payload.forEach((annotation) => {
        if (!state.outbox[annotation.id]) next[annotation.id] = annotation;
      });
      Object.keys(state.outbox).forEach((id) => {
        if (state.outbox[id].op === 'upsert' && state.items[id]) next[id] = state.items[id];
      });
      state.items = next;
    },
    // The server accepted these outbox entries.
    outboxFlushed: (state, action) => {
      Object.keys(action.payload).forEach((id) => {
        if (state.outbox[id] && state.outbox[id].seq === action.payload[id].seq) {
          delete state.outbox[id];
        }
      });
    },
    syncStatusSet: (state, action) => { state.sync = action.payload; },
  },
});

export const {
  ownerLoaded, changeApplied, undone, redone, historyCleared, migrated,
  remoteMerged, outboxFlushed, syncStatusSet,
} = annotationsSlice.actions;

export default annotationsSlice.reducer;
