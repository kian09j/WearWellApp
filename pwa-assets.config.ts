import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Generates the PWA icons in public/ from public/icon.svg: `npx pwa-assets-generator`
const paper = '#FBF6EC'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: paper } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: paper } },
  },
  images: ['public/icon.svg'],
})
