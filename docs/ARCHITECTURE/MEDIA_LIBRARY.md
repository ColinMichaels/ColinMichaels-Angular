# Media Library Organizer

## Route And Boundary

- Admin route: `/admin/cms/media-library`
- Legacy route `/admin/media-library` redirects to the CMS route.
- Feature root: `src/app/admin/media-library`
- This is a protected admin feature and does not belong to the public website route group or `core-os` framework.

## Service Boundary

The organizer is a UI and feature layer over existing Firebase services:

- `MediaLibraryService` wraps the existing `FirestoreService` and `BlogMediaUploadService`.
- Image uploads use `BlogMediaUploadService` so existing image optimization and Firebase Storage upload behavior are preserved.
- Non-image uploads use the existing `FirestoreService.uploadFileWithProgress` storage wrapper.
- Metadata is stored through `FirestoreService` in `mediaLibraryItems` and virtual folders in `mediaLibraryFolders`.
- Blog post attachments from `coverImage`, `seo.openGraphImage`, and image blocks are derived into the library so CMS attachments are globally visible.
- Editing a derived blog attachment promotes it into `mediaLibraryItems` with the same URL/storage identity so future metadata changes persist without changing the blog post URL.
- Rename operations update display-name metadata only. They do not move or rename Firebase Storage objects.
- Archive/delete operations update metadata status by default. Physical deletion should only be added if an existing storage deletion policy is approved.
- Resize requests go through `MediaProcessingService`, which calls existing callable Firebase Functions named `resizeMedia` or `batchResizeMedia` when deployed.

## Component Inventory

- `media-library-page.component`: state container, route entry, selection, uploads, batch actions, dialogs, keyboard shortcuts.
- `media-library-sidebar.component`: quick filters, media types, virtual folders, tags, collections, primary actions.
- `media-library-toolbar.component`: breadcrumbs, search, sort, filters, view mode, thumbnail size, upload.
- `media-grid.component`: grid/list/compact media area, pagination, loading/empty/error/drop states.
- `media-card.component`: thumbnail card/row, selection, favorite, status indicators, keyboard activation.
- `media-inspector.component`: single metadata editor and multi-selection summary/actions.
- `media-filter-panel.component`: advanced filter drawer.
- `batch-rename-dialog.component`: batch rename configuration, preview, validation, confirmation.
- `resize-media-dialog.component`: resize request configuration.
- `media-preview-dialog.component`: image/video/audio/document preview and metadata sidebar.
- `tag-editor.component`: reusable tag entry/removal UI.
- `media-status-bar.component`: counts and processing/upload status.

## Migration Notes

- Existing CMS uploads continue to work unchanged under `cms/blog-media/{slug}/{assetRole}/`.
- The organizer introduces `media-library/*` storage paths only for files uploaded from the organizer UI.
- If an existing project uses different Firestore collection names for media metadata, update the constants in `MediaLibraryService` instead of changing components.
- If existing resize callable names differ, update `MediaProcessingService` to call those names.
- Future physical storage rename/delete behavior must be implemented in the service layer, not components.
