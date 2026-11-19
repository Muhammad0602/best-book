import { createSlice } from '@reduxjs/toolkit';

/*
  The reader's choices. Saved on the device, and in the account (Supabase
  user metadata) when somebody is signed in, so they follow the reader to
  every device. `updatedAt` decides which copy wins.
*/

export const SETTINGS_KEY = 'bestbook.settings';
export const SCALES = [0.85, 1, 1.15, 1.3, 1.5];

export const RECITERS = [
  { id: 'ar.alafasy', name: 'Mishary Rashid Alafasy' },
  { id: 'ar.husary', name: 'Mahmoud Khalil Al-Husary' },
  { id: 'ar.husarymujawwad', name: 'Al-Husary (Mujawwad)' },
  { id: 'ar.minshawi', name: 'Mohamed Siddiq Al-Minshawi' },
  { id: 'ar.mahermuaiqly', name: 'Maher Al-Muaiqly' },
  { id: 'ar.hudhaify', name: 'Ali Al-Hudhaify' },
  { id: 'ar.shaatree', name: 'Abu Bakr Ash-Shaatree' },
  { id: 'ar.ahmedajamy', name: 'Ahmed ibn Ali Al-Ajamy' },
  { id: 'ar.muhammadayyoub', name: 'Muhammad Ayyoub' },
  { id: 'ar.muhammadjibreel', name: 'Muhammad Jibreel' },
];

export const defaultSettings = {
  theme: 'auto', // 'auto' | 'light' | 'dark'
  scale: 1,
  showTranslation: false,
  translation: 'en.khattab',
  tafsir: 14,
  reciter: 'ar.alafasy',
  pageTurn: 'mushaf', // 'mushaf': swipe right for the next page; 'book': swipe left
  lastRead: null, // { surah, ayah }
  updatedAt: '',
};

const readJson = (key) => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch (error) {
    return undefined;
  }
};

// Only known keys with values of the right type are taken over.
export const cleanSettings = (input) => {
  const out = {};
  if (!input || typeof input !== 'object') return out;
  Object.keys(defaultSettings).forEach((key) => {
    const value = input[key];
    if (value === undefined) return;
    if (key === 'lastRead') {
      if (value === null || (Number.isInteger(value.surah) && Number.isInteger(value.ayah))) {
        out.lastRead = value && { surah: value.surah, ayah: value.ayah };
      }
      return;
    }
    if (typeof value === typeof defaultSettings[key]) out[key] = value;
  });
  if (out.scale !== undefined && !SCALES.includes(out.scale)) delete out.scale;
  if (out.theme && !['auto', 'light', 'dark'].includes(out.theme)) delete out.theme;
  if (out.pageTurn && !['mushaf', 'book'].includes(out.pageTurn)) delete out.pageTurn;
  if (out.reciter && !RECITERS.some((reciter) => reciter.id === out.reciter)) delete out.reciter;
  return out;
};

// Settings saved on this device, including those of earlier versions of the app.
const loadInitial = () => {
  if (typeof window === 'undefined') return defaultSettings;
  const saved = readJson(SETTINGS_KEY);
  if (saved) return { ...defaultSettings, ...cleanSettings(saved) };
  const old = {
    scale: readJson('bestbook.pref.textScale'),
    translation: readJson('bestbook.pref.translation'),
    tafsir: readJson('bestbook.pref.tafsir'),
    lastRead: readJson('bestbook.pref.lastRead'),
  };
  try {
    old.showTranslation = window.localStorage.getItem('bestbook.showTranslation') === '1';
  } catch (error) {
    // nothing saved
  }
  return { ...defaultSettings, ...cleanSettings(old) };
};

export const settingsSlice = createSlice({
  name: 'settings',
  initialState: loadInitial,
  reducers: {
    settingChanged: (state, action) => {
      const { key, value } = action.payload;
      state[key] = value;
      state.updatedAt = new Date().toISOString();
    },
    // From the account: replaces the local copy.
    settingsLoaded: (state, action) => ({ ...state, ...cleanSettings(action.payload) }),
  },
});

export const { settingChanged, settingsLoaded } = settingsSlice.actions;

export const setSetting = (key, value) => settingChanged({ key, value });

export default settingsSlice.reducer;
