import { loadFont } from "@remotion/fonts";
import {
  AbsoluteFill,
  Composition,
  Easing,
  Folder,
  Img,
  Interactive,
  Sequence,
  Still,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

void loadFont({
  family: "Lexend",
  url: staticFile("fonts/lexend-latin.woff2"),
  weight: "700",
});
void loadFont({
  family: "Source Sans 3",
  url: staticFile("fonts/source-sans-3-latin.woff2"),
  weight: "400",
});

const COLORS = {
  background: "#09090b",
  panel: "#18181b",
  cyan: "#22d3ee",
  cyanLight: "#a5f3fc",
  teal: "#2dd4bf",
  heading: "#fafafa",
  text: "#d4d4d8",
  muted: "#a1a1aa",
} as const;

const headingFont = "Lexend, sans-serif";
const bodyFont = '"Source Sans 3", sans-serif';

type SocialCardProps = {
  readonly platform: string;
  readonly compact: boolean;
};

type PromoVideoProps = {
  readonly destination: string;
};

const Brand = ({ compact = false }: { readonly compact?: boolean }) => (
  <Interactive.Div
    name="Colin Michaels brand"
    style={{
      alignItems: "center",
      display: "flex",
      gap: compact ? 14 : 20,
    }}
  >
    <svg
      aria-hidden="true"
      viewBox="0 0 92 48"
      style={{ height: compact ? 34 : 44, width: compact ? 66 : 84 }}
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
          fontSize: compact ? 21 : 28,
          fontWeight: 700,
          letterSpacing: compact ? 3.5 : 5,
        }}
      >
        COLIN MICHAELS
      </div>
      <div
        style={{
          color: COLORS.cyan,
          fontFamily: bodyFont,
          fontSize: compact ? 11 : 14,
          fontWeight: 700,
          letterSpacing: compact ? 3.5 : 5,
          marginTop: 5,
        }}
      >
        EXPLORE. LEARN. CREATE.
      </div>
    </div>
  </Interactive.Div>
);

const CampaignBackground = ({ frame = 0 }: { readonly frame?: number }) => (
  <AbsoluteFill
    style={{
      backgroundColor: COLORS.background,
      backgroundImage: [
        `radial-gradient(circle at 72% 48%, rgba(34,211,238,${0.1 + interpolate(frame, [0, 120], [0, 0.07], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}) 0%, transparent 33%)`,
        "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)",
        "linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
      ].join(","),
      backgroundSize: "auto, 64px 64px, 64px 64px",
    }}
  />
);

