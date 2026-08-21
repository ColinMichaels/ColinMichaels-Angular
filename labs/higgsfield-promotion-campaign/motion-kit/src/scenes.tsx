import { loadFont } from "@remotion/fonts";
import { Audio, Video } from "@remotion/media";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";

// Fonts and exact copy are rendered locally. Generated video is used only as a
// text-free motion master so AI artifacts cannot silently alter brand language.
void Promise.all([
  loadFont({
    family: "Lexend",
    url: staticFile("generated/fonts/lexend-latin.woff2"),
    weight: "700",
  }),
  loadFont({
    family: "Source Sans 3",
    url: staticFile("generated/fonts/source-sans-3-normal-latin.woff2"),
    weight: "400",
  }),
]);

const COLORS = {
  background: "#09090b",
  cyan: "#22d3ee",
  cyanLight: "#67e8f9",
  heading: "#fafafa",
  muted: "#a1a1aa",
  panel: "rgba(9, 9, 11, 0.72)",
  red: "#ff0033",
} as const;

const headingFont = "Lexend, sans-serif";
const bodyFont = '"Source Sans 3", sans-serif';

type SoundProps = { readonly withSfx: boolean };
type VisualAssetProps = SoundProps & {
  readonly audioFile: string;
  readonly videoFile: string;
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const MotionBackground = ({ videoFile }: { readonly videoFile: string }) => (
  <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
    <Video
      muted
      objectFit="cover"
      src={staticFile(`generated/video/${videoFile}`)}
      style={{ height: "100%", width: "100%" }}
    />
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 50% 45%, transparent 20%, rgba(2,6,23,0.08) 58%, rgba(2,6,23,0.46) 100%)",
      }}
    />
  </AbsoluteFill>
);

const OptionalAudio = ({
  audioFile,
  withSfx,
}: {
  readonly audioFile: string;
  readonly withSfx: boolean;
}) =>
  withSfx ? (
    <Audio
      src={staticFile(`generated/audio/${audioFile}`)}
      volume={(frame) =>
        interpolate(frame, [0, 8, 108, 119], [0, 0.9, 0.9, 0], {
          ...clamp,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        })
      }
    />
  ) : null;

const BrandMark = ({ compact = false }: { readonly compact?: boolean }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        gap: compact ? 24 : 36,
        opacity: interpolate(frame, [12, 34], [0, 1], {
          ...clamp,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
        translate: `${interpolate(frame, [12, 34], [-34, 0], clamp)}px 0`,
      }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 92 48"
        style={{ height: compact ? 62 : 94, width: compact ? 118 : 176 }}
      >
        <path
          d="M2 36c10 0 15-2 21-10 5-7 10-15 16-15 7 0 10 12 17 13 6 1 9-8 15-8 7 0 12 12 19 16"
          fill="none"
          stroke={COLORS.cyan}
          strokeLinecap="round"
          strokeWidth="3"
        />
        <path
          d="m28 28 12-20 10 16 8-12 17 22"
          fill="none"
          stroke={COLORS.heading}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
      </svg>
      <div>
        <div
          style={{
            color: COLORS.heading,
            fontFamily: headingFont,
            fontSize: compact ? 50 : 82,
            fontWeight: 700,
            letterSpacing: compact ? 8 : 12,
            lineHeight: 1,
          }}
        >
          COLIN MICHAELS
        </div>
        <div
          style={{
            color: COLORS.cyanLight,
            fontFamily: bodyFont,
            fontSize: compact ? 24 : 34,
            fontWeight: 700,
            letterSpacing: compact ? 7 : 11,
            marginTop: compact ? 16 : 24,
          }}
        >
          EXPLORE. LEARN. CREATE.
        </div>
      </div>
    </div>
  );
};

export const VisualAsset = ({ audioFile, videoFile, withSfx }: VisualAssetProps) => (
  <AbsoluteFill>
    <MotionBackground videoFile={videoFile} />
    <OptionalAudio audioFile={audioFile} withSfx={withSfx} />
  </AbsoluteFill>
);

export const IntroBlank = () => <MotionBackground videoFile="01-intro-wave-horizon.mp4" />;

export const IntroExample = ({ withSfx }: SoundProps) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <MotionBackground videoFile="01-intro-wave-horizon.mp4" />
      <AbsoluteFill
        style={{ alignItems: "center", justifyContent: "center", padding: "100px 120px" }}
      >
        <div
          style={{
            alignItems: "center",
            display: "flex",
            flexDirection: "column",
            translate: "0 -72px",
          }}
        >
          <BrandMark />
          <div
            style={{
              color: COLORS.muted,
              fontFamily: bodyFont,
              fontSize: 30,
              letterSpacing: 9,
              marginTop: 54,
              opacity: interpolate(frame, [40, 62], [0, 1], clamp),
            }}
          >
            IDEAS • BUILDS • STORIES
          </div>
        </div>
      </AbsoluteFill>
      <OptionalAudio audioFile="01-intro-wave-horizon.wav" withSfx={withSfx} />
    </AbsoluteFill>
  );
};

