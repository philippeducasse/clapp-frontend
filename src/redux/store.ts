import { configureStore } from "@reduxjs/toolkit";
import rootReducer, { RootState } from "./reducers";

export const store = configureStore({
  reducer: rootReducer,
  devTools: process.env.NODE_ENV !== "production",
});

// store.subscribe(() => {
// });

export type AppStore = typeof store;
export type AppDispatch = typeof store.dispatch;

export type { RootState };
