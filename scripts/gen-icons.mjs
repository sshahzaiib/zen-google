// Generates the Zen Google ensō icons from a single SVG definition.
//   node scripts/gen-icons.mjs
// Requires the devDependency `sharp`. Outputs to icons/.
//
// The mark is the same open ensō used as the popup brand glyph, scaled up:
// one sage stroke, ~9.4% width, rounded caps, opening toward the upper-right.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'icons');
mkdirSync(outDir, { recursive: true });

const STROKE = '#4F7D62'; // brand sage accent
const PAPER = '#FAF8F3'; // warm paper, store-icon background

// ensō authored in a 128 viewBox; geometry scales to any output size.
function enso() {
  return `<circle cx="64" cy="64" r="44" fill="none" stroke="${STROKE}" stroke-width="12" stroke-linecap="round" stroke-dasharray="228 52" transform="rotate(-48 64 64)"/>`;
}

function svg({ background = false } = {}) {
  const bg = background
    ? `<rect x="0" y="0" width="128" height="128" rx="28" fill="${PAPER}"/>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">${bg}${enso()}</svg>`;
}

async function render(name, size, opts) {
  // Render the 128 master at 4x, then downscale to the exact target for crisp edges.
  const buf = Buffer.from(svg(opts));
  await sharp(buf, { density: 288 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(outDir, name));
  console.log('wrote icons/' + name);
}

// Manifest / toolbar icons — transparent background.
for (const size of [16, 32, 48, 128]) {
  await render(`icon${size}.png`, size);
}
// Web Store listing icon — ensō on a warm-paper rounded square.
await render('icon128-store.png', 128, { background: true });
