import { SURAHS } from './quran';
import { reciterOf } from '../redux/settings/settingsSlice';
import { fetchTafsirSurah, fetchWholeTranslation } from './sources';
import {
  fetchWithRetry, forgetJson, getDownloads, keepStorage, offlineKey, openCache, putJson,
  setJob, surahAudioUrls, updateRecord,
} from './offline';

/*
  Downloading for offline use, one item at a time per kind: a surah (or all
  surahs) of one reciter, a whole translation, a whole tafsir. Progress is
  shown through `useDownloads`; a job can be cancelled, and what was already
  saved is kept so it continues from there next time.
*/

const cancelled = new Set();

export const audioJobKey = (reciter, surah) => `audio:${reciter}:${surah || 'all'}`;
export const translationJobKey = (edition) => `translation:${edition}`;
export const tafsirJobKey = (tafsirId) => `tafsir:${tafsirId}`;

export const cancelDownload = (key) => { cancelled.add(key); };

class Cancelled extends Error {}

// Runs `worker` over `items`, a few at a time.
const pool = async (items, limit, key, worker) => {
  let next = 0;
  const run = async () => {
    while (next < items.length) {
      if (cancelled.has(key)) throw new Cancelled();
      const item = items[next];
      next += 1;
      // eslint-disable-next-line no-await-in-loop
      await worker(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
};

const runJob = async (key, total, body) => {
  if (getDownloads().jobs[key] && !getDownloads().jobs[key].error) return;
  cancelled.delete(key);
  keepStorage();
  let done = 0;
  setJob(key, { done, total, error: null });
  const step = () => {
    done += 1;
    setJob(key, { done, total, error: null });
  };
  try {
    await body(step);
    setJob(key, null);
  } catch (error) {
    if (error instanceof Cancelled) setJob(key, null);
    else setJob(key, { done, total, error: 'Download stopped. Check your connection and try again.' });
  } finally {
    cancelled.delete(key);
  }
};

const markSurah = (reciter, surah) => updateRecord((record) => ({
  ...record,
  audio: { ...record.audio, [reciter]: { ...(record.audio[reciter] || {}), [surah]: true } },
}));

const saveSurahAudio = async (cache, reciter, surah, key, step) => {
  const urls = surahAudioUrls(reciter, surah, SURAHS[surah - 1].numberOfAyahs);
  await pool(urls, 4, key, async (url) => {
    if (!(await cache.match(url))) {
      const response = await fetchWithRetry(url, { tries: 4 });
      await cache.put(url, response);
    }
    step();
  });
  markSurah(reciter, surah);
};

// One surah of one reciter, or every surah when `surah` is omitted.
export const downloadAudio = (reciter, surah) => {
  const key = audioJobKey(reciter, surah);
  const surahs = surah ? [surah] : SURAHS.map((item) => item.number);
  const whole = Boolean(reciterOf(reciter).surahAudio);
  const files = (number) => (whole ? 1 : SURAHS[number - 1].numberOfAyahs);
  const total = surahs.reduce((sum, number) => sum + files(number), 0);
  return runJob(key, total, async (step) => {
    const cache = await openCache();
    // eslint-disable-next-line no-restricted-syntax
    for (const number of surahs) {
      if (cancelled.has(key)) throw new Cancelled();
      // eslint-disable-next-line no-await-in-loop
      await saveSurahAudio(cache, reciter, number, key, step);
    }
  });
};

export const deleteAudio = async (reciter, surah) => {
  const cache = await openCache();
  const surahs = surah ? [surah] : SURAHS.map((item) => item.number);
  await Promise.all(surahs.flatMap((number) => surahAudioUrls(
    reciter,
    number,
    SURAHS[number - 1].numberOfAyahs,
  ).map((url) => cache.delete(url))));
  updateRecord((record) => {
    const kept = { ...(record.audio[reciter] || {}) };
    surahs.forEach((number) => { delete kept[number]; });
    const audio = { ...record.audio, [reciter]: kept };
    if (Object.keys(kept).length === 0) delete audio[reciter];
    return { ...record, audio };
  });
};

export const downloadTranslation = (edition) => runJob(
  translationJobKey(edition),
  1,
  async (step) => {
    const whole = await fetchWholeTranslation(edition);
    if (cancelled.has(translationJobKey(edition))) throw new Cancelled();
    await putJson(`translation/${edition}.json`, whole);
    forgetJson(`translation/${edition}`);
    step();
    updateRecord((record) => ({
      ...record,
      translation: { ...record.translation, [edition]: true },
    }));
  },
);

export const deleteTranslation = async (edition) => {
  const cache = await openCache();
  await cache.delete(offlineKey(`translation/${edition}.json`));
  forgetJson(`translation/${edition}`);
  updateRecord((record) => {
    const translation = { ...record.translation };
    delete translation[edition];
    return { ...record, translation };
  });
};

// Surahs already saved are skipped, so a stopped download continues.
export const downloadTafsir = (tafsirId) => {
  const key = tafsirJobKey(tafsirId);
  return runJob(key, SURAHS.length, async (step) => {
    const cache = await openCache();
    await pool(SURAHS.map((item) => item.number), 3, key, async (surah) => {
      const path = `tafsir/${tafsirId}/${surah}.json`;
      if (!(await cache.match(offlineKey(path)))) {
        let data;
        for (let attempt = 0; ; attempt += 1) {
          try {
            // eslint-disable-next-line no-await-in-loop
            data = await fetchTafsirSurah(tafsirId, surah);
            break;
          } catch (error) {
            if (attempt >= 2) throw error;
            // eslint-disable-next-line no-await-in-loop
            await new Promise((resolve) => { setTimeout(resolve, 1000 * (attempt + 1)); });
          }
        }
        await putJson(path, data);
      }
      step();
    });
    forgetJson(`tafsir/${tafsirId}/`);
    updateRecord((record) => ({ ...record, tafsir: { ...record.tafsir, [tafsirId]: true } }));
  });
};

export const deleteTafsir = async (tafsirId) => {
  const cache = await openCache();
  await Promise.all(SURAHS.map((item) => cache.delete(
    offlineKey(`tafsir/${tafsirId}/${item.number}.json`),
  )));
  forgetJson(`tafsir/${tafsirId}/`);
  updateRecord((record) => {
    const tafsir = { ...record.tafsir };
    delete tafsir[tafsirId];
    return { ...record, tafsir };
  });
};
