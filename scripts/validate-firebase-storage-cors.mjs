import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const READ_ONLY_METHODS = new Set(['GET', 'HEAD']);

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireStringList(value, field, ruleIndex) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`CORS rule ${ruleIndex + 1} must define a non-empty ${field} array.`);
  }

  const strings = value.map(entry => typeof entry === 'string' ? entry.trim() : '');

  if (strings.some(entry => !entry)) {
    throw new Error(`CORS rule ${ruleIndex + 1} contains an invalid ${field} value.`);
  }

  if (new Set(strings).size !== strings.length) {
    throw new Error(`CORS rule ${ruleIndex + 1} contains duplicate ${field} values.`);
  }

  return strings;
}

export function validateFirebaseStorageCors(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Firebase Storage CORS must be a non-empty array of rules without a top-level cors wrapper.');
  }

  return value.map((rule, ruleIndex) => {
    if (!isRecord(rule)) {
      throw new Error(`CORS rule ${ruleIndex + 1} must be a JSON object.`);
    }

    const origin = requireStringList(rule.origin, 'origin', ruleIndex);
    const method = requireStringList(rule.method, 'method', ruleIndex).map(entry => entry.toUpperCase());
    const responseHeader = requireStringList(rule.responseHeader, 'responseHeader', ruleIndex);

    const invalidOrigin = origin.find(entry => {
      if (entry === '*') {
        return false;
      }

      try {
        const parsed = new URL(entry);
        return !['http:', 'https:'].includes(parsed.protocol)
          || parsed.origin !== entry
          || Boolean(parsed.username)
          || Boolean(parsed.password);
      } catch {
        return true;
      }
    });
    if (invalidOrigin) {
      throw new Error(`CORS rule ${ruleIndex + 1} has an invalid HTTP(S) origin: ${invalidOrigin}`);
    }

    const mutatingMethod = method.find(entry => !READ_ONLY_METHODS.has(entry));
    if (mutatingMethod) {
      throw new Error(`CORS rule ${ruleIndex + 1} must remain read-only; ${mutatingMethod} is not allowed.`);
    }

    if (!Number.isInteger(rule.maxAgeSeconds) || rule.maxAgeSeconds < 0 || rule.maxAgeSeconds > 86400) {
      throw new Error(`CORS rule ${ruleIndex + 1} maxAgeSeconds must be an integer from 0 through 86400.`);
    }

    return {
      origin,
      method,
      responseHeader,
      maxAgeSeconds: rule.maxAgeSeconds,
    };
  });
}

export async function readAndValidateFirebaseStorageCors(filePath) {
  const source = await readFile(filePath, 'utf8');
  let parsed;

  try {
    parsed = JSON.parse(source);
  } catch (error) {
    throw new Error(`Firebase Storage CORS is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  return validateFirebaseStorageCors(parsed);
}

async function main() {
  const filePath = path.resolve(process.argv[2] || 'storage.cors.json');
  const rules = await readAndValidateFirebaseStorageCors(filePath);
  const origins = [...new Set(rules.flatMap(rule => rule.origin))];
  const methods = [...new Set(rules.flatMap(rule => rule.method))];

  console.log(`Validated ${rules.length} Firebase Storage CORS rule(s) from ${filePath}.`);
  console.log(`Origins: ${origins.join(', ')}`);
  console.log(`Methods: ${methods.join(', ')}`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
