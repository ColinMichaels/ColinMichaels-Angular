import {copyFileSync, existsSync, mkdirSync} from 'node:fs';
import {dirname, resolve} from 'node:path';

const sourcePath = resolve('dist/colin-michaels-firebase/browser/index.html');
const destinationPath = resolve('functions/seo-index.html');

if (!existsSync(sourcePath)) {
  console.error(`Missing ${sourcePath}. Run npm run build before deploying Functions.`);
  process.exit(1);
}

mkdirSync(dirname(destinationPath), {recursive: true});
copyFileSync(sourcePath, destinationPath);
console.log(`Copied ${sourcePath} to ${destinationPath}`);
