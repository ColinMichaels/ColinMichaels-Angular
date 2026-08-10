import {readFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import {applicationDefault, deleteApp, getApps, initializeApp} from 'firebase-admin/app';
import {FieldValue, getFirestore} from 'firebase-admin/firestore';

import dailyDiscoveryGeneration from '../lib/daily-discovery-generation.js';

const {
  DAILY_DISCOVERY_IMPORTED_GENERATION_VERSION,
  convertExternalDailyDiscoveryQuiz,
} = dailyDiscoveryGeneration;

const PRODUCTION_PROJECT_ID = 'colinmichaels';
const QUESTION_SET_COLLECTION = 'dailyDiscoveryQuestionSets';
const POSTS_COLLECTION = 'posts';

function parseArguments(argv) {
  const options = {
    file: '',
    project: '',
    confirmProject: '',
    write: false,
    approveDraft: false,
    allowUnverifiedSources: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--file' || argument === '--project' || argument === '--confirm-project') {
      const value = argv[index + 1];

      if (!value || value.startsWith('--')) {
        throw new Error(`${argument} requires a value.`);
      }

      const key = argument === '--file'
        ? 'file'
        : argument === '--project'
          ? 'project'
          : 'confirmProject';
      options[key] = value;
      index += 1;
      continue;
    }

    if (argument === '--write') {
      options.write = true;
      continue;
    }

    if (argument === '--approve-draft') {
      options.approveDraft = true;
      continue;
    }

    if (argument === '--allow-unverified-sources') {
      options.allowUnverifiedSources = true;
      continue;
    }

    if (argument === '--help') {
      printUsage();
      process.exit(0);
    }

    if (!argument.startsWith('--') && !options.file) {
      options.file = argument;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  if (!options.file) {
    throw new Error('Provide a dated Daily Discovery JSON file with --file.');
  }

  return options;
}

function printUsage() {
  console.log(`Usage:
  npm run import:daily-discovery -- --file /absolute/path/daily-discovery-YYYY-MM-DD.json --project colinmichaels

Options:
  --write                       Create the private Firestore question set. Default is dry-run.
  --approve-draft               Explicitly approve draft/manual-review input for a write.
  --confirm-project <id>        Required with --write outside the emulator.
  --allow-unverified-sources    Emulator-only escape hatch for testing links absent from local fixtures.

The importer never reads latest.json and never overwrites an existing date.`);
}

function getEasternDateKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function getFirebaseContext(options) {
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST?.trim() ?? '';
  const isEmulator = emulatorHost.length > 0;

  if (isEmulator && !/^(127\.0\.0\.1|localhost):\d+$/.test(emulatorHost)) {
    throw new Error('Refusing a non-loopback FIRESTORE_EMULATOR_HOST.');
  }

  if (options.allowUnverifiedSources && !isEmulator) {
    throw new Error('--allow-unverified-sources is permitted only with the loopback Firestore emulator.');
  }

  const projectId = options.project || process.env.GCLOUD_PROJECT?.trim() || '';

  if (projectId !== PRODUCTION_PROJECT_ID) {
    throw new Error(`Set --project ${PRODUCTION_PROJECT_ID} or GCLOUD_PROJECT=${PRODUCTION_PROJECT_ID}.`);
  }

  if (!isEmulator && !options.project) {
    throw new Error(`Production reads require the explicit flag --project ${PRODUCTION_PROJECT_ID}.`);
  }

  if (options.write && !isEmulator && options.confirmProject !== PRODUCTION_PROJECT_ID) {
    throw new Error(`Production writes require --confirm-project ${PRODUCTION_PROJECT_ID}.`);
  }

  return {isEmulator, projectId, emulatorHost};
}

async function readInput(fileArgument) {
  const filePath = path.resolve(fileArgument);
  const fileName = path.basename(filePath);
  const fileMatch = /^daily-discovery-(\d{4}-\d{2}-\d{2})\.json$/.exec(fileName);

  if (!fileMatch) {
    throw new Error('Use a dated daily-discovery-YYYY-MM-DD.json file. latest.json is intentionally refused.');
  }

  let value;

  try {
    value = JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown JSON read error.';
    throw new Error(`Could not read valid JSON from ${filePath}: ${message}`);
  }

  if (value?.quizDate !== fileMatch[1]) {
    throw new Error(`Filename date ${fileMatch[1]} does not match quizDate ${String(value?.quizDate ?? '')}.`);
  }

  return {fileName, filePath, value};
}

async function loadPublishedSources(firestore) {
  const snapshot = await firestore.collection(POSTS_COLLECTION)
    .where('status', '==', 'published')
    .limit(500)
    .get();

  return snapshot.docs.map(document => ({
    id: document.id,
    slug: typeof document.get('slug') === 'string' ? document.get('slug').trim() : '',
    title: typeof document.get('title') === 'string' ? document.get('title').trim() : '',
  })).filter(source => source.slug && source.title);
}

async function run() {
  const options = parseArguments(process.argv.slice(2));
  const context = getFirebaseContext(options);
  const input = await readInput(options.file);
  const apps = getApps();
  const app = apps[0] ?? initializeApp({
    projectId: context.projectId,
    ...(context.isEmulator ? {} : {credential: applicationDefault()}),
  });

  try {
    const firestore = getFirestore(app);
    const sources = await loadPublishedSources(firestore);
    const converted = convertExternalDailyDiscoveryQuiz(input.value, sources, {
      allowUnverifiedSources: options.allowUnverifiedSources,
    });
    const questionSetRef = firestore.collection(QUESTION_SET_COLLECTION).doc(converted.dateKey);
    const existingSnapshot = await questionSetRef.get();

    if (existingSnapshot.exists) {
      throw new Error(
        `Question set ${QUESTION_SET_COLLECTION}/${converted.dateKey} already exists. The manual importer never overwrites a set that may have been served.`
      );
    }

    const requiresApproval = converted.inputStatus !== 'ready' || converted.uploadStatus !== 'approved';

    if (options.write && requiresApproval && !options.approveDraft) {
      throw new Error('Draft or manual-review input requires --approve-draft before it can be written.');
    }

    if (options.write && !context.isEmulator && converted.dateKey < getEasternDateKey()) {
      throw new Error('Refusing to create a production question set for a past Eastern date.');
    }

    console.log(`${options.write ? 'Import' : 'Dry run'}: ${input.fileName}`);
    console.log(`Target: ${context.isEmulator ? `Firestore emulator ${context.emulatorHost}` : context.projectId}`);
    console.log(`Date: ${converted.dateKey}`);
    console.log(`Questions: ${converted.questions.length}`);
    console.log(`Published sources verified: ${converted.sourcePostIds.length}`);

    if (converted.unresolvedSourceSlugs.length > 0) {
      console.log(`Emulator-only unverified sources: ${converted.unresolvedSourceSlugs.join(', ')}`);
    }

    if (!options.write) {
      console.log(requiresApproval
        ? 'Validated only. A write would also require --approve-draft.'
        : 'Validated only. Re-run with --write to create the question set.');
      return;
    }

    const importedAt = new Date().toISOString();

    await firestore.runTransaction(async transaction => {
      const currentSnapshot = await transaction.get(questionSetRef);

      if (currentSnapshot.exists) {
        throw new Error(`Question set ${converted.dateKey} was created by another process; nothing was overwritten.`);
      }

      transaction.create(questionSetRef, {
        dateKey: converted.dateKey,
        status: 'ready',
        generationVersion: DAILY_DISCOVERY_IMPORTED_GENERATION_VERSION,
        generationMode: 'manual-codex-json-import',
        generatedAt: importedAt,
        generatedAtTimestamp: FieldValue.serverTimestamp(),
        sourcePostIds: converted.sourcePostIds,
        questions: converted.questions,
        importMetadata: {
          schema: input.value.schema,
          version: input.value.version,
          sourceFile: input.fileName,
          sourceGeneratedAt: converted.generatedAt,
          inputStatus: converted.inputStatus,
          uploadStatus: converted.uploadStatus,
          approvedDraft: requiresApproval,
          importedAt,
          qualityChecks: converted.qualityChecks,
          unresolvedSourceSlugs: converted.unresolvedSourceSlugs,
        },
      });
    });

    console.log(`Created ${QUESTION_SET_COLLECTION}/${converted.dateKey}.`);
  } finally {
    if (getApps().includes(app)) {
      await deleteApp(app);
    }
  }
}

run().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
