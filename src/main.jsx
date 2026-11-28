import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { ToastProvider } from './ui/Toast.jsx';
// import { applySavedTheme } from './ui/ThemeToggle.jsx';
import './index.css';

// applySavedTheme();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
);