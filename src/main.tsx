import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { StartupErrorBoundary } from './components/StartupError'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StartupErrorBoundary>
      <App />
    </StartupErrorBoundary>
  </StrictMode>
)
