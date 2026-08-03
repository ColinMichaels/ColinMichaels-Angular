import {Injectable, inject} from '@angular/core';
import {Functions, httpsCallable} from 'firebase/functions';

import {FIREBASE_FUNCTIONS} from '../../../services/firebase/firebase.tokens';

export interface BlogMediaVariant {
  contentType: 'image/avif' | 'image/webp' | 'image/jpeg';
  format: 'avif' | 'webp' | 'jpeg';
  height: number;
  size: number;
  storagePath: string;
  url: string;
  width: number;
}

export interface FinalizedBlogMedia {
  checksum: string;
  contentType: 'image/webp';
  downloadUrl: string;
  height: number;
  mediaId: string;
  originalContentType: string;
  originalName: string;
  originalSize: number;
  size: number;
  storagePath: string;
  variants: readonly BlogMediaVariant[];
  width: number;
}

export interface FinalizeBlogMediaRequest {
  altText: string;
  declaredContentType: string;
  mediaId: string;
  originalName: string;
  role: string;
  slug: string;
  stagingPath: string;
}

export interface BlogMediaDeleteReport {
  deleted: boolean;
  mediaId: string;
  references: readonly {postId: string; slug: string; matches: number}[];
  storageObjectCount: number;
}

@Injectable({providedIn: 'root'})
export class BlogMediaFunctionsService {
  private readonly functions = inject(FIREBASE_FUNCTIONS, {optional: true});

  async finalizeUpload(request: FinalizeBlogMediaRequest): Promise<FinalizedBlogMedia> {
    const callable = httpsCallable<FinalizeBlogMediaRequest, FinalizedBlogMedia>(
      this.getFunctions(),
      'finalizeBlogMedia'
    );
    return (await callable(request)).data;
  }

  async inspectDelete(mediaId: string): Promise<BlogMediaDeleteReport> {
    return this.deleteRequest(mediaId, false);
  }

  async confirmDelete(mediaId: string): Promise<BlogMediaDeleteReport> {
    return this.deleteRequest(mediaId, true);
  }

  private async deleteRequest(mediaId: string, confirmDelete: boolean): Promise<BlogMediaDeleteReport> {
    const callable = httpsCallable<{mediaId: string; confirmDelete: boolean}, BlogMediaDeleteReport>(
      this.getFunctions(),
      'deleteBlogMedia'
    );
    return (await callable({mediaId, confirmDelete})).data;
  }

  private getFunctions(): Functions {
    if (!this.functions) {
      throw new Error('Firebase Functions is not initialized.');
    }
    return this.functions;
  }
}
