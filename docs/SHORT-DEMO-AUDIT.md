# Exercise video demonstrations and preview audit

Updated: 26 November 2026. Replaced all earlier vector stick-figure movement diagrams with real human gym videos at the user's request. Workout prescriptions, movement identities and session data are unchanged.

## Coverage

Every prescribed primary exercise, current swap and retained historical guide has a real-human demonstration video:

- **24 bundled local MP4 clips** (8 Your Move free collection + 16 Goulart / wger CC BY-SA 4.0 adaptations), each with a matching frame-one-second JPEG poster.
- **7 verified public Vimeo creator embeds** (`src/domain/vimeo-sources.json`), each verified HTTP 200 on the public player endpoint with owner-published oEmbed poster/title/author metadata.
- **8 verified tap-to-play privacy-enhanced YouTube embeds** (`src/domain/youtube-sources.json`, `youtube-nocookie.com`) covering the remaining exercises with no free local or publicly embeddable Vimeo clip (incline DB curl, forearm wrist/reverse curls, and three retained historical movements).

Every preview is paired 1:1 with its actual video. Native posters are extracted from each MP4; Vimeo and YouTube posters use the matching provider thumbnail for that exact video ID. Decorative exercise-list SVGs are never substituted for video posters, and all embeds load only after a user tap.

## Sources and delivery

Local MP4/JPEG files are fetched individually on demand rather than precached. Vimeo and YouTube posters contact their respective image CDNs when displayed; iframes are created only after Play and start muted, inline and looping. Closing a guide or switching exercises unloads playback and restores focus. See `public/demos/ATTRIBUTION.md` for full source links, licences and SHA-256 checksums.
