import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    // Sau này bạn thêm các reducer khác vào đây (ví dụ: product, cart...)
  },
});
