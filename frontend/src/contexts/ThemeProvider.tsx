import { type ReactNode } from 'react';
import { MantineProvider, createTheme } from '@mantine/core';
import { useUser } from '../hooks/useUser';

// Community theme (blue-based)
const communityTheme = createTheme({
  primaryColor: 'blue',
  colors: {
    blue: [
      '#e7f5ff',
      '#d0ebff',
      '#a5d8ff',
      '#74c0fc',
      '#4dabf7',
      '#339af0',
      '#228be6',
      '#1c7ed6',
      '#1971c2',
      '#1864ab',
    ],
  },
});

// Admin theme (red-based)
const adminTheme = createTheme({
  primaryColor: 'red',
  colors: {
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
});

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { role } = useUser();
  const currentTheme = role === 'admin' ? adminTheme : communityTheme;

  return <MantineProvider theme={currentTheme}>{children}</MantineProvider>;
}
