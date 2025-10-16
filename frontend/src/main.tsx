import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import './index.css';
import App from './App.tsx';

const rootElement: HTMLElement = document.getElementById('root')!;
rootElement.className = 'min-h-screen flex items-center justify-center p-5';

createRoot(rootElement).render(
  <StrictMode>
    <MantineProvider>
      <App />
    </MantineProvider>
  </StrictMode>
);
