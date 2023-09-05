import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';

export const initialState = {
  english: [],
  isLoading: false,
  error: '',
};

export const getEnglish = createAsyncThunk('english/getEnglish', async () => {
  try {
    const response = await axios.get('https://api.alquran.cloud/v1/quran/en.asad');
    return response.data.data.surahs;
  } catch (error) {
    throw error.response.data.error;
  }
});

export const englishSlice = createSlice({
  name: 'english',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getEnglish.pending, (state) => ({ ...state, isLoading: true }))
      .addCase(getEnglish.fulfilled, (state, action) => ({
        ...state,
        isLoading: false,
        english: action.payload,
      }))
      .addCase(getEnglish.rejected, (state, action) => ({
        ...state,
        isLoading: false,
        error: action.payload,
      }));
  },
});

export default englishSlice.reducer;
