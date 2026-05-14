import type {OutputData} from '@editorjs/editorjs';

export interface EditorSavedDocument {
  data: OutputData;
  savedAt: string;
  blockCount: number;
}
