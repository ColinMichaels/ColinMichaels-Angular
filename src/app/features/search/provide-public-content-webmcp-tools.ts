import {DOCUMENT} from '@angular/common';
import {
  DestroyRef,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';

import {PublicAgentContentService} from './services/public-agent-content.service';
import {createPublicContentWebMcpTools} from './webmcp-public-content.tools';

type BrowserModelContext = {
  registerTool(tool: unknown, options: { signal: AbortSignal }): Promise<void>;
};

type BrowserDocument = Document & { modelContext?: BrowserModelContext };
type BrowserNavigator = Navigator & { modelContext?: BrowserModelContext };

/**
 * Registers the public tools directly with the browser WebMCP bridge.
 *
 * Angular's experimental provider executes tool callbacks through its
 * injection-context wrapper. Chromium currently serializes the unresolved
 * Zone-managed promise from that wrapper instead of awaiting it. Capturing
 * the injected service before registration keeps the callback framework-free
 * at the browser bridge while retaining the same public server boundary.
 */
export function providePublicContentWebMcpTools() {
  return makeEnvironmentProviders([
    provideEnvironmentInitializer(() => {
      const document = inject(DOCUMENT) as BrowserDocument;
      const modelContext = document.modelContext
        ?? (document.defaultView?.navigator as BrowserNavigator | undefined)?.modelContext;
      if (!modelContext || typeof modelContext.registerTool !== 'function') {
        return;
      }

      const abortController = new AbortController();
      inject(DestroyRef).onDestroy(() => abortController.abort());

      for (const tool of createPublicContentWebMcpTools(inject(PublicAgentContentService))) {
        void modelContext.registerTool(tool, {signal: abortController.signal}).catch(() => {
          // Browser WebMCP is progressive enhancement; a rejected registration
          // must not affect the normal public-site startup path.
        });
      }
    }),
  ]);
}
