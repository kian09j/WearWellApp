// Builds the source images @capacitor/assets needs (assets/*.png) from public/icon.svg, then:
//   npx capacitor-assets generate --iconBackgroundColor '#fbf6ec' --splashBackgroundColor '#fbf6ec'
// Re-run both whenever the icon changes.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const paper = '#fbf6ec'
const svg = readFileSync(new URL('../public/icon.svg', import.meta.url))
const out = (name) => fileURLToPath(new URL(`../assets/${name}`, import.meta.url))

async function rosette(size) {
  return sharp(svg, { density: 600 }).resize(size, size).png().toBuffer()
}

async function onCanvas(canvas, flower, name, transparent = false) {
  const background = transparent ? { r: 0, g: 0, b: 0, alpha: 0 } : paper
  await sharp({ create: { width: canvas, height: canvas, channels: 4, background } })
    .composite([{ input: await rosette(flower), gravity: 'center' }])
    .png()
    .toFile(out(name))
}

// App icon with its background (iOS, older Android): rosette at about 64%
await onCanvas(1024, 656, 'icon-only.png')
// Adaptive Android icon: foreground inside the safe zone, plain paper background
await onCanvas(1024, 560, 'icon-foreground.png', true)
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: paper } }).png().toFile(out('icon-background.png'))
// Splash screens: a small rosette in the middle of a paper screen (light only, like the app)
await onCanvas(2732, 520, 'splash.png')
await onCanvas(2732, 520, 'splash-dark.png')
console.log('assets/ ready')

// Android splash screens, drawn straight into the project at each existing size. (On Windows
// `capacitor-assets generate --android` can stop with EBUSY before it reaches the splashes.)
const res = fileURLToPath(new URL('../android/app/src/main/res/', import.meta.url))
if (existsSync(res)) {
  for (const dir of readdirSync(res).filter((d) => d.startsWith('drawable'))) {
    const file = `${res}${dir}/splash.png`
    if (!existsSync(file)) continue
    const { width = 480, height = 800 } = await sharp(readFileSync(file)).metadata()
    const flower = Math.round(Math.min(width, height) * 0.28)
    await sharp({ create: { width, height, channels: 4, background: paper } })
      .composite([{ input: await rosette(flower), gravity: 'center' }])
      .png()
      .toFile(file)
  }
  console.log('android splashes ready')
}
