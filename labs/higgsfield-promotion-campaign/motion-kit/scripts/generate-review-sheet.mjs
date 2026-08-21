import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const outputRoot = path.join(projectRoot, "output");
const reviewRoot = path.join(outputRoot, "review");
const manifest = JSON.parse(readFileSync(path.join(outputRoot, "render-manifest.json"), "utf8"));

mkdirSync(reviewRoot, { recursive: true });

const resolveRenderOutput = (render) => path.resolve(projectRoot, render.output);
const requireRender = (composition) => {
  const render = manifest.renders.find((candidate) => candidate.composition === composition);
  if (!render)
    throw new Error(`Render manifest is missing ${composition}. Run npm run render first.`);
  return render;
};

const args = ["-y", "-hide_banner", "-loglevel", "error"];
for (const render of manifest.renders) args.push("-ss", "2", "-i", resolveRenderOutput(render));

const filters = manifest.renders.map(
  (_, index) =>
    `[${index}:v]scale=600:338:force_original_aspect_ratio=decrease,` +
    `pad=600:360:0:0:color=0x050b16[v${index}]`,
);

const layout = [
  "0_0",
  "600_0",
  "1200_0",
  "1800_0",
  "0_360",
  "600_360",
  "1200_360",
  "1800_360",
  "0_720",
  "600_720",
  "1200_720",
].join("|");
const labels = manifest.renders.map((_, index) => `[v${index}]`).join("");
filters.push(
  `${labels}xstack=inputs=${manifest.renders.length}:layout=${layout}:fill=0x050b16,scale=1920:864[sheet]`,
);

args.push(
  "-filter_complex",
  filters.join(";"),
  "-map",
  "[sheet]",
  "-frames:v",
  "1",
  path.join(reviewRoot, "final-motion-kit-contact-sheet.png"),
);

execFileSync("ffmpeg", args, { stdio: "inherit" });

const spotlight = [
  requireRender("CM-Intro-Example"),
  requireRender("CM-Outro-Example"),
  requireRender("CM-Subscribe-Like-Share"),
];
const checkpoints = [0.5, 1.5, 2.5, 3.5];
const timelineArgs = ["-y", "-hide_banner", "-loglevel", "error"];
for (const render of spotlight) {
  for (const checkpoint of checkpoints) {
    timelineArgs.push("-ss", String(checkpoint), "-i", resolveRenderOutput(render));
  }
}
const timelineFilters = spotlight.flatMap((_, row) =>
  checkpoints.map(
    (_, column) => `[${row * checkpoints.length + column}:v]scale=480:270[v${row}_${column}]`,
  ),
);
const timelineLabels = spotlight
  .flatMap((_, row) => checkpoints.map((_, column) => `[v${row}_${column}]`))
  .join("");
timelineFilters.push(
  `${timelineLabels}xstack=inputs=12:layout=` +
    "0_0|480_0|960_0|1440_0|0_270|480_270|960_270|1440_270|0_540|480_540|960_540|1440_540[timeline]",
);
timelineArgs.push(
  "-filter_complex",
  timelineFilters.join(";"),
  "-map",
  "[timeline]",
  "-frames:v",
  "1",
  path.join(reviewRoot, "final-motion-timeline-review.png"),
);
execFileSync("ffmpeg", timelineArgs, { stdio: "inherit" });
console.log(`Wrote final review sheet to ${reviewRoot}`);
