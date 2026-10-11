import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import '@fontsource-variable/fraunces/full.css'
import '@fontsource-variable/fraunces/full-italic.css'
import '@fontsource-variable/figtree/index.css'
import '@fontsource/caveat/600.css'
import './index.css'
import App from './App'
import { purgeDeletedPhotos, requestPersistentStorage } from './data'
import { setupPlatform } from './platform/setup'

void requestPersistentStorage()
void purgeDeletedPhotos()
void setupPlatform()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
