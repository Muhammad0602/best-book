import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';

const API = 'https://api.alquran.cloud/v1';
// The Arabic text ships with the app (src/data/quran), in the King Fahd
// Complex encoding that matches the UthmanicHafs font.
export const ARABIC_EDITION = 'qpc-hafs';
export const TRANSLATION_EDITION = 'en.asad';

export const initialState = {
  search: '',
  chapters: [],
  surahs: {},
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

// The list of the 114 surahs (names only), a small request.
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

// One surah: the Arabic text comes with the app, the English translation is
// downloaded. Without a connection the surah still opens, Arabic only.
export const getSurah = createAsyncThunk(
  'chapters/getSurah',
  async (number, { rejectWithValue }) => {
    let arabic;
    try {
      arabic = (await import(`../../data/quran/${number}.json`)).default;
    } catch (error) {
      return rejectWithValue(describeError(error));
    }
    let english = null;
    try {
      const response = await axios.get(`${API}/surah/${number}/${TRANSLATION_EDITION}`);
      english = response.data.data;
    } catch (error) {
      english = null;
    }
    return {
      number,
      name: english?.name,
      englishName: english?.englishName,
      englishNameTranslation: english?.englishNameTranslation,
      translationLoaded: Boolean(english),
      ayahs: arabic.map((text, index) => ({
        numberInSurah: index + 1,
        text,
        translation: english?.ayahs[index]?.text || '',
      })),
    };
  },
  {
    condition: (number, { getState }) => {
      const surah = getState().chapters.surahs[number];
      return !surah || !surah.translationLoaded;
    },
  },
);

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
      }));
  },
});

export const { setSearch } = chaptersSlice.actions;

export default chaptersSlice.reducer;
