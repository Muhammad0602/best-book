import { configureStore } from '@reduxjs/toolkit';
import chaptersReducer from './chapters/chaptersSlice';

const store = configureStore({
  reducer: {
    chapters: chaptersReducer,
  },
});

export default store;
