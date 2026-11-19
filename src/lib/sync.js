import supabase from './supabase';
import {
  GUEST, ownerLoaded, remoteMerged, outboxFlushed, syncStatusSet,
} from '../redux/annotations/annotationsSlice';
import { userSet, recoverySet } from '../redux/auth/authSlice';
import { mergeAccountSettings } from './settingsSync';

/*
  Local-first storage for annotations.

  - Every change is written to this device straight away (localStorage).
  - When somebody is signed in, changes are queued in an "outbox" and sent
    to Supabase in the background. If the device is offline the queue simply
    waits and is sent when the connection comes back.
*/

const KEY = 'bestbook.annotations.';
const TABLE = 'annotations';
const PAGE = 1000;

let store = null;
let persistTimer = null;
let flushTimer = null;
let retryTimer = null;
let flushing = false;
let flushAgain = false;

const readLocal = (ownerId) => {
  try {
    const raw = window.localStorage.getItem(KEY + ownerId);
    const parsed = raw ? JSON.parse(raw) : null;
    return { items: parsed?.items || {}, outbox: parsed?.outbox || {} };
  } catch (error) {
    return { items: {}, outbox: {} };
  }
};

const writeLocal = (ownerId, data) => {
  try {
    window.localStorage.setItem(KEY + ownerId, JSON.stringify(data));
  } catch (error) {
    // Storage full or blocked: the data still lives in memory and, for
    // signed-in users, on the server.
  }
};

const removeLocal = (ownerId) => {
  try {
    window.localStorage.removeItem(KEY + ownerId);
  } catch (error) {
    // nothing to do
  }
};

const persistNow = () => {
  clearTimeout(persistTimer);
  const { ownerId, items, outbox } = store.getState().annotations;
  writeLocal(ownerId, { items, outbox });
};

const toRow = (annotation, userId) => ({
  id: annotation.id,
  user_id: userId,
  surah_number: annotation.surah,
  ayah_number: annotation.ayah,
  type: annotation.type,
  data: annotation.data,
  created_at: annotation.createdAt,
  updated_at: annotation.updatedAt,
});

