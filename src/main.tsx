import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './App.tsx'
import './index.css'

// Initialize background services
import './init'

// Declare global i18next (provided by Eagle)
declare global {
  var i18next: {
    t(key: string, options?: any): string;
    changeLanguage?(lng: string): Promise<void>;
    language?: string;
  };
}


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

