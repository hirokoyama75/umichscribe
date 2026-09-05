import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';

async function doBuild() {
  const isFirefox = process.env.TARGET === 'firefox' || process.argv.includes('--firefox');
  console.log(`Building for ${isFirefox ? 'Firefox' : 'Chrome'}...`);

  if (!fs.existsSync('dist')) fs.mkdirSync('dist');
  if (!fs.existsSync('dist/content')) fs.mkdirSync('dist/content', { recursive: true });
  if (!fs.existsSync('dist/popup')) fs.mkdirSync('dist/popup', { recursive: true });
  if (!fs.existsSync('dist/icons')) fs.mkdirSync('dist/icons', { recursive: true });

  await build({
    entryPoints: ['src/content/index.ts'],
    bundle: true,
    outfile: 'dist/content/index.js',
    target: 'es2022'
  });

  await build({
    entryPoints: ['src/popup/popup.ts'],
    bundle: true,
    outfile: 'dist/popup/popup.js',
    target: 'es2022'
  });

  // Prepare manifest.json
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf-8'));
  if (!isFirefox) {
    // Chrome Web Store strictly rejects unrecognized keys such as browser_specific_settings
    delete manifest.browser_specific_settings;
  }
  fs.writeFileSync('dist/manifest.json', JSON.stringify(manifest, null, 2));

  // Copy PNG icons
  if (fs.existsSync('src/icons')) {
    fs.cpSync('src/icons', 'dist/icons', { recursive: true });
  }

  // Copy popup assets
  fs.copyFileSync('src/popup/index.html', 'dist/popup/index.html');
  fs.copyFileSync('src/popup/popup.css', 'dist/popup/popup.css');
  
  // Optional SVG asset fallback
  if (fs.existsSync('src/icon.svg')) {
    fs.copyFileSync('src/icon.svg', 'dist/icon.svg');
  }

  console.log(`Build complete (${isFirefox ? 'Firefox' : 'Chrome'})`);
}

doBuild().catch(e => {
  console.error(e);
  process.exit(1);
});
