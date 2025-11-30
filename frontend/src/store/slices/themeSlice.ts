import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { createTheme } from '@mantine/core';

// Community theme - Turtle & Jungle inspired (earthy greens and teals)
const communityTheme = createTheme({
  primaryColor: 'teal',
  colors: {
    // Turtle Shell & Ocean - primary teal/cyan palette
    teal: [
      '#e6fcf5', // Lightest - sea foam
      '#c3fae8', // Very light teal
      '#96f2d7', // Light aqua
      '#63e6be', // Bright teal
      '#3bc9a8', // Medium teal - turtle shell highlight
      '#20c997', // Primary - ocean water
      '#12b886', // Darker ocean
      '#0ca678', // Deep sea teal
      '#099268', // Very deep teal
      '#087f5b', // Darkest - deep ocean
    ],
    // Jungle Foliage - secondary green palette
    green: [
      '#ebfbee', // Lightest - morning mist
      '#d3f9d8', // Very light green
      '#b2f2bb', // Light leaf
      '#8ce99a', // Bright foliage
      '#69db7c', // Medium jungle green
      '#51cf66', // Vibrant green
      '#40c057', // Deep leaf
      '#37b24d', // Forest green
      '#2f9e44', // Deep jungle
      '#2b8a3e', // Darkest jungle
    ],
    // Earth Tones - accent palette for sand, shells
    brown: [
      '#faf4ed', // Lightest - beach sand
      '#f4e4d7', // Very light sand
      '#e7d2c0', // Light brown
      '#d4b5a0', // Sandy beach
      '#c19a7b', // Medium sand
      '#a67c52', // Beach driftwood
      '#8b5e34', // Dark sand
      '#704822', // Deep brown
      '#5a3a1a', // Very dark brown
      '#3d2813', // Darkest - soil
    ],
  },
  defaultRadius: 'md',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
});

// Admin theme - Sunset & Warning inspired (warm oranges and corals)
const adminTheme = createTheme({
  primaryColor: 'orange',
  colors: {
    // Sunset & Alert - primary orange palette
    orange: [
      '#fff4e6', // Lightest - dawn
      '#ffe8cc', // Very light orange
      '#ffd8a8', // Light coral
      '#ffc078', // Bright sunset
      '#ffa94d', // Medium orange
      '#ff922b', // Primary - sunset orange
      '#fd7e14', // Bright alert
      '#f76707', // Deep orange
      '#e8590c', // Dark alert
      '#d9480f', // Darkest orange
    ],
    // Complementary red for critical alerts
    red: [
      '#fff5f5',
      '#ffe3e3',
      '#ffc9c9',
      '#ffa8a8',
      '#ff8787',
      '#ff6b6b',
      '#fa5252',
      '#f03e3e',
      '#e03131',
      '#c92a2a',
    ],
  },
  defaultRadius: 'md',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
});

interface ThemeState {
  themeType: 'community' | 'admin';
}

const initialState: ThemeState = {
  themeType: 'community',
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setThemeType: (state, action: PayloadAction<'community' | 'admin'>) => {
      state.themeType = action.payload;
    },
  },
});

export const { setThemeType } = themeSlice.actions;
export { communityTheme, adminTheme };
export default themeSlice.reducer;