import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const outputRoot = path.resolve(projectRoot, "../outputs/local-sfx-masters/motion-brand-pack");

mkdirSync(outputRoot, { recursive: true });

// These FFmpeg synthesis recipes are local, reviewable, and provider-free.
// Regeneration must never make a paid API call or overwrite Higgsfield video masters.
const effects = [
  {
    file: "01-intro-wave-horizon.wav",
    inputs: [
      "anoisesrc=color=pink:duration=4:sample_rate=48000:amplitude=0.22",
      "aevalsrc=0.16*sin(2*PI*(180*t+170*t*t)):s=48000:d=1.8",
      "sine=frequency=880:sample_rate=48000:duration=1.5",
      "sine=frequency=66:sample_rate=48000:duration=1.1",
    ],
    filter:
      "[0:a]highpass=f=420,lowpass=f=7200,afade=t=in:st=0.15:d=0.7,afade=t=out:st=2.6:d=1.35,volume=0.34[air];" +
      "[1:a]highpass=f=150,lowpass=f=4200,afade=t=in:st=0:d=0.22,afade=t=out:st=1.05:d=0.7,adelay=360:all=1,volume=0.48[sweep];" +
      "[2:a]afade=t=in:st=0:d=0.02,afade=t=out:st=0.12:d=1.25,adelay=1240:all=1,aecho=0.55:0.3:80:0.22,volume=0.19[chime];" +
      "[3:a]afade=t=in:st=0:d=0.02,afade=t=out:st=0.08:d=0.95,adelay=1320:all=1,volume=0.32[sub];" +
      "[air][sweep][chime][sub]amix=inputs=4:normalize=0,alimiter=limit=0.82:attack=5:release=80,pan=stereo|c0=c0|c1=c0[out]",
  },
  {
    file: "02-outro-end-screen.wav",
    inputs: [
      "anoisesrc=color=pink:duration=4:sample_rate=48000:amplitude=0.14",
      "sine=frequency=740:sample_rate=48000:duration=1.6",
      "sine=frequency=1110:sample_rate=48000:duration=1.35",
      "sine=frequency=92:sample_rate=48000:duration=1.8",
    ],
    filter:
      "[0:a]highpass=f=900,lowpass=f=6800,afade=t=in:st=0:d=0.8,afade=t=out:st=2.7:d=1.25,volume=0.24[air];" +
      "[1:a]afade=t=in:st=0:d=0.02,afade=t=out:st=0.1:d=1.45,adelay=560:all=1,aecho=0.6:0.3:110:0.18,volume=0.15[a];" +
      "[2:a]afade=t=in:st=0:d=0.02,afade=t=out:st=0.08:d=1.22,adelay=1440:all=1,aecho=0.6:0.25:95:0.16,volume=0.12[b];" +
      "[3:a]lowpass=f=240,afade=t=in:st=0:d=0.08,afade=t=out:st=0.25:d=1.45,adelay=1760:all=1,volume=0.18[sub];" +
      "[air][a][b][sub]amix=inputs=4:normalize=0,alimiter=limit=0.75:attack=5:release=100,pan=stereo|c0=c0|c1=c0[out]",
  },
  {
    file: "03-transition-signal-wipe.wav",
    inputs: [
      "anoisesrc=color=white:duration=1.65:sample_rate=48000:amplitude=0.34",
      "aevalsrc=0.15*sin(2*PI*(320*t+900*t*t)):s=48000:d=1.35",
      "sine=frequency=1500:sample_rate=48000:duration=0.42",
    ],
    filter:
      "[0:a]highpass=f=650,lowpass=f=9200,afade=t=in:st=0:d=0.35,afade=t=out:st=0.82:d=0.78,adelay=620:all=1,aecho=0.45:0.2:70:0.12,volume=0.52[whoosh];" +
      "[1:a]highpass=f=240,lowpass=f=5200,afade=t=in:st=0:d=0.12,afade=t=out:st=0.64:d=0.67,adelay=720:all=1,volume=0.34[tone];" +
      "[2:a]afade=t=in:st=0:d=0.01,afade=t=out:st=0.04:d=0.34,adelay=1320:all=1,volume=0.09[glint];" +
      "[whoosh][tone][glint]amix=inputs=3:normalize=0,alimiter=limit=0.84:attack=3:release=70,pan=stereo|c0=c0|c1=c0[out]",
  },
  {
    file: "04-transition-optical-iris.wav",
    inputs: [
      "aevalsrc=0.13*sin(2*PI*(980*t-330*t*t)):s=48000:d=0.9",
      "anoisesrc=color=pink:duration=1.7:sample_rate=48000:amplitude=0.28",
      "aevalsrc=0.14*sin(2*PI*(220*t+760*t*t)):s=48000:d=1.25",
      "sine=frequency=78:sample_rate=48000:duration=0.72",
    ],
    filter:
      "[0:a]highpass=f=300,lowpass=f=3600,afade=t=in:st=0:d=0.2,afade=t=out:st=0.44:d=0.42,adelay=340:all=1,volume=0.32[gather];" +
      "[1:a]highpass=f=500,lowpass=f=6400,afade=t=in:st=0:d=0.12,afade=t=out:st=0.8:d=0.85,adelay=980:all=1,volume=0.48[tunnel];" +
      "[2:a]highpass=f=180,lowpass=f=5200,afade=t=in:st=0:d=0.08,afade=t=out:st=0.66:d=0.55,adelay=920:all=1,volume=0.28[rise];" +
      "[3:a]lowpass=f=220,afade=t=in:st=0:d=0.02,afade=t=out:st=0.08:d=0.58,adelay=1660:all=1,volume=0.28[land];" +
      "[gather][tunnel][rise][land]amix=inputs=4:normalize=0,alimiter=limit=0.82:attack=4:release=75,pan=stereo|c0=c0|c1=c0[out]",
  },
  {
    file: "05-stinger-wave-pulse.wav",
    inputs: [
      "sine=frequency=620:sample_rate=48000:duration=0.62",
      "sine=frequency=930:sample_rate=48000:duration=0.5",
      "sine=frequency=58:sample_rate=48000:duration=0.85",
      "anoisesrc=color=pink:duration=1.2:sample_rate=48000:amplitude=0.16",
    ],
    filter:
      "[0:a]afade=t=in:st=0:d=0.01,afade=t=out:st=0.04:d=0.54,adelay=900:all=1,aecho=0.6:0.24:105:0.2,volume=0.32[p1];" +
      "[1:a]afade=t=in:st=0:d=0.01,afade=t=out:st=0.03:d=0.43,adelay=1030:all=1,aecho=0.55:0.22:82:0.18,volume=0.22[p2];" +
      "[2:a]lowpass=f=180,afade=t=in:st=0:d=0.02,afade=t=out:st=0.07:d=0.72,adelay=930:all=1,volume=0.34[sub];" +
      "[3:a]highpass=f=700,lowpass=f=5000,afade=t=in:st=0:d=0.1,afade=t=out:st=0.35:d=0.8,adelay=980:all=1,volume=0.2[ring];" +
      "[p1][p2][sub][ring]amix=inputs=4:normalize=0,alimiter=limit=0.78:attack=3:release=80,pan=stereo|c0=c0|c1=c0[out]",
  },
  {
    file: "06-stinger-prism-intersect.wav",
    inputs: [
      "sine=frequency=440:sample_rate=48000:duration=0.55",
      "sine=frequency=554.37:sample_rate=48000:duration=0.55",
      "sine=frequency=659.25:sample_rate=48000:duration=0.55",
      "sine=frequency=880:sample_rate=48000:duration=1.15",
      "sine=frequency=64:sample_rate=48000:duration=0.7",
    ],
    filter:
      "[0:a]afade=t=in:st=0:d=0.14,afade=t=out:st=0.28:d=0.25,adelay=180:all=1,volume=0.13[a];" +
      "[1:a]afade=t=in:st=0:d=0.14,afade=t=out:st=0.28:d=0.25,adelay=360:all=1,volume=0.13[b];" +
      "[2:a]afade=t=in:st=0:d=0.14,afade=t=out:st=0.28:d=0.25,adelay=540:all=1,volume=0.13[c];" +
      "[3:a]afade=t=in:st=0:d=0.01,afade=t=out:st=0.08:d=1.02,adelay=820:all=1,aecho=0.6:0.28:95:0.22,volume=0.25[prism];" +
      "[4:a]lowpass=f=180,afade=t=in:st=0:d=0.02,afade=t=out:st=0.07:d=0.58,adelay=860:all=1,volume=0.25[sub];" +
      "[a][b][c][prism][sub]amix=inputs=5:normalize=0,alimiter=limit=0.8:attack=3:release=85,pan=stereo|c0=c0|c1=c0[out]",
  },
  {
    file: "07-youtube-cta.wav",
    inputs: [
      "sine=frequency=660:sample_rate=48000:duration=0.36",
      "sine=frequency=790:sample_rate=48000:duration=0.36",
      "sine=frequency=990:sample_rate=48000:duration=0.42",
      "anoisesrc=color=pink:duration=1.35:sample_rate=48000:amplitude=0.13",
    ],
    filter:
      "[0:a]afade=t=in:st=0:d=0.01,afade=t=out:st=0.03:d=0.3,adelay=820:all=1,aecho=0.55:0.2:65:0.12,volume=0.24[a];" +
      "[1:a]afade=t=in:st=0:d=0.01,afade=t=out:st=0.03:d=0.3,adelay=1480:all=1,aecho=0.55:0.2:65:0.12,volume=0.22[b];" +
      "[2:a]afade=t=in:st=0:d=0.01,afade=t=out:st=0.04:d=0.34,adelay=2140:all=1,aecho=0.58:0.22:72:0.14,volume=0.22[c];" +
      "[3:a]highpass=f=750,lowpass=f=6200,afade=t=in:st=0:d=0.32,afade=t=out:st=0.65:d=0.66,adelay=2100:all=1,volume=0.22[shine];" +
      "[a][b][c][shine]amix=inputs=4:normalize=0,alimiter=limit=0.74:attack=3:release=80,pan=stereo|c0=c0|c1=c0[out]",
  },
  {
    file: "08-outro-particle-signature.wav",
    inputs: [
      "anoisesrc=color=pink:duration=4:sample_rate=48000:amplitude=0.2",
      "sine=frequency=1180:sample_rate=48000:duration=0.55",
      "sine=frequency=1540:sample_rate=48000:duration=0.48",
      "sine=frequency=82:sample_rate=48000:duration=1.65",
    ],
    filter:
      "[0:a]highpass=f=1100,lowpass=f=8200,afade=t=in:st=0:d=0.9,afade=t=out:st=2.45:d=1.5,volume=0.32[particles];" +
      "[1:a]afade=t=in:st=0:d=0.01,afade=t=out:st=0.04:d=0.45,adelay=720:all=1,aecho=0.6:0.2:90:0.16,volume=0.11[a];" +
      "[2:a]afade=t=in:st=0:d=0.01,afade=t=out:st=0.04:d=0.4,adelay=1420:all=1,aecho=0.6:0.2:78:0.14,volume=0.09[b];" +
      "[3:a]lowpass=f=220,afade=t=in:st=0:d=0.2,afade=t=out:st=0.45:d=1.15,adelay=1680:all=1,volume=0.2[sub];" +
      "[particles][a][b][sub]amix=inputs=4:normalize=0,alimiter=limit=0.72:attack=5:release=100,pan=stereo|c0=c0|c1=c0[out]",
  },
];

for (const effect of effects) {
  const args = ["-y", "-hide_banner", "-loglevel", "error"];
  for (const input of effect.inputs) args.push("-f", "lavfi", "-i", input);
  args.push(
    "-filter_complex",
    `${effect.filter};[out]apad=whole_dur=4,loudnorm=I=-21:LRA=7:TP=-3[final]`,
    "-map",
    "[final]",
    "-t",
    "4",
    "-ar",
    "48000",
    "-ac",
    "2",
    "-c:a",
    "pcm_s16le",
    path.join(outputRoot, effect.file),
  );
  execFileSync("ffmpeg", args, { stdio: "inherit" });
}

writeFileSync(
  path.join(outputRoot, "local-sfx-manifest.json"),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      generator: "FFmpeg lavfi",
      effects: effects.map(({ file }) => ({
        file,
        durationSeconds: 4,
        sampleRate: 48000,
        channels: 2,
      })),
    },
    null,
    2,
  )}\n`,
);

console.log(`Generated ${effects.length} original local SFX masters in ${outputRoot}`);
