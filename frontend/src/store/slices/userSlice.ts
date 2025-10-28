import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { type UserRole } from '../../types/User';

interface UserState {
  role: UserRole;
  isLoggedIn: boolean;
}

const initialState: UserState = {
  role: 'community',
  isLoggedIn: false,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setRole: (state, action: PayloadAction<UserRole>) => {
      state.role = action.payload;
    },
    setIsLoggedIn: (state, action: PayloadAction<boolean>) => {
      state.isLoggedIn = action.payload;
    },
    login: (state, action: PayloadAction<UserRole>) => {
      state.isLoggedIn = true;
      state.role = action.payload;
    },
    logout: (state) => {
      state.isLoggedIn = false;
      state.role = 'community';
    },
  },
});

export const { setRole, setIsLoggedIn, login, logout } = userSlice.actions;
export default userSlice.reducer;