const CampaignArtwork = ({
  compact = false,
  frame = 0,
}: {
  readonly compact?: boolean;
  readonly frame?: number;
}) => (
  <Interactive.Div
    name="Reader member pass artwork"
    style={{
      alignItems: "center",
      display: "flex",
      justifyContent: "center",
      minHeight: 0,
      position: "relative",
    }}
  >
    <div
      style={{
        background:
          "radial-gradient(circle, rgba(34,211,238,0.22), transparent 64%)",
        borderRadius: "50%",
        height: compact ? 520 : 740,
        opacity: interpolate(frame, [0, 60, 120], [0.4, 0.75, 0.45], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
        position: "absolute",
        scale: interpolate(frame, [0, 120], [0.9, 1.05], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        width: compact ? 520 : 740,
      }}
    />
    <Img
      src={staticFile("reader-membership-master.png")}
      style={{
        height: compact ? "92%" : "100%",
        maxHeight: compact ? 620 : 910,
        mixBlendMode: "screen",
        objectFit: "contain",
        position: "relative",
        translate: `0 ${interpolate(frame, [0, 90, 180], [12, -10, 8], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.45, 0, 0.55, 1),
        })}px`,
        width: "100%",
      }}
    />
  </Interactive.Div>
);

const Benefit = ({
  compact = false,
  label,
  type,
}: {
  readonly compact?: boolean;
  readonly label: string;
  readonly type: "comment" | "points" | "alert";
}) => (
  <div
    style={{
      alignItems: "center",
      borderTop: "1px solid rgba(255,255,255,0.12)",
      display: "flex",
      gap: compact ? 14 : 18,
      minHeight: compact ? 52 : 72,
    }}
  >
    <div
      style={{
        alignItems: "center",
        border: `1.5px solid ${COLORS.cyan}`,
        borderRadius: 999,
        color: COLORS.cyan,
        display: "flex",
        height: compact ? 34 : 42,
        justifyContent: "center",
        width: compact ? 34 : 42,
      }}
    >
      {type === "comment" ? (
        <svg
          viewBox="0 0 24 24"
          style={{ height: compact ? 17 : 21, width: compact ? 17 : 21 }}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M5 5.5h14v10H9l-4 3v-13Z" />
        </svg>
      ) : type === "points" ? (
        <svg
          viewBox="0 0 24 24"
          style={{ height: compact ? 17 : 21, width: compact ? 17 : 21 }}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="m12 3 2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.8-5.1 2.8 1-5.7-4.1-4 5.7-.8L12 3Z" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          style={{ height: compact ? 17 : 21, width: compact ? 17 : 21 }}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 6-2.5 6.5-2.5 8.5h17C20.5 14.5 18 14 18 8Z" />
          <path d="M10 20h4" />
        </svg>
      )}
    </div>
    <div
      style={{
        color: COLORS.text,
        fontFamily: bodyFont,
        fontSize: compact ? 21 : 27,
        fontWeight: 700,
      }}
    >
      {label}
    </div>
  </div>
);

const SocialCard = ({ platform, compact }: SocialCardProps) => {
  const portrait = compact;

  return (
    <AbsoluteFill
      style={{ color: COLORS.text, fontFamily: bodyFont, overflow: "hidden" }}
    >
      <CampaignBackground />
      <Interactive.Div
        name={`${platform} campaign layout`}
        style={{
          display: "grid",
          gridTemplateColumns: portrait ? "1fr" : "1.05fr 0.95fr",
          gridTemplateRows: portrait ? "auto 1fr auto" : "1fr",
          height: "100%",
          padding: portrait ? "66px 68px 62px" : "42px 56px",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gridColumn: portrait ? "1" : "1",
            gridRow: portrait ? "1" : "1",
            justifyContent: "flex-start",
            zIndex: 2,
          }}
        >
          <Brand compact />
          <div style={{ marginTop: portrait ? 48 : 24 }}>
            <h1
              style={{
                color: COLORS.heading,
                fontFamily: headingFont,
                fontSize: portrait ? 76 : 60,
                fontWeight: 700,
                letterSpacing: -3,
                lineHeight: 1.02,
                margin: 0,
                maxWidth: portrait ? 900 : 650,
              }}
            >
              Get more from every post.
            </h1>
            <p
              style={{
                color: COLORS.muted,
                fontFamily: bodyFont,
                fontSize: portrait ? 31 : 24,
                lineHeight: 1.42,
                margin: portrait ? "24px 0 0" : "16px 0 0",
                maxWidth: portrait ? 850 : 620,
              }}
            >
              Comment. Earn reader points. Choose browser alerts, email updates,
              or the newsletter.
            </p>
          </div>
          {!portrait ? (
            <div style={{ marginTop: 22 }}>
              <Benefit compact label="Join the conversation" type="comment" />
              <Benefit
                compact
                label="Earn points as you read and share"
                type="points"
              />
              <Benefit
                compact
                label="Hear about new posts sooner"
                type="alert"
              />
            </div>
          ) : null}
          {!portrait ? (
            <div
              style={{
                color: COLORS.cyanLight,
                fontFamily: headingFont,
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: 0.5,
                marginTop: 16,
              }}
            >
              colinmichaels.com/blog
            </div>
          ) : null}
        </div>

        <div
          style={{
            gridColumn: portrait ? "1" : "2",
            gridRow: portrait ? "2" : "1",
            minHeight: 0,
            padding: portrait ? "24px 0 12px" : "0",
          }}
        >
          <CampaignArtwork compact={portrait} />
        </div>

        {portrait ? (
          <div style={{ gridColumn: "1", gridRow: "3", zIndex: 2 }}>
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.14)",
                color: COLORS.heading,
                display: "flex",
                fontFamily: headingFont,
                fontSize: 30,
                fontWeight: 700,
                justifyContent: "space-between",
                paddingTop: 25,
              }}
            >
              <span>Create a free reader account</span>
              <span style={{ color: COLORS.cyanLight }}>
                colinmichaels.com/blog
              </span>
            </div>
          </div>
        ) : null}
      </Interactive.Div>
    </AbsoluteFill>
  );
};

