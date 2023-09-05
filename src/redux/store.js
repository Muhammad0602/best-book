import { configureStore } from '@reduxjs/toolkit';
import chaptersReducer from './chapters/chaptersSlice';
import englishReducer from './english/englishSlice';

const store = configureStore({
  reducer: {
    chapters: chaptersReducer,
    english: englishReducer,
  },
});

export default store;
