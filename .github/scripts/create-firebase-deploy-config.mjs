import fs from 'node:fs';
import path from 'node:path';

const [, , target, outputPath] = process.argv;

if (!target || !outputPath) {
  console.error('Usage: create-firebase-deploy-config.mjs <functions|hosting|rules> <output-path>');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync('firebase.json', 'utf8'));

switch (target) {
  case 'functions':
    delete config.hosting;
    if (config.functions) {
      delete config.functions.predeploy;
    }
    break;
  case 'hosting':
    delete config.functions;
    if (config.hosting) {
      delete config.hosting.predeploy;
    }
    break;
  case 'rules':
    delete config.functions;
    delete config.hosting;
    break;
  default:
    console.error(`Unknown Firebase deploy config target: ${target}`);
    process.exit(1);
}

fs.mkdirSync(path.dirname(outputPath), {recursive: true});
fs.writeFileSync(outputPath, `${JSON.stringify(config, null, 2)}\n`);
