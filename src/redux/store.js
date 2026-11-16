import { configureStore } from '@reduxjs/toolkit';
import chaptersReducer from './chapters/chaptersSlice';
import annotationsReducer from './annotations/annotationsSlice';
import authReducer from './auth/authSlice';

const store = configureStore({
  reducer: {
    chapters: chaptersReducer,
    annotations: annotationsReducer,
    auth: authReducer,
  },
});

export default store;