const fromRow = (row) => ({
  id: row.id,
  surah: row.surah_number,
  ayah: row.ayah_number,
  type: row.type,
  data: row.data,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const chunk = (list, size) => {
  const chunks = [];
  for (let i = 0; i < list.length; i += size) chunks.push(list.slice(i, i + size));
  return chunks;
};

const isOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false;

const setStatus = (status) => {
  if (store.getState().annotations.sync !== status) store.dispatch(syncStatusSet(status));
};

export const flush = async () => {
  clearTimeout(flushTimer);
  const { annotations, auth } = store.getState();
  if (!supabase || !auth.user || annotations.ownerId !== auth.user.id) {
    setStatus('local');
    return;
  }
  const ids = Object.keys(annotations.outbox);
  if (ids.length === 0) {
    if (annotations.sync !== 'idle') setStatus('saved');
    return;
  }
  if (!isOnline()) {
    setStatus('offline');
    return;
  }
  if (flushing) {
    flushAgain = true;
    return;
  }
  flushing = true;
  setStatus('saving');
  const snapshot = annotations.outbox;
  const upserts = ids
    .filter((id) => snapshot[id].op === 'upsert' && annotations.items[id])
    .map((id) => toRow(annotations.items[id], auth.user.id));
  const deletes = ids.filter((id) => snapshot[id].op === 'delete');
  try {
    const requests = [
      ...chunk(upserts, 200).map((rows) => supabase.from(TABLE).upsert(rows)),
      ...chunk(deletes, 100).map((list) => supabase.from(TABLE).delete().in('id', list)),
    ];
    const results = await Promise.all(requests);
    const failed = results.find((result) => result.error);
    if (failed) throw failed.error;
    if (store.getState().annotations.ownerId === auth.user.id) {
      store.dispatch(outboxFlushed(snapshot));
      persistNow();
      const left = Object.keys(store.getState().annotations.outbox).length;
      if (left === 0) setStatus('saved'); else flushAgain = true;
    }
  } catch (error) {
    setStatus(isOnline() ? 'error' : 'offline');
    clearTimeout(retryTimer);
    retryTimer = setTimeout(flush, 15000);
  } finally {
    flushing = false;
    if (flushAgain) {
      flushAgain = false;
      flush();
    }
  }
};

export const pull = async () => {
  const { auth } = store.getState();
  if (!supabase || !auth.user || !isOnline()) return;
  const userId = auth.user.id;
  try {
    const rows = [];
    for (let from = 0; ; from += PAGE) {
      // eslint-disable-next-line no-await-in-loop
      const { data, error } = await supabase.from(TABLE).select('*')
        .order('created_at').range(from, from + PAGE - 1);
      if (error) throw error;
      rows.push(...data);
      if (data.length < PAGE) break;
    }
    if (store.getState().annotations.ownerId === userId) {
      store.dispatch(remoteMerged(rows.map(fromRow)));
    }
  } catch (error) {
    // Keep showing what is saved on this device; we try again later.
  }
};

const switchOwner = (userId) => {
  persistNow();
  const previous = store.getState().annotations;
  if (userId) {
    // Marks made before signing in move into the account.
    const mine = readLocal(userId);
    const guest = previous.ownerId === GUEST ? previous : readLocal(GUEST);
    const outbox = { ...mine.outbox };
    Object.keys(guest.items).forEach((id, index) => {
      outbox[id] = { op: 'upsert', seq: -1 - index };
    });
    store.dispatch(ownerLoaded({
      ownerId: userId,
      items: { ...mine.items, ...guest.items },
      outbox,
    }));
    removeLocal(GUEST);
    persistNow();
    pull().then(flush);
  } else {
    // Signed out: do not leave private marks behind on this device, unless
    // some of them have not reached the server yet.
    if (previous.ownerId !== GUEST && Object.keys(previous.outbox).length === 0) {
      removeLocal(previous.ownerId);
    }
    store.dispatch(ownerLoaded({ ownerId: GUEST, ...readLocal(GUEST) }));
  }
};

const handleSession = (session) => {
  const current = store.getState().auth;
  const user = session?.user ? { id: session.user.id, email: session.user.email } : null;
  if (current.ready && (current.user?.id || null) === (user?.id || null)) return;
  store.dispatch(userSet(user));
  switchOwner(user ? user.id : null);
  if (user) mergeAccountSettings(session.user.user_metadata);
};

export const startSync = (appStore) => {
  store = appStore;
  store.dispatch(ownerLoaded({ ownerId: GUEST, ...readLocal(GUEST) }));

  let last = store.getState().annotations;
  store.subscribe(() => {
    const now = store.getState().annotations;
    if (now.items !== last.items || now.outbox !== last.outbox) {
      clearTimeout(persistTimer);
      persistTimer = setTimeout(persistNow, 250);
      if (now.outbox !== last.outbox && Object.keys(now.outbox).length > 0) {
        clearTimeout(flushTimer);
        flushTimer = setTimeout(flush, 600);
      }
    }
    last = now;
  });

  window.addEventListener('pagehide', persistNow);
  window.addEventListener('online', () => { flush().then(pull); });
  window.addEventListener('offline', () => {
    if (store.getState().auth.user) setStatus('offline');
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') flush().then(pull);
    else persistNow();
  });

  if (!supabase) {
    store.dispatch(userSet(null));
    return;
  }
  supabase.auth.getSession()
    .then(({ data }) => handleSession(data.session))
    .catch(() => handleSession(null));
  supabase.auth.onAuthStateChange((event, session) => {
    // Supabase asks not to call its API from inside this callback.
    setTimeout(() => {
      if (event === 'PASSWORD_RECOVERY') store.dispatch(recoverySet(true));
      handleSession(session);
    }, 0);
  });
};

const redirectTo = () => window.location.origin + window.location.pathname;

const run = async (request) => {
  if (!supabase) return 'Accounts are not set up for this copy of the app yet.';
  try {
    const { error } = await request();
    return error ? error.message : '';
  } catch (error) {
    return isOnline() ? error.message : 'You are offline. Please try again when you are connected.';
  }
};

// Each of these resolves to an error message, or '' when it worked.
export const signIn = (email, password) => run(
  () => supabase.auth.signInWithPassword({ email, password }),
);

export const signUp = (email, password) => run(
  () => supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo() } }),
);

export const sendPasswordReset = (email) => run(
  () => supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectTo() }),
);

export const updatePassword = async (password) => {
  const message = await run(() => supabase.auth.updateUser({ password }));
  if (!message) store.dispatch(recoverySet(false));
  return message;
};

export const signOut = async () => {
  await flush();
  persistNow();
  return run(() => supabase.auth.signOut());
};

export const accountsAvailable = Boolean(supabase);
