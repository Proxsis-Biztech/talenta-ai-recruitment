import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './services/tenantContext'
import App from './App.tsx'

// Handle Vite dynamic import chunk loading errors (e.g., when a new deployment invalidates old chunk hashes)
window.addEventListener('vite:preloadError', (event) => {
  console.warn('[Vite] Preload error detected, reloading page to fetch latest version...', event);
  const reloadKey = 'right_app_chunk_reload';
  const lastReload = sessionStorage.getItem(reloadKey);
  const now = Date.now();
  
  if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
    sessionStorage.setItem(reloadKey, now.toString());
    window.location.reload();
  }
});

// Also catch unhandled promise rejections for dynamic import failures across all browsers
window.addEventListener('unhandledrejection', (event) => {
  const errorMsg = event?.reason?.message || String(event?.reason || '');
  if (
    errorMsg.includes('Failed to fetch dynamically imported module') ||
    errorMsg.includes('error loading dynamically imported module') ||
    errorMsg.includes('Importing a module script failed')
  ) {
    console.warn('[Vite] Dynamic import failure caught via unhandledrejection, reloading...', errorMsg);
    const reloadKey = 'right_app_chunk_reload';
    const lastReload = sessionStorage.getItem(reloadKey);
    const now = Date.now();
    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
      sessionStorage.setItem(reloadKey, now.toString());
      window.location.reload();
    }
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
