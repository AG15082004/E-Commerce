import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// ── Flicker-free theme init ──────────────────────────────────────────────────
// Runs synchronously before first paint to avoid FOUC.
// Reads localStorage "theme" and applies `dark` class immediately.
;(function initTheme() {
  const saved = localStorage.getItem('theme')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  if (saved === 'dark' || (!saved && prefersDark)) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
})()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
