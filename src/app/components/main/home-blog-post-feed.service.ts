import {computed, Injectable, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';

import {BlogRepositoryService} from '../../features/blog/services/blog-repository.service';

@Injectable({
  providedIn: 'root',
})
export class HomeBlogPostFeedService {
  private readonly blogRepository = inject(BlogRepositoryService);

  readonly publishedPosts = toSignal(
    this.blogRepository.getPublishedPosts$(),
    {initialValue: this.blogRepository.getPublishedPosts()}
  );
  readonly isLoading = toSignal(this.blogRepository.loading$, {initialValue: true});
  readonly loadError = toSignal(this.blogRepository.error$, {initialValue: null});
  readonly isReady = computed(() => !this.isLoading() || this.publishedPosts().length > 0);
}
