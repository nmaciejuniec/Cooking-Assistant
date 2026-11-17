// Copies the web app into www/, which both the Android app and the Mac app package.
import { cpSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
rmSync('www', { recursive: true, force: true });
mkdirSync('www');
for (const f of ['manifest.webmanifest', 'sw.js', 'icons', 'vendor']) cpSync(f, 'www/' + f, { recursive: true });
// Stamp the app version (set by the build) into the page.
const version = process.env.APP_VERSION || 'dev';
writeFileSync('www/index.html', readFileSync('index.html', 'utf8').replace("'__APP_VERSION__'", JSON.stringify(version)));
console.log('www/ ready');
