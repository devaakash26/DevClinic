import { configureStore } from '@reduxjs/toolkit';
import userReducer from './userInfo';
import loaderReducer from './loader';

export const store = configureStore({
  reducer: {
    user: userReducer,
    loading: loaderReducer,
  },
});

export default store;
