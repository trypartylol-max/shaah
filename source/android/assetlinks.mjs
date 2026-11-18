// Prints a candidate for review only. Never writes or publishes it.
import {readFileSync} from 'node:fs';
const config = JSON.parse(readFileSync(new URL('./twa-manifest.json', import.meta.url)));
const fingerprints = process.argv.slice(2);
if (!fingerprints.length || fingerprints.some(value => !/^(?:[A-Fa-f0-9]{2}:){31}[A-Fa-f0-9]{2}$/.test(value))) {
  console.error('Supply actual SHA-256 signing certificate fingerprints (32 colon-separated hexadecimal bytes).');
  process.exitCode = 1;
} else {
  console.log(JSON.stringify([{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {namespace: 'android_app', package_name: config.packageId,
      sha256_cert_fingerprints: fingerprints.map(value => value.toUpperCase())}
  }], null, 2));
}
