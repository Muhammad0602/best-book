import supabase from './supabase';
import { SETTINGS_KEY, settingsLoaded } from '../redux/settings/settingsSlice';

/*
  Keeps the reader's settings on the device, applies the colour theme, and,
  for signed-in readers, copies the settings into the account (Supabase user
  metadata, which every user may change for themselves) so they follow the
  reader to other devices.
*/

const META_KEY = 'bestbook_settings';
const THEME_COLORS = { light: '#0f5c44', dark: '#0b2a20' };

let store = null;
let saveTimer = null;
let pushTimer = null;
let applyingRemote = false;
let lastTheme = '';

const darkQuery = typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null;

const applyTheme = () => {
  const { theme } = store.getState().settings;
  let resolved = theme;
  if (theme === 'auto') resolved = darkQuery && darkQuery.matches ? 'dark' : 'light';
  if (resolved === lastTheme) return;
  lastTheme = resolved;
  document.documentElement.dataset.theme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLORS[resolved]);
};

const saveLocal = () => {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(store.getState().settings));
  } catch (error) {
    // Storage full or blocked: the settings still apply until the app is closed.
  }
};

const push = async () => {
  const { auth, settings } = store.getState();
  if (!supabase || !auth.user || !settings.updatedAt) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  try {
    await supabase.auth.updateUser({ data: { [META_KEY]: settings } });
  } catch (error) {
    // Sent again with the next change.
  }
};

// After signing in: the newer of the two copies wins.
export const mergeAccountSettings = (metadata) => {
  if (!store) return;
  const remote = metadata && metadata[META_KEY];
  const local = store.getState().settings;
  if (remote && remote.updatedAt && remote.updatedAt > (local.updatedAt || '')) {
    applyingRemote = true;
    store.dispatch(settingsLoaded(remote));
    applyingRemote = false;
  } else if (local.updatedAt) {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(push, 1000);
  }
};

export const startSettings = (appStore) => {
  store = appStore;
  applyTheme();
  let last = store.getState().settings;
  store.subscribe(() => {
    const now = store.getState().settings;
    if (now === last) return;
    last = now;
    applyTheme();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveLocal, 300);
    if (!applyingRemote) {
      clearTimeout(pushTimer);
      pushTimer = setTimeout(push, 4000);
    }
  });
  if (darkQuery) {
    const onChange = () => applyTheme();
    if (darkQuery.addEventListener) darkQuery.addEventListener('change', onChange);
    else if (darkQuery.addListener) darkQuery.addListener(onChange);
  }
  window.addEventListener('pagehide', saveLocal);
};
