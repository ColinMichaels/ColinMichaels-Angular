import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const renders = [
  [
    "Facebook-1200x630",
    "output/social/facebook-reader-membership-1200x630.png",
  ],
  [
    "Instagram-1080x1350",
    "output/social/instagram-reader-membership-1080x1350.png",
  ],
  [
    "Threads-1080x1350",
    "output/social/threads-reader-membership-1080x1350.png",
  ],
  ["X-1600x900", "output/social/x-reader-membership-1600x900.png"],
  [
    "LinkedIn-1200x627",
    "output/social/linkedin-reader-membership-1200x627.png",
  ],
  ["YouTube-1200x675", "output/social/youtube-reader-membership-1200x675.png"],
];

mkdirSync("output/social", { recursive: true });

for (const [composition, output] of renders) {
  execFileSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["remotion", "still", composition, output],
    { stdio: "inherit" },
  );
}
