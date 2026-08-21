import "./index.css";
import { Composition, Folder } from "remotion";
import {
  ImageStoryBlank,
  ImageStoryExample,
  IntroBlank,
  IntroExample,
  OutroBlank,
  OutroExample,
  SubscribeLikeShare,
  VisualAsset,
} from "./scenes";

// Keep every deliverable on one editorial interchange spec. Audio remains opt-in
// so opening a composition or embedding a render never produces surprise sound.
const VIDEO = { durationInFrames: 120, fps: 30, height: 1080, width: 1920 } as const;
const defaultProps = { withSfx: false };

export const RemotionRoot: React.FC = () => (
  <>
    <Folder name="Examples">
      <Composition
        id="CM-Intro-Example"
        component={IntroExample}
        {...VIDEO}
        defaultProps={defaultProps}
      />
      <Composition
        id="CM-Outro-Example"
        component={OutroExample}
        {...VIDEO}
        defaultProps={defaultProps}
      />
      <Composition
        id="CM-Subscribe-Like-Share"
        component={SubscribeLikeShare}
        {...VIDEO}
        defaultProps={defaultProps}
      />
      <Composition
        id="CM-Image-Story-Example"
        component={ImageStoryExample}
        {...VIDEO}
        defaultProps={defaultProps}
      />
    </Folder>
    <Folder name="Blank-Slates">
      <Composition
        id="CM-Intro-Blank"
        component={IntroBlank}
        {...VIDEO}
        defaultProps={defaultProps}
      />
      <Composition
        id="CM-Outro-Blank"
        component={OutroBlank}
        {...VIDEO}
        defaultProps={defaultProps}
      />
      <Composition
        id="CM-Image-Story-Blank"
        component={ImageStoryBlank}
        {...VIDEO}
        defaultProps={defaultProps}
      />
    </Folder>
    <Folder name="Transitions-and-Stingers">
      <Composition
        id="CM-Transition-Signal-Wipe"
        component={VisualAsset}
        {...VIDEO}
        defaultProps={{
          audioFile: "03-transition-signal-wipe.wav",
          videoFile: "03-transition-signal-wipe.mp4",
          withSfx: false,
        }}
      />
      <Composition
        id="CM-Transition-Optical-Iris"
        component={VisualAsset}
        {...VIDEO}
        defaultProps={{
          audioFile: "04-transition-optical-iris.wav",
          videoFile: "04-transition-optical-iris.mp4",
          withSfx: false,
        }}
      />
      <Composition
        id="CM-Stinger-Wave-Pulse"
        component={VisualAsset}
        {...VIDEO}
        defaultProps={{
          audioFile: "05-stinger-wave-pulse.wav",
          videoFile: "05-stinger-wave-pulse.mp4",
          withSfx: false,
        }}
      />
      <Composition
        id="CM-Stinger-Prism"
        component={VisualAsset}
        {...VIDEO}
        defaultProps={{
          audioFile: "06-stinger-prism-intersect.wav",
          videoFile: "06-stinger-prism-intersect.mp4",
          withSfx: false,
        }}
      />
    </Folder>
  </>
);