const IntroScene = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        display: "flex",
        justifyContent: "center",
        padding: "170px 84px 190px",
      }}
    >
      <Interactive.Div
        name="Opening message"
        style={{
          opacity: interpolate(frame, [0, 18, 72, 88], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          textAlign: "center",
          translate: `0 ${interpolate(frame, [0, 22], [44, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          })}px`,
        }}
      >
        <h1
          style={{
            color: COLORS.heading,
            fontFamily: headingFont,
            fontSize: 118,
            letterSpacing: -6,
            lineHeight: 1.02,
            margin: 0,
          }}
        >
          Get more from every post.
        </h1>
        <p
          style={{
            color: COLORS.muted,
            fontFamily: bodyFont,
            fontSize: 49,
            lineHeight: 1.35,
            margin: "42px auto 0",
            maxWidth: 820,
          }}
        >
          A free reader account opens the conversation.
        </p>
      </Interactive.Div>
    </AbsoluteFill>
  );
};

const BenefitsScene = () => {
  const frame = useCurrentFrame();
  const benefits = [
    { label: "Comment on posts", type: "comment" as const },
    { label: "Earn points for reading and sharing", type: "points" as const },
    { label: "Save the updates you want", type: "alert" as const },
  ];

  return (
    <AbsoluteFill style={{ padding: "160px 84px 170px" }}>
      <Interactive.Div
        name="Reader benefits"
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "center",
        }}
      >
        <h2
          style={{
            color: COLORS.heading,
            fontFamily: headingFont,
            fontSize: 92,
            letterSpacing: -4,
            lineHeight: 1.05,
            margin: 0,
            opacity: interpolate(frame, [0, 16], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          Read. Connect. Grow.
        </h2>
        <div style={{ display: "grid", gap: 30, marginTop: 72 }}>
          {benefits.map((benefit, index) => (
            <div
              key={benefit.label}
              style={{
                opacity: interpolate(
                  frame,
                  [16 + index * 18, 34 + index * 18],
                  [0, 1],
                  {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                    easing: Easing.bezier(0.16, 1, 0.3, 1),
                  },
                ),
                translate: `${interpolate(
                  frame,
                  [16 + index * 18, 34 + index * 18],
                  [70, 0],
                  {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                    easing: Easing.bezier(0.16, 1, 0.3, 1),
                  },
                )}px 0`,
              }}
            >
              <Benefit label={benefit.label} type={benefit.type} />
            </div>
          ))}
        </div>
      </Interactive.Div>
    </AbsoluteFill>
  );
};

const AlertsScene = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "170px 84px",
      }}
    >
      <Interactive.Div
        name="Browser notification preference"
        style={{
          background: "rgba(24,24,27,0.92)",
          border: "1px solid rgba(34,211,238,0.45)",
          borderRadius: 38,
          boxShadow: "0 32px 90px rgba(0,0,0,0.45)",
          opacity: interpolate(frame, [0, 18, 98, 118], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          padding: "62px 58px",
          scale: interpolate(frame, [0, 22], [0.92, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          width: "100%",
        }}
      >
        <div
          style={{
            color: COLORS.heading,
            fontFamily: headingFont,
            fontSize: 71,
            fontWeight: 700,
            lineHeight: 1.08,
          }}
        >
          Hear about new posts sooner.
        </div>
        <div
          style={{
            alignItems: "center",
            borderTop: "1px solid rgba(255,255,255,0.12)",
            display: "flex",
            justifyContent: "space-between",
            marginTop: 58,
            paddingTop: 46,
          }}
        >
          <div>
            <div
              style={{
                color: COLORS.text,
                fontFamily: bodyFont,
                fontSize: 48,
                fontWeight: 700,
              }}
            >
              Browser alerts
            </div>
            <div
              style={{
                color: COLORS.muted,
                fontFamily: bodyFont,
                fontSize: 34,
                marginTop: 10,
              }}
            >
              Selected during signup. Always optional.
            </div>
          </div>
          <div
            style={{
              alignItems: "center",
              background: COLORS.cyan,
              borderRadius: 999,
              display: "flex",
              height: 74,
              justifyContent: "flex-end",
              padding: 8,
              width: 132,
            }}
          >
            <div
              style={{
                background: COLORS.heading,
                borderRadius: 999,
                boxShadow: "0 5px 18px rgba(0,0,0,0.28)",
                height: 58,
                width: 58,
              }}
            />
          </div>
        </div>
      </Interactive.Div>
    </AbsoluteFill>
  );
};

const CtaScene = ({ destination }: PromoVideoProps) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        padding: "110px 76px 122px",
      }}
    >
      <div
        style={{
          opacity: interpolate(frame, [0, 18], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <Brand />
      </div>
      <div style={{ minHeight: 0, position: "relative" }}>
        <CampaignArtwork compact frame={frame} />
      </div>
      <Interactive.Div
        name="Campaign call to action"
        style={{
          opacity: interpolate(frame, [18, 42], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          textAlign: "center",
          translate: `0 ${interpolate(frame, [18, 42], [34, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          })}px`,
        }}
      >
        <div
          style={{
            color: COLORS.heading,
            fontFamily: headingFont,
            fontSize: 82,
            fontWeight: 700,
            letterSpacing: -3,
            lineHeight: 1.06,
          }}
        >
          Join the conversation.
        </div>
        <div
          style={{
            background: COLORS.cyan,
            borderRadius: 20,
            color: "#083344",
            fontFamily: headingFont,
            fontSize: 36,
            fontWeight: 700,
            marginTop: 40,
            padding: "25px 32px",
          }}
        >
          Create a free reader account
        </div>
        <div
          style={{
            color: COLORS.cyanLight,
            fontFamily: bodyFont,
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: 1,
            marginTop: 28,
          }}
        >
          {destination}
        </div>
      </Interactive.Div>
    </AbsoluteFill>
  );
};

const PromoVideo = ({ destination }: PromoVideoProps) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: COLORS.background, overflow: "hidden" }}>
      <CampaignBackground frame={frame} />
      <Sequence name="Opening" durationInFrames={90}>
        <IntroScene />
      </Sequence>
      <Sequence name="Benefits" from={78} durationInFrames={112}>
        <BenefitsScene />
      </Sequence>
      <Sequence name="Notification choice" from={180} durationInFrames={122}>
        <AlertsScene />
      </Sequence>
      <Sequence name="Call to action" from={288} durationInFrames={162}>
        <CtaScene destination={destination} />
      </Sequence>
    </AbsoluteFill>
  );
};

