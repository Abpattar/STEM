import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { StudentLearningProvider } from './context/StudentLearningContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StudentLearningProvider>
      <App />
    </StudentLearningProvider>
  </React.StrictMode>,
)
