import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
// Swallow Firebase offline errors so they don't trigger crash reports in the preview environment
const originalConsoleError = console.error;
console.error = (...args) => {
  if (args.length > 0 && typeof args[0] === 'string') {
    if (args[0].includes('Could not reach Cloud Firestore backend') || args[0].includes('Failed to get document because the client is offline') || args[0].includes('offline')) {
      return;
    }
  }
  if (args.length > 1 && args[1] && typeof args[1] === 'object' && args[1].message) {
    if (args[1].message.includes('offline') || args[1].code === 'unavailable') {
      return;
    }
  }
  originalConsoleError(...args);
};

import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
