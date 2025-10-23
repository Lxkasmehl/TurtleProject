import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import './index.css';
import App from './App.tsx';

const rootElement: HTMLElement = document.getElementById('root')!;

createRoot(rootElement).render(
  <StrictMode>
    <MantineProvider>
      <App />
    </MantineProvider>
  </StrictMode>
);
