import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';
import surahList from '../../data/surahs.json';
import { loadTranslation } from '../../lib/sources';

const API = 'https://api.alquran.cloud/v1';
// The Arabic text ships with the app (src/data/quran), in the King Fahd
// Complex encoding that matches the UthmanicHafs font.
export const ARABIC_EDITION = 'qpc-hafs';

export const initialState = {
  search: '',
  // Names of the 114 surahs: bundled, so the list never needs the network.
  chapters: surahList,
  surahs: {},
  // "<edition>:<surah>" -> { status: 'loading' | 'ready' | 'error', texts }
  translations: {},
  isLoading: false,
  surahLoading: false,
  error: '',
  surahError: '',
};

const describeError = (error) => (
  error?.response?.data?.data
  || error?.response?.data?.error
  || (typeof navigator !== 'undefined' && navigator.onLine === false
    ? 'You are offline and this content has not been saved on this device yet.'
    : error?.message)
  || 'Unknown error'
);

export const translationKey = (edition, surah) => `${edition}:${surah}`;

// The list of the 114 surahs (names only). Only used if the bundled list is missing.
export const getChapters = createAsyncThunk(
  'chapters/getChapters',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API}/surah`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(describeError(error));
    }
  },
  { condition: (_, { getState }) => getState().chapters.chapters.length === 0 },
);

// The Arabic text of one surah; it comes with the app.
export const getSurah = createAsyncThunk(
  'chapters/getSurah',
  async (number, { rejectWithValue }) => {
    if (!Number.isInteger(number) || number < 1 || number > surahList.length) {
      return rejectWithValue('There is no surah with that number.');
    }
    try {
      const arabic = (await import(`../../data/quran/${number}.json`)).default;
      return {
        number,
        ayahs: arabic.map((text, index) => ({ numberInSurah: index + 1, text })),
      };
    } catch (error) {
      return rejectWithValue(describeError(error));
    }
  },
  { condition: (number, { getState }) => !getState().chapters.surahs[number] },
);

// One translation of one surah, downloaded when the reader asks for it.
export const getTranslation = createAsyncThunk(
  'chapters/getTranslation',
  async ({ edition, surah }, { rejectWithValue }) => {
    try {
      return await loadTranslation(edition, surah);
    } catch (error) {
      return rejectWithValue(describeError(error));
    }
  },
  {
    condition: ({ edition, surah }, { getState }) => {
      const entry = getState().chapters.translations[translationKey(edition, surah)];
      return !entry || entry.status === 'error';
    },
  },
);

const keyOf = (action) => translationKey(action.meta.arg.edition, action.meta.arg.surah);

export const chaptersSlice = createSlice({
  name: 'chapters',
  initialState,
  reducers: {
    setSearch: (state, action) => { state.search = action.payload; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getChapters.pending, (state) => ({ ...state, isLoading: true, error: '' }))
      .addCase(getChapters.fulfilled, (state, action) => ({
        ...state,
        isLoading: false,
        chapters: action.payload,
      }))
      .addCase(getChapters.rejected, (state, action) => ({
        ...state,
        isLoading: false,
        error: action.payload,
      }))
      .addCase(getSurah.pending, (state) => ({ ...state, surahLoading: true, surahError: '' }))
      .addCase(getSurah.fulfilled, (state, action) => ({
        ...state,
        surahLoading: false,
        surahs: { ...state.surahs, [action.payload.number]: action.payload },
      }))
      .addCase(getSurah.rejected, (state, action) => ({
        ...state,
        surahLoading: false,
        surahError: action.payload,
      }))
      .addCase(getTranslation.pending, (state, action) => {
        state.translations[keyOf(action)] = { status: 'loading', texts: [] };
      })
      .addCase(getTranslation.fulfilled, (state, action) => {
        state.translations[keyOf(action)] = { status: 'ready', texts: action.payload };
      })
      .addCase(getTranslation.rejected, (state, action) => {
        state.translations[keyOf(action)] = { status: 'error', texts: [], error: action.payload };
      });
  },
});

export const { setSearch } = chaptersSlice.actions;

export default chaptersSlice.reducer;
