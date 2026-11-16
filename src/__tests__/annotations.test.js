import reducer, {
  initialState, ownerLoaded, changeApplied, undone, redone, remoteMerged, outboxFlushed,
} from '../redux/annotations/annotationsSlice';
import {
  eraseFromStroke, toPixels, toUnits, simplify, pathOf,
} from '../lib/geometry';

const highlight = (id, start, end) => ({
  id,
  surah: 2,
  ayah: 5,
  type: 'highlight',
  data: {
    text: 'ar', start, end, color: 'yellow',
  },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const signedIn = () => reducer(initialState, ownerLoaded({ ownerId: 'user-1', items: {}, outbox: {} }));

describe('annotations reducer', () => {
  it('keeps guest marks on the device without queueing them', () => {
    const state = reducer(initialState, changeApplied({ added: [highlight('a', 0, 2)] }));
    expect(Object.keys(state.items)).toEqual(['a']);
    expect(state.outbox).toEqual({});
  });

  it('queues additions and deletions for a signed-in user', () => {
    let state = reducer(signedIn(), changeApplied({ added: [highlight('a', 0, 2)] }));
    expect(state.outbox.a.op).toEqual('upsert');
    state = reducer(state, changeApplied({ removed: [highlight('a', 0, 2)] }));
    expect(state.items.a).toBeUndefined();
    expect(state.outbox.a.op).toEqual('delete');
  });

  it('removes one of two overlapping highlights and leaves the other', () => {
    let state = reducer(signedIn(), changeApplied({ added: [highlight('a', 0, 4)] }));
    state = reducer(state, changeApplied({ added: [highlight('b', 2, 6)] }));
    state = reducer(state, changeApplied({ removed: [state.items.a] }));
    expect(Object.keys(state.items)).toEqual(['b']);
    expect(state.items.b.data).toMatchObject({ start: 2, end: 6 });
  });

  it('undoes and redoes a change', () => {
    let state = reducer(signedIn(), changeApplied({ added: [highlight('a', 0, 2)] }));
    state = reducer(state, undone());
    expect(state.items.a).toBeUndefined();
    expect(state.outbox.a.op).toEqual('delete');
    state = reducer(state, redone());
    expect(state.items.a).toBeDefined();
    expect(state.outbox.a.op).toEqual('upsert');
  });

  it('does not bring back a deleted mark when the server still has it', () => {
    let state = reducer(signedIn(), remoteMerged([highlight('a', 0, 2), highlight('b', 3, 4)]));
    state = reducer(state, changeApplied({ removed: [state.items.a] }));
    state = reducer(state, remoteMerged([highlight('a', 0, 2), highlight('b', 3, 4)]));
    expect(Object.keys(state.items)).toEqual(['b']);
  });

  it('drops marks that were deleted on another device', () => {
    let state = reducer(signedIn(), remoteMerged([highlight('a', 0, 2), highlight('b', 3, 4)]));
    state = reducer(state, remoteMerged([highlight('b', 3, 4)]));
    expect(Object.keys(state.items)).toEqual(['b']);
  });

  it('keeps a queued change that was edited again while it was being sent', () => {
    let state = reducer(signedIn(), changeApplied({ added: [highlight('a', 0, 2)] }));
    const sent = state.outbox;
    state = reducer(state, changeApplied({ removed: [state.items.a] }));
    state = reducer(state, outboxFlushed(sent));
    expect(state.outbox.a.op).toEqual('delete');
  });
});

describe('drawing geometry', () => {
  it('keeps a mark beside its anchor word when the layout changes', () => {
    const phone = { cx: 100, cy: 50, unit: 20 };
    const desktop = { cx: 640, cy: 300, unit: 50 };
    const saved = toUnits([[90, 40], [110, 60]], phone);
    expect(saved).toEqual([[-0.5, -0.5], [0.5, 0.5]]);
    expect(toPixels(saved, desktop)).toEqual([[615, 275], [665, 325]]);
  });

  it('erases only the touched part of a line', () => {
    const pieces = eraseFromStroke([[0, 0], [100, 0]], [50, 0], 10);
    expect(pieces).toHaveLength(2);
    expect(pieces[0][pieces[0].length - 1][0]).toBeLessThan(40);
    expect(pieces[1][0][0]).toBeGreaterThan(60);
  });

  it('leaves a line alone when the eraser is far away', () => {
    expect(eraseFromStroke([[0, 0], [100, 0]], [50, 40], 10)).toBeNull();
  });

  it('simplifies straight runs and still draws a path', () => {
    const line = simplify([[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], 0.5);
    expect(line).toEqual([[0, 0], [4, 0]]);
    expect(pathOf(line)).toEqual('M0 0L4 0');
  });
});
