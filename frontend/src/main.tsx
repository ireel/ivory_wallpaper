import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { reportFrontendLog } from './utils/logger'

window.addEventListener('error', event => {
  reportFrontendLog('error', 'Unhandled frontend error', event.error || event.message)
})
window.addEventListener('unhandledrejection', event => {
  reportFrontendLog('error', 'Unhandled frontend promise rejection', event.reason)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
