import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const campaignRoot = path.resolve(projectRoot, "..");
const requireLocalMedia = process.argv.includes("--require-local-media");

const readJson = (filename) => JSON.parse(readFileSync(path.join(campaignRoot, filename), "utf8"));

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const assertUnique = (values, label) => {
  assert(new Set(values).size === values.length, `${label} must be unique.`);
};

const promptBatch = readJson("campaign-manifest.json");
const motionPack = readJson("motion-brand-pack-manifest.json");

assert(
  promptBatch.status === "prompts_ready",
  "Batch 01 must remain prompts_ready until generation is recorded.",
);
assert(
  Array.isArray(promptBatch.items) && promptBatch.items.length === 11,
  "Batch 01 must contain 11 prompt records.",
);
assertUnique(
  promptBatch.items.map(({ id }) => id),
  "Batch 01 item ids",
);
assertUnique(
  promptBatch.items.map(({ output }) => output),
  "Batch 01 output names",
);

const estimatedBatchCredits = promptBatch.items.reduce(
  (total, item) => total + item.estimatedCredits,
  0,
);
assert(
  estimatedBatchCredits === promptBatch.account.estimatedBatchCredits,
  `Batch 01 credit estimate is ${estimatedBatchCredits}, not ${promptBatch.account.estimatedBatchCredits}.`,
);
assert(
  promptBatch.account.actualCreditsSpent === 0,
  "Batch 01 must not claim spending before generation.",
);
for (const item of promptBatch.items) {
  assert(item.prompt?.trim(), `Batch 01 item ${item.id} is missing a prompt.`);
  assert(item.disclosure?.trim(), `Batch 01 item ${item.id} is missing a disclosure.`);
  assert(
    existsSync(path.resolve(campaignRoot, item.source)),
    `Batch 01 source is missing for ${item.id}: ${item.source}`,
  );
}

assert(
  motionPack.status === "generated_local_review",
  "Motion pack status must match its reviewed local state.",
);
assert(
  Array.isArray(motionPack.items) && motionPack.items.length === 8,
  "Motion pack must contain eight master records.",
);
assertUnique(
  motionPack.items.map(({ id }) => id),
  "Motion pack item ids",
);
assertUnique(
  motionPack.items.map(({ jobId }) => jobId),
  "Motion pack Higgsfield job ids",
);
assertUnique(
  motionPack.items.map(({ file }) => file),
  "Motion pack master filenames",
);

const actualMotionCredits = motionPack.items.reduce((total, item) => total + item.credits, 0);
assert(
  actualMotionCredits === motionPack.account.actualCreditsSpent,
  `Motion pack spending is ${actualMotionCredits}, not ${motionPack.account.actualCreditsSpent}.`,
);
assert(
  motionPack.account.observedStartingCredits - actualMotionCredits ===
    motionPack.account.observedRemainingCredits,
  "Motion pack starting balance, spending, and remaining balance do not reconcile.",
);
assert(
  motionPack.publication.approved === false,
  "Lab media must stay unapproved until an explicit review decision.",
);
assert(
  motionPack.publication.published === false,
  "Lab media must not be marked published from local production.",
);

for (const item of motionPack.items) {
  assert(item.direction?.trim(), `Motion pack item ${item.id} is missing its direction.`);
  if (requireLocalMedia) {
    const masterPath = path.resolve(
      campaignRoot,
      motionPack.media.videoMastersDirectory,
      item.file,
    );
    assert(existsSync(masterPath), `Motion master is missing for ${item.id}: ${masterPath}`);
  }
}

if (requireLocalMedia) {
  for (const filename of motionPack.deliverables.localSfxFiles) {
    const masterPath = path.resolve(campaignRoot, motionPack.media.audioMastersDirectory, filename);
    assert(existsSync(masterPath), `Local SFX master is missing: ${masterPath}`);
  }
}

console.log(
  `Validated ${promptBatch.items.length} prompt records and ${motionPack.items.length} reviewed motion masters` +
    `${requireLocalMedia ? " with local media" : ""}.`,
);
