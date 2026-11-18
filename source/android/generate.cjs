'use strict';
// Offline generation from reviewed repository assets; never fetch production.
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const root = path.resolve(__dirname, '../..');
const tooling = process.env.BUBBLEWRAP_MODULES;
if (!tooling) throw new Error('Set BUBBLEWRAP_MODULES to an isolated node_modules directory with @bubblewrap/core@1.27.0');
const load = createRequire(path.resolve(tooling, '../package.json'));
if (load('@bubblewrap/core/package.json').version !== '1.27.0') throw new Error('Expected Bubblewrap core 1.27.0');
const {TwaGenerator, TwaManifest, ConsoleLog} = load('@bubblewrap/core');
const {fetchUtils} = load('@bubblewrap/core/dist/lib/FetchUtils');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'twa-manifest.json')));
const files = new Map([
  [config.webManifestUrl, ['manifest.webmanifest', 'application/manifest+json']],
  [config.iconUrl, ['assets/icon-512.png', 'image/png']]
]);
fetchUtils.fetch = async url => {
  const item = files.get(String(url));
  if (!item) throw new Error('Unexpected network request: ' + url);
  return new Response(fs.readFileSync(path.join(root, item[0])), {headers: {'content-type': item[1]}});
};
(async () => {
  const target = path.join(__dirname, 'project');
  if (fs.existsSync(target)) throw new Error('project already exists; inspect/remove generated directory before regenerating');
  await new TwaGenerator().createTwaProject(target, new TwaManifest(config), new ConsoleLog('SHAAH'));
  // Bubblewrap 1.27.0 still emits the retired JCenter repository.
  const buildFile = path.join(target, 'build.gradle');
  fs.writeFileSync(buildFile, fs.readFileSync(buildFile, 'utf8').replaceAll('jcenter()', 'mavenCentral()'));
  const javaDir = path.join(target, 'app/src/main/java/io/github/trypartylol_max/shaah');
  for (const name of ['LauncherActivity.java', 'BadgeNotifier.java', 'BadgePolicy.java', 'DelegationService.java', 'LaunchLog.java', 'DiagnosticActivity.java']) {
    fs.copyFileSync(path.join(__dirname, 'native', name), path.join(javaDir, name));
  }
  const androidManifest = path.join(target, 'app/src/main/AndroidManifest.xml');
  fs.writeFileSync(androidManifest, fs.readFileSync(androidManifest, 'utf8')
    .replace('<application', '<queries><intent><action android:name="android.support.customtabs.action.CustomTabsService" /></intent></queries>\n    <application')
    .replace('</application>', '<service android:name="androidx.browser.customtabs.PostMessageService" android:exported="true" />\n    </application>'));
  fs.copyFileSync(path.join(__dirname, 'twa-manifest.json'), path.join(target, 'twa-manifest.json'));
  console.log('Generated Android project offline. No signing key, APK, AAB or publication.');
})().catch(error => {console.error(error); process.exitCode = 1;});