export const CampaignCompositions = () => (
  <>
    <Folder name="Video">
      <Composition
        id="ReaderMembershipPromo-Vertical"
        component={PromoVideo}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ destination: "colinmichaels.com/blog" }}
      />
    </Folder>

    <Folder name="Social-Stills">
      <Still
        id="Facebook-1200x630"
        component={SocialCard}
        width={1200}
        height={630}
        defaultProps={{ platform: "Facebook", compact: false }}
      />
      <Still
        id="Instagram-1080x1350"
        component={SocialCard}
        width={1080}
        height={1350}
        defaultProps={{ platform: "Instagram", compact: true }}
      />
      <Still
        id="Threads-1080x1350"
        component={SocialCard}
        width={1080}
        height={1350}
        defaultProps={{ platform: "Threads", compact: true }}
      />
      <Still
        id="X-1600x900"
        component={SocialCard}
        width={1600}
        height={900}
        defaultProps={{ platform: "X", compact: false }}
      />
      <Still
        id="LinkedIn-1200x627"
        component={SocialCard}
        width={1200}
        height={627}
        defaultProps={{ platform: "LinkedIn", compact: false }}
      />
      <Still
        id="YouTube-1200x675"
        component={SocialCard}
        width={1200}
        height={675}
        defaultProps={{ platform: "YouTube", compact: false }}
      />
    </Folder>
  </>
);
