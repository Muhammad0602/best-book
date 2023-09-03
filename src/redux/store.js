import { configureStore } from '@reduxjs/toolkit';
import chaptersReducer from './chapters/chaptersSlice';
import englishSlice from './english/englishSlice';

const store = configureStore({
  reducer: {
    chapters: chaptersReducer,
    english: englishSlice
  },
});

export default store;
