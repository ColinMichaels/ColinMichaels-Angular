import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const outputRoot = path.join(projectRoot, "output");
const audioRoot = path.join(projectRoot, "public", "generated", "audio");

execFileSync(process.execPath, [path.join(scriptDirectory, "generate-local-sfx.mjs")], {
  cwd: projectRoot,
  stdio: "inherit",
});

execFileSync(process.execPath, [path.join(scriptDirectory, "sync-assets.mjs")], {
  cwd: projectRoot,
  stdio: "inherit",
});

// This table is the source of truth for the composition/output/audio mapping.
// A missing optional SFX master produces an explicitly named silent derivative.
const renders = [
  ["CM-Intro-Example", "01-intro-example", "01-intro-wave-horizon.wav"],
  ["CM-Intro-Blank", "01-intro-blank", null],
  ["CM-Outro-Example", "02-outro-example", "08-outro-particle-signature.wav"],
  ["CM-Outro-Blank", "02-outro-blank", null],
  ["CM-Transition-Signal-Wipe", "03-transition-signal-wipe", "03-transition-signal-wipe.wav"],
  ["CM-Transition-Optical-Iris", "04-transition-optical-iris", "04-transition-optical-iris.wav"],
  ["CM-Stinger-Wave-Pulse", "05-stinger-wave-pulse", "05-stinger-wave-pulse.wav"],
  ["CM-Stinger-Prism", "06-stinger-prism", "06-stinger-prism-intersect.wav"],
  ["CM-Subscribe-Like-Share", "07-subscribe-like-share", "07-youtube-cta.wav"],
  ["CM-Image-Story-Example", "08-image-story-example", "02-outro-end-screen.wav"],
  ["CM-Image-Story-Blank", "08-image-story-blank", null],
];

mkdirSync(outputRoot, { recursive: true });
const manifest = [];

for (const [composition, baseName, audioFile] of renders) {
  const withSfx = Boolean(audioFile && existsSync(path.join(audioRoot, audioFile)));
  const suffix = audioFile && !withSfx ? "-silent" : "";
  const output = path.join(outputRoot, `${baseName}${suffix}.mp4`);
  execFileSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    [
      "remotion",
      "render",
      composition,
      output,
      "--codec",
      "h264",
      "--crf",
      "17",
      "--props",
      JSON.stringify({ withSfx }),
    ],
    { cwd: projectRoot, stdio: "inherit" },
  );
  manifest.push({
    composition,
    output: path.relative(projectRoot, output),
    audioFile,
    withSfx,
  });
}

writeFileSync(
  path.join(outputRoot, "render-manifest.json"),
  `${JSON.stringify({ renderedAt: new Date().toISOString(), renders: manifest }, null, 2)}\n`,
);
