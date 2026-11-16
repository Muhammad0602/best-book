import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';

const API = 'https://api.alquran.cloud/v1';
export const ARABIC_EDITION = 'quran-uthmani';
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

// One surah with its Arabic text and English translation.
export const getSurah = createAsyncThunk(
  'chapters/getSurah',
  async (number, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API}/surah/${number}/editions/${ARABIC_EDITION},${TRANSLATION_EDITION}`,
      );
      const [arabic, english] = response.data.data;
      return {
        number: arabic.number,
        name: arabic.name,
        englishName: arabic.englishName,
        englishNameTranslation: arabic.englishNameTranslation,
        ayahs: arabic.ayahs.map((ayah, index) => ({
          number: ayah.number,
          numberInSurah: ayah.numberInSurah,
          text: ayah.text,
          translation: english?.ayahs[index]?.text || '',
        })),
      };
    } catch (error) {
      return rejectWithValue(describeError(error));
    }
  },
  { condition: (number, { getState }) => !getState().chapters.surahs[number] },
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