export const OutroBlank = () => <MotionBackground videoFile="02-outro-end-screen-background.mp4" />;

const EndCard = ({ delay, label }: { readonly delay: number; readonly label: string }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        alignItems: "center",
        background: "rgba(2, 6, 23, 0.32)",
        border: "2px solid rgba(103, 232, 249, 0.36)",
        borderRadius: 28,
        color: COLORS.cyanLight,
        display: "flex",
        fontFamily: bodyFont,
        fontSize: 30,
        height: 270,
        justifyContent: "center",
        letterSpacing: 4,
        opacity: interpolate(frame, [delay, delay + 18], [0, 1], clamp),
        scale: interpolate(frame, [delay, delay + 18], [0.94, 1], clamp),
        width: 480,
      }}
    >
      {label}
    </div>
  );
};

export const OutroExample = ({ withSfx }: SoundProps) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <MotionBackground videoFile="08-outro-particle-signature.mp4" />
      <AbsoluteFill
        style={{
          display: "grid",
          gap: 80,
          gridTemplateColumns: "0.9fr 1.1fr",
          padding: "120px 130px",
        }}
      >
        <div style={{ alignSelf: "center", display: "flex", flexDirection: "column", gap: 42 }}>
          <div
            style={{
              color: COLORS.cyanLight,
              fontFamily: bodyFont,
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: 8,
              opacity: interpolate(frame, [10, 28], [0, 1], clamp),
            }}
          >
            THANKS FOR WATCHING
          </div>
          <BrandMark compact />
          <div
            style={{
              color: COLORS.heading,
              fontFamily: headingFont,
              fontSize: 46,
              opacity: interpolate(frame, [52, 72], [0, 1], clamp),
            }}
          >
            colinmichaels.com
          </div>
        </div>
        <div
          style={{
            alignItems: "center",
            display: "grid",
            gap: 34,
            gridTemplateColumns: "1fr",
            justifyItems: "end",
          }}
        >
          <EndCard delay={30} label="WATCH NEXT" />
          <EndCard delay={46} label="MORE FROM COLIN" />
        </div>
      </AbsoluteFill>
      <OptionalAudio audioFile="08-outro-particle-signature.wav" withSfx={withSfx} />
    </AbsoluteFill>
  );
};

const ActionIcon = ({ kind }: { readonly kind: "subscribe" | "like" | "share" }) => {
  if (kind === "subscribe") {
    return (
      <svg viewBox="0 0 64 64" style={{ height: 68, width: 68 }} aria-hidden="true">
        <rect x="4" y="12" width="56" height="40" rx="12" fill={COLORS.red} />
        <path d="m27 23 17 9-17 9Z" fill="white" />
      </svg>
    );
  }
  if (kind === "like") {
    return (
      <svg
        viewBox="0 0 64 64"
        style={{ height: 68, width: 68 }}
        fill="none"
        stroke={COLORS.cyanLight}
        strokeWidth="4"
        aria-hidden="true"
      >
        <path d="M24 27 34 9c6 2 7 7 5 16h12c5 0 7 4 6 8l-4 17c-1 4-4 6-8 6H24Z" />
        <path d="M9 27h15v29H9Z" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 64 64"
      style={{ height: 68, width: 68 }}
      fill="none"
      stroke={COLORS.cyanLight}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="4"
      aria-hidden="true"
    >
      <path d="m36 13 17 17-17 17V36C23 36 15 40 9 51c2-19 12-30 27-32Z" />
    </svg>
  );
};

const ActionCard = ({
  delay,
  kind,
  label,
}: {
  readonly delay: number;
  readonly kind: "subscribe" | "like" | "share";
  readonly label: string;
}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        alignItems: "center",
        background: kind === "subscribe" ? "rgba(255,0,51,0.08)" : "rgba(34,211,238,0.07)",
        border: `2px solid ${kind === "subscribe" ? "rgba(255,0,51,0.7)" : "rgba(103,232,249,0.48)"}`,
        borderRadius: 24,
        display: "flex",
        flexDirection: "column",
        gap: 18,
        height: 220,
        justifyContent: "center",
        opacity: interpolate(frame, [delay, delay + 14], [0, 1], {
          ...clamp,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
        scale: interpolate(frame, [delay, delay + 14], [0.82, 1], {
          ...clamp,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
      }}
    >
      <ActionIcon kind={kind} />
      <div
        style={{ color: COLORS.heading, fontFamily: headingFont, fontSize: 34, letterSpacing: 4 }}
      >
        {label}
      </div>
    </div>
  );
};

export const SubscribeLikeShare = ({ withSfx }: SoundProps) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <MotionBackground videoFile="07-youtube-cta-background.mp4" />
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "100px 190px 130px",
        }}
      >
        <div
          style={{
            color: COLORS.heading,
            fontFamily: headingFont,
            fontSize: 96,
            letterSpacing: -3,
            lineHeight: 1,
            opacity: interpolate(frame, [8, 26], [0, 1], clamp),
            textAlign: "center",
          }}
        >
          Keep the ideas moving.
        </div>
        <div
          style={{
            color: COLORS.cyanLight,
            fontFamily: bodyFont,
            fontSize: 38,
            letterSpacing: 6,
            marginTop: 28,
            opacity: interpolate(frame, [20, 38], [0, 1], clamp),
            textAlign: "center",
          }}
        >
          SUBSCRIBE • LIKE • SHARE
        </div>
        <div
          style={{ display: "grid", gap: 28, gridTemplateColumns: "repeat(3, 1fr)", marginTop: 70 }}
        >
          <ActionCard delay={28} kind="subscribe" label="SUBSCRIBE" />
          <ActionCard delay={42} kind="like" label="LIKE" />
          <ActionCard delay={56} kind="share" label="SHARE" />
        </div>
        <div
          style={{
            color: COLORS.muted,
            fontFamily: bodyFont,
            fontSize: 30,
            marginTop: 40,
            opacity: interpolate(frame, [68, 84], [0, 1], clamp),
            textAlign: "center",
          }}
        >
          More projects, stories, and practical experiments at colinmichaels.com
        </div>
      </AbsoluteFill>
      <OptionalAudio audioFile="07-youtube-cta.wav" withSfx={withSfx} />
    </AbsoluteFill>
  );
};

