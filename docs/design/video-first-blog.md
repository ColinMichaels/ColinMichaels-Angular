# Video-first blog design

## Reader experience

The article opens with a wide, centered 16:9 video stage before the title and full post. The selected video plays on the page. A compact player follows the reader after the main stage scrolls above the viewport, with a switch to disable this behavior, a return control, and a close control. Returning changes the same iframe's CSS placement rather than recreating its playback session.

The layout reference is [the generated concept](video-first-blog-concept.png), created with the built-in imagegen tool on 2026-10-16. Its drone scene and sample prose are illustrative design material, never public article evidence or replacement footage. The implementation uses the actual article's YouTube poster, video, title, metadata, and caption.

## Design system and implementation inventory

- Stage: centered, maximum 72rem, 16:9 black frame, no tint; full available width on mobile.
- Controls: existing site font, 14px labels, 44px interaction targets, site accent and muted tokens, a visible watch-while-reading switch, native YouTube playback controls.
- Article: existing contents/article/related grid below the stage; video-led titles use a bounded 32–44px default scale multiplied by the existing reader font-size preference, and 1.15 line height. All normal body blocks, polls, comments, sharing, saved articles, evidence, and topic continuations remain in their existing systems.
- Floating state: maximum 22rem desktop or 13rem mobile, bottom right with 5rem clearance for the accessibility control, border and shadow from the existing palette, return/close strip above the video.
- Poster: real YouTube maximum-resolution thumbnail, with fallback for missing or undersized responses. No third-party iframe is created until Play is selected.
- Keyboard/reduced motion: semantic buttons, labeled native checkbox, focus rings, native iframe controls, instant return scrolling when reduced motion is requested.

Allowed new copy: “Play video,” “Watch while reading,” “Watch on YouTube,” “Return to video,” “Close,” and “Watch this video in the main viewer.” Article and navigation copy remain data-driven and unchanged.

## Deliberate adaptations from the concept

Preserve the real site's header, fonts, light/dark modes, seasonal presentation, disclosures, metadata, taxonomy, contents, and existing toolbars. The reference's simplified navigation, sample writing, illustrated drone, and duplicate article inside its state inset are not product content. The floating view contains only the existing player and two controls. It sits above the accessibility control instead of overlapping it. No additional article copy, marketing elements, or new backend feature is introduced.

## Critique and revision

Important findings from the first rendered pass: a low-resolution poster was enlarged, the floating player collided with the accessibility button, the original video caption needed to follow the promoted block, and the inherited mobile title scale was excessive beside the viewer. The revised implementation requests a larger poster with fallback, reserves bottom clearance, renders the caption with the shared rich-text sanitizer, and bounds only video-led titles. The compact switch replaces the unclear initial checkbox treatment. A final light-theme interaction pass also caught Angular base-href navigation from the body return link; the article now handles that exact viewer fragment locally without navigation or player replacement.

## Migration and release

See [Blog Reading Rails](../ARCHITECTURE/BLOG_READING_RAILS.md) for selection, component inventory, migration, rollback, and final validation. This is a Hosting-only change; content and schema are unchanged. Local fixture QA is not a production CMS or release check.
