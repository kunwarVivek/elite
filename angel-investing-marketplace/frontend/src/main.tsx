import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { AppProviders } from './providers/AppProviders'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </React.StrictMode>,
)