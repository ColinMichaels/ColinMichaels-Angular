import type {OutputData} from '@editorjs/editorjs';

export interface EditorSavedDocument {
  data: OutputData;
  savedAt: string;
  blockCount: number;
}

/**
 * Recovery preserves the editor surface exactly. Invalid JSON is intentionally
 * retained as source instead of being coerced into a publishable document.
 */
export type EditorRecoverySnapshot =
  | {mode: 'visual'; document: OutputData}
  | {mode: 'json'; source: string};
