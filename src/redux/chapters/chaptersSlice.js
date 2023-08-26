import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';

export const initialState = {
  search: "",
  chapters: [],
  isLoading: false,
  error: '',
};

export const getChapters = createAsyncThunk('chapters/getChapters', async () => {
  try {
    const response = await axios.get('https://api.alquran.cloud/v1/quran/quran-uthmani');
    return response.data.data.surahs;
  } catch (error) {
    throw error.response.data.error;
  }
});

// export const getSurah = createAsyncThunk('surah/getSurah', async (number) => {
//   try {
//     const response = await axios.get(`https://api.alquran.cloud/v1/surah/${number}`);
//     return response.data.data;
//   } catch (error) {
//     throw error.response.data.error;
//   }
// });

export const chaptersSlice = createSlice({
  name: 'chapters',
  initialState,
  reducers: {
    setSearch: (state, action) => { state.search = action.payload }
  },
  extraReducers: (builder) => {
    builder
      .addCase(getChapters.pending, (state) => ({ ...state, isLoading: true }))
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
  },
});

export const { setSearch } = chaptersSlice.actions;

export default chaptersSlice.reducer;