const ImageFrame = ({ blank = false }: { readonly blank?: boolean }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        background: "rgba(9,9,11,0.68)",
        border: "2px solid rgba(103,232,249,0.38)",
        borderRadius: 30,
        boxShadow: "0 38px 90px rgba(0,0,0,0.48)",
        height: 610,
        opacity: interpolate(frame, [10, 32], [0, 1], clamp),
        overflow: "hidden",
        scale: interpolate(frame, [10, 32], [0.94, 1], clamp),
        width: 900,
      }}
    >
      {blank ? (
        <div
          style={{
            alignItems: "center",
            display: "flex",
            height: "100%",
            justifyContent: "center",
          }}
        />
      ) : (
        <Img
          src={staticFile("generated/images/colin-editorial-workspace.webp")}
          style={{
            height: "100%",
            objectFit: "cover",
            scale: interpolate(frame, [0, 119], [1.08, 1], clamp),
            translate: `${interpolate(frame, [0, 119], [-18, 0], clamp)}px 0`,
            width: "100%",
          }}
        />
      )}
    </div>
  );
};

export const ImageStoryExample = ({ withSfx }: SoundProps) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <MotionBackground videoFile="02-outro-end-screen-background.mp4" />
      <AbsoluteFill
        style={{
          display: "grid",
          gap: 88,
          gridTemplateColumns: "1.1fr 0.9fr",
          padding: "120px 130px",
        }}
      >
        <div style={{ alignSelf: "center" }}>
          <ImageFrame />
        </div>
        <div style={{ alignSelf: "center", display: "flex", flexDirection: "column", gap: 32 }}>
          <div
            style={{
              color: COLORS.cyanLight,
              fontFamily: bodyFont,
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: 7,
              opacity: interpolate(frame, [28, 46], [0, 1], clamp),
            }}
          >
            COLINMICHAELS.COM
          </div>
          <div
            style={{
              color: COLORS.heading,
              fontFamily: headingFont,
              fontSize: 92,
              letterSpacing: -3,
              lineHeight: 1.02,
              opacity: interpolate(frame, [38, 58], [0, 1], clamp),
              translate: `${interpolate(frame, [38, 58], [30, 0], clamp)}px 0`,
            }}
          >
            Ideas worth exploring.
          </div>
          <div
            style={{
              color: COLORS.muted,
              fontFamily: bodyFont,
              fontSize: 42,
              lineHeight: 1.3,
              opacity: interpolate(frame, [56, 76], [0, 1], clamp),
            }}
          >
            Technology, creativity, and the work behind both.
          </div>
        </div>
      </AbsoluteFill>
      <OptionalAudio audioFile="02-outro-end-screen.wav" withSfx={withSfx} />
    </AbsoluteFill>
  );
};

export const ImageStoryBlank = () => (
  <AbsoluteFill>
    <MotionBackground videoFile="02-outro-end-screen-background.mp4" />
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "120px" }}>
      <ImageFrame blank />
    </AbsoluteFill>
  </AbsoluteFill>
);
