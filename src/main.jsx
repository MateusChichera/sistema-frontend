import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorDialogProvider from './contexts/ErrorDialogProvider'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorDialogProvider>
      <App />
    </ErrorDialogProvider>
  </StrictMode>,
)
