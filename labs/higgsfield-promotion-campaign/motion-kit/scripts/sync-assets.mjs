import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const campaignRoot = path.resolve(projectRoot, "..");
const repositoryRoot = path.resolve(projectRoot, "../../..");
const masterVideoRoot = path.join(
  campaignRoot,
  "outputs",
  "higgsfield-masters",
  "motion-brand-pack",
);
const masterAudioRoot = path.join(
  campaignRoot,
  "outputs",
  "local-sfx-masters",
  "motion-brand-pack",
);
const generatedRoot = path.join(projectRoot, "public", "generated");

// These filenames are the reviewed master contract. Remotion works from
// disposable copies in public/generated and never overwrites the source media.
const videos = [
  "01-intro-wave-horizon.mp4",
  "02-outro-end-screen-background.mp4",
  "03-transition-signal-wipe.mp4",
  "04-transition-optical-iris.mp4",
  "05-stinger-wave-pulse.mp4",
  "06-stinger-prism-intersect.mp4",
  "07-youtube-cta-background.mp4",
  "08-outro-particle-signature.mp4",
];

const audio = [
  "01-intro-wave-horizon.wav",
  "02-outro-end-screen.wav",
  "03-transition-signal-wipe.wav",
  "04-transition-optical-iris.wav",
  "05-stinger-wave-pulse.wav",
  "06-stinger-prism-intersect.wav",
  "07-youtube-cta.wav",
  "08-outro-particle-signature.wav",
];

const shouldRefresh = (source, destination) =>
  !existsSync(destination) || statSync(source).mtimeMs > statSync(destination).mtimeMs;

mkdirSync(path.join(generatedRoot, "video"), { recursive: true });
mkdirSync(path.join(generatedRoot, "audio"), { recursive: true });
mkdirSync(path.join(generatedRoot, "images"), { recursive: true });
mkdirSync(path.join(generatedRoot, "fonts"), { recursive: true });

for (const filename of videos) {
  const source = path.join(masterVideoRoot, filename);
  const destination = path.join(generatedRoot, "video", filename);
  if (!existsSync(source)) throw new Error(`Missing Higgsfield master: ${source}`);
  if (!shouldRefresh(source, destination)) continue;
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      source,
      "-an",
      "-c:v",
      "libx264",
      "-crf",
      "17",
      "-preset",
      "medium",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      destination,
    ],
    { stdio: "inherit" },
  );
}

const copiedAudio = [];
for (const filename of audio) {
  const source = path.join(masterAudioRoot, filename);
  const destination = path.join(generatedRoot, "audio", filename);
  if (!existsSync(source)) continue;
  if (shouldRefresh(source, destination)) copyFileSync(source, destination);
  copiedAudio.push(filename);
}

const imageSource = path.join(
  repositoryRoot,
  "src",
  "assets",
  "images",
  "home",
  "colin-editorial-workspace.webp",
);
copyFileSync(imageSource, path.join(generatedRoot, "images", "colin-editorial-workspace.webp"));
copyFileSync(
  path.join(repositoryRoot, "src", "assets", "fonts", "lexend", "lexend-latin.woff2"),
  path.join(generatedRoot, "fonts", "lexend-latin.woff2"),
);
copyFileSync(
  path.join(
    repositoryRoot,
    "src",
    "assets",
    "fonts",
    "source-sans-3",
    "source-sans-3-normal-latin.woff2",
  ),
  path.join(generatedRoot, "fonts", "source-sans-3-normal-latin.woff2"),
);

writeFileSync(
  path.join(generatedRoot, "asset-manifest.json"),
  `${JSON.stringify({ videos, audio: copiedAudio, image: "colin-editorial-workspace.webp" }, null, 2)}\n`,
);

console.log(
  `Synchronized ${videos.length} videos and ${copiedAudio.length} original local SFX files.`,
);
