import { createSlice } from '@reduxjs/toolkit';

export const initialState = {
  user: null, // { id, email }
  ready: false, // true once we know whether somebody is signed in
  recovery: false, // true while the user is setting a new password
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    userSet: (state, action) => {
      state.user = action.payload;
      state.ready = true;
    },
    recoverySet: (state, action) => { state.recovery = action.payload; },
  },
});

export const { userSet, recoverySet } = authSlice.actions;

export default authSlice.reducer;
