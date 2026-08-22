import {InjectionToken} from '@angular/core';

export interface FinderFileDescriptor {
  id: string;
  name: string;
  virtualPath: string;
  type: string;
  mimeType?: string;
  size?: number;
}

export interface FinderFileOpenRequest {
  file: FinderFileDescriptor;
  content: {kind: 'metadata-only'};
}

export interface FinderFileOpenResult {
  status: 'content-opened' | 'metadata-preview-launched' | 'unsupported' | 'failed';
  appId?: string;
  appTitle?: string;
}

export interface FinderFileOpener {
  open(request: FinderFileOpenRequest): FinderFileOpenResult;
}

export const FINDER_FILE_OPENER = new InjectionToken<FinderFileOpener>('FinderFileOpener');
