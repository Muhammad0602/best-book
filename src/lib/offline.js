import { useSyncExternalStore } from 'react';
import { reciterOf } from '../redux/settings/settingsSlice';

/*
  What the reader has downloaded for offline use: recitations, translations
  and tafsirs. The files are kept in their own cache (Cache Storage), which
  the browser does not clear by itself like the ordinary one; a small record
  in localStorage says what is complete.
*/

export const CACHE = 'bestbook-downloads';
const RECORD_KEY = 'bestbook.downloads';
// Keys for the texts we store ourselves (never fetched from this address).
const OFFLINE = 'https://offline.bestbook/';

export const cacheAvailable = typeof caches !== 'undefined';

// ---------- the record and the jobs in progress ----------

const emptyRecord = () => ({ audio: {}, translation: {}, tafsir: {} });

const loadRecord = () => {
  try {
    const saved = JSON.parse(window.localStorage.getItem(RECORD_KEY));
    if (saved && typeof saved === 'object') return { ...emptyRecord(), ...saved };
  } catch (error) {
    // nothing saved
  }
  return emptyRecord();
};

let state = { record: typeof window === 'undefined' ? emptyRecord() : loadRecord(), jobs: {} };
const listeners = new Set();

const emit = (next) => {
  state = next;
  listeners.forEach((listener) => listener());
};

export const getDownloads = () => state;

export const updateRecord = (change) => {
  const record = change(state.record);
  try {
    window.localStorage.setItem(RECORD_KEY, JSON.stringify(record));
  } catch (error) {
    // Storage full or blocked: the files are still in the cache.
  }
  emit({ ...state, record });
};

// A job: { done, total, error }. `null` removes it.
export const setJob = (key, job) => {
  const jobs = { ...state.jobs };
  if (job) jobs[key] = job;
  else delete jobs[key];
  emit({ ...state, jobs });
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useDownloads = () => useSyncExternalStore(subscribe, getDownloads, getDownloads);

// ---------- cache helpers ----------

export const openCache = () => caches.open(CACHE);

export const offlineKey = (path) => `${OFFLINE}${path}`;

export const putJson = async (path, value) => {
  const cache = await openCache();
  await cache.put(offlineKey(path), new Response(JSON.stringify(value), {
    headers: { 'Content-Type': 'application/json' },
  }));
};

const jsonMemo = new Map();

export const readJson = async (path) => {
  if (!cacheAvailable) return undefined;
  if (jsonMemo.has(path)) return jsonMemo.get(path);
  const cache = await openCache();
  const response = await cache.match(offlineKey(path));
  if (!response) return undefined;
  const value = await response.json();
  jsonMemo.set(path, value);
  if (jsonMemo.size > 30) jsonMemo.delete(jsonMemo.keys().next().value);
  return value;
};

export const forgetJson = (prefix) => {
  Array.from(jsonMemo.keys()).forEach((key) => {
    if (key.startsWith(prefix)) jsonMemo.delete(key);
  });
};

// ---------- reading downloaded texts ----------

// One list of ayah texts per surah, or undefined when not downloaded.
export const offlineTranslation = async (edition) => {
  if (!state.record.translation[edition]) return undefined;
  try {
    return await readJson(`translation/${edition}.json`);
  } catch (error) {
    return undefined;
  }
};

// { [ayah]: text } for one surah of one tafsir, or undefined.
export const offlineTafsir = async (tafsirId, surah) => {
  if (!state.record.tafsir[tafsirId]) return undefined;
  try {
    return await readJson(`tafsir/${tafsirId}/${surah}.json`);
  } catch (error) {
    return undefined;
  }
};

// ---------- recitation ----------

const EVERYAYAH = 'https://everyayah.com/data';
const pad = (number) => String(number).padStart(3, '0');

// The file for one ayah, or for the whole surah when the reciter has no others.
export const audioUrl = (reciterId, surah, ayah) => {
  const reciter = reciterOf(reciterId);
  if (reciter.surahAudio) return `${reciter.surahAudio}${pad(surah)}.mp3`;
  return `${EVERYAYAH}/${reciter.folder}/${pad(surah)}${pad(ayah)}.mp3`;
};

export const surahAudioUrls = (reciterId, surah, count) => {
  if (reciterOf(reciterId).surahAudio) return [audioUrl(reciterId, surah, 1)];
  return Array.from({ length: count }, (_, index) => audioUrl(reciterId, surah, index + 1));
};

export const fetchWithRetry = async (url, { tries = 3, timeout = 0 } = {}) => {
  let lastError;
  for (let attempt = 0; attempt < tries; attempt += 1) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = timeout && controller ? setTimeout(() => controller.abort(), timeout) : null;
    try {
      // eslint-disable-next-line no-await-in-loop
      const response = await fetch(url, controller ? { signal: controller.signal } : undefined);
      if (timer) clearTimeout(timer);
      if (response.ok) return response;
      if (response.status === 404) throw Object.assign(new Error('Not found'), { notFound: true });
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (timer) clearTimeout(timer);
      if (error.notFound) throw error;
      lastError = error;
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => { setTimeout(resolve, 800 * (attempt + 1)); });
  }
  throw lastError;
};

const fromCache = async (url) => {
  if (!cacheAvailable) return null;
  try {
    const cache = await openCache();
    const response = await cache.match(url);
    if (!response) return null;
    return URL.createObjectURL(await response.blob());
  } catch (error) {
    return null;
  }
};

// The next few ayahs, loaded while the current one plays, so a weak
// connection does not stop the recitation between ayahs.
const ahead = new Map(); // url -> Promise<blob url | null>

export const prefetchAudio = (url) => {
  if (ahead.has(url)) return;
  const promise = fromCache(url)
    .then((cached) => cached || fetchWithRetry(url, { tries: 3, timeout: 45000 })
      .then((response) => response.blob())
      .then((blob) => URL.createObjectURL(blob)))
    .catch(() => null);
  ahead.set(url, promise);
  while (ahead.size > 6) {
    const [oldest, old] = ahead.entries().next().value;
    ahead.delete(oldest);
    old.then((blobUrl) => blobUrl && URL.revokeObjectURL(blobUrl));
  }
};

// What the audio element should play: the downloaded file, the copy loaded
// ahead, or else the address itself (streamed). A `blob:` result belongs to
// the caller, who revokes it when done.
export const playableUrl = async (url) => {
  const cached = await fromCache(url);
  if (cached) return cached;
  if (ahead.has(url)) {
    const promise = ahead.get(url);
    ahead.delete(url);
    const loaded = await promise;
    if (loaded) return loaded;
  }
  return url;
};

export const isAudioDownloaded = (record, reciterId, surah) => Boolean(
  record.audio[reciterId] && record.audio[reciterId][surah],
);

// Asks the browser to keep the downloads even when the device runs low on space.
export const keepStorage = () => {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
  }
};
