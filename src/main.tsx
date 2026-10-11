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

void requestPersistentStorage()
void purgeDeletedPhotos()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
