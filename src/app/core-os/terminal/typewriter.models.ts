export type TypingMode = 'default' | 'glitch' | 'system' | 'dramatic';

export interface TypewriterLine {
  text: string;
  speed?: number;
  mode?: TypingMode;
  agent: 'user' | 'system';
  pauseAfter?: number;
  showPath?: boolean;
  onCharTyped?: (char: string, index: number, mode: TypingMode) => void;
  onBegin?: () => void;
  onComplete?: () => void;
}

export interface CompletedLineEvent {
  text: string;
  agent: 'user' | 'system';
}
