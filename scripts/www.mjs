// Copies the web app into www/, which both the Android app and the Mac app package.
import { cpSync, mkdirSync, rmSync } from 'node:fs';
rmSync('www', { recursive: true, force: true });
mkdirSync('www');
for (const f of ['index.html', 'manifest.webmanifest', 'sw.js', 'icons']) cpSync(f, 'www/' + f, { recursive: true });
console.log('www/ ready');
