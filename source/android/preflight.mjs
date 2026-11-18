import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const read = p => readFileSync(path.join(root, p), 'utf8');
const config = JSON.parse(read('source/android/twa-manifest.json'));
const manifest = JSON.parse(read('manifest.webmanifest'));
const base = new URL(config.webManifestUrl);
assert.equal(base.origin, 'https://trypartylol-max.github.io');
assert.equal(new URL(manifest.start_url, base).pathname, config.startUrl);
assert.equal(new URL(manifest.scope, base).href, config.fullScopeUrl);
assert.equal(config.enableNotifications, true);
assert.ok(config.minSdkVersion >= 24, 'Android Browser Helper 2.7.4 requires API 24');
assert.deepEqual(config.additionalTrustedOrigins, []);
for (const icon of manifest.icons) {
  const url = new URL(icon.src, base);
  assert.equal(url.origin, base.origin);
  assert.ok(url.pathname.startsWith('/shaah/assets/'));
  const png = readFileSync(path.join(root, url.pathname.slice('/shaah/'.length)));
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  const [width, height] = icon.sizes.split('x').map(Number);
  assert.equal(png.readUInt32BE(16), width);
  assert.equal(png.readUInt32BE(20), height);
}
const sw = read('source/sw-template.js');
for (const marker of ["addEventListener('push'", "addEventListener('notificationclick'", 'showNotification', 'clients.openWindow']) assert.ok(sw.includes(marker), marker);
const app = read('source/app.js');
for (const marker of ['function pushResync', 'shaah_push_subscribe', 'setAppBadge', 'clearAppBadge', "provider:'google'", 'location.origin+location.pathname']) assert.ok(app.includes(marker), marker);
assert.ok(read('source/index.html').includes('Content-Security-Policy'));
const gradle = read('source/android/project/app/build.gradle');
assert.match(gradle, /targetSdkVersion 36/);
assert.match(gradle, new RegExp('minSdkVersion ' + config.minSdkVersion + '\\b'));
assert.ok(!read('source/android/project/build.gradle').includes('jcenter()'));
assert.match(gradle, /enableNotifications: true/);
assert.deepEqual(JSON.parse(read('source/android/project/twa-manifest.json')), config);
console.log('PASS: local manifest/scope, PNG sizes, Push/badge/auth source markers, CSP, generated API 36 config.');
console.log('Source markers are inventory checks, not Android runtime validation. No network or backend access.');
console.log('Offline inventory only: live DAL and Android runtime behavior are not evaluated.');
console.log('Counter activation requires the reviewed web build and use_as_origin association at ' + new URL('/.well-known/assetlinks.json', base));
if (process.argv.includes('--release')) {
  console.error('Release validation is unavailable: device, signature, live DAL, OAuth and Push evidence required.');
  process.exitCode = 1;
}
