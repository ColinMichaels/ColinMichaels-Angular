import { Injectable } from '@angular/core';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {Observable, shareReplay} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {map} from 'rxjs/operators';
import {FileExtensions} from './file-system.service';

export interface LoadedSvgIcon {
  name: string;
  type: string;
  icon: Observable<SafeHtml>;
}

/**
 * Service for managing custom SVG icons within the application. The service
 * provides functionality to fetch, sanitize, cache, and retrieve custom icons.
 * Icons are requested via HTTP and stored in a cache to minimize repeated network calls.
 * The service also provides a utility to retrieve a list of cached icon paths.
 *
 * This service is provided at the root level and can be injected into any component
 * or service across the application.
 */
@Injectable({
  providedIn: 'root',
})
export class SvgService {
  private readonly cache = new Map<string, Observable<SafeHtml>>();
  private readonly iconFolderPath = '/assets/icons/custom/';
  constructor(private http: HttpClient, private sanitizer: DomSanitizer) {}

  /**
   * Retrieves an icon as an observable containing safe HTML.
   * The method fetches the icon from the specified path, sanitizes the SVG content,
   * and caches the result to optimize repeated requests for the same resource.
   *
   * @param {string} path - The relative path to the icon file to be retrieved.
   * @return {Observable<SafeHtml>} An observable that emits the sanitized SVG content.
   */
   getIcon(path: string): Observable<SafeHtml> {
    const fullPath = this.iconFolderPath + `${path}.${FileExtensions.svg}`;
    if (this.cache.has(fullPath)) {
      return this.cache.get(fullPath)!; // Return from cache if available
    }

    const sanitizedSvg$ = this.http.get(fullPath, { responseType: 'text' }).pipe(
      map((svg: string) => this.sanitizer.bypassSecurityTrustHtml(svg)),
      shareReplay(10) // Cache the observable
    );

    this.cache.set(fullPath, sanitizedSvg$);
    return sanitizedSvg$.pipe(shareReplay(1));
  }

  loadIcons(list: readonly string[], type = 'system'): LoadedSvgIcon[] {
    return list.map((icon) => {
      return {
        name: icon,
        type: type,
        icon: this.getIcon(type + '/' + icon )
      }
    });
  }

  getIconsList() {
    return this.cache.keys();
  }

}
