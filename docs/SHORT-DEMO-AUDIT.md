# Exercise video demonstrations and preview audit

Updated: 27 November 2026. Audited every local clip, Vimeo embed and YouTube embed frame-by-frame against each prescribed exercise setup and replaced all mismatched variations with exact 1-to-1 real-human gym videos. Workout prescriptions, movement identities and session data are unchanged.

## Coverage

Every prescribed primary exercise, current swap and retained historical guide has a real-human demonstration video matched to its setup:

- **19 active bundled local MP4 clips** (5 Your Move free collection + 14 active Goulart / wger CC BY-SA 4.0 adaptations; 2 additional wger calf clips retained on disk for rollback), each with a matching frame-one-second JPEG poster.
- **4 verified public Vimeo creator embeds** (`src/domain/vimeo-sources.json`), each verified HTTP 200 on the public player endpoint with owner-published oEmbed poster/title/author metadata.
- **22 verified tap-to-play privacy-enhanced YouTube embeds** (`src/domain/youtube-sources.json`, `youtube-nocookie.com`) giving exact 1-to-1 setup matches for lat-bar pulldown, chest-supported machine row, machine pec/reverse fly, single-arm cable fly, incline Smith press, incline DB curl, rack-supported single-DB split squat, standing cable hamstring curl, single-leg standing DB & bodyweight calf raises, seated DB calf raise, dip-bar knee raise, all six forearm DB & cable variations, and three historical movements.

Every preview is paired 1:1 with its actual video. Native posters are extracted from each MP4; Vimeo and YouTube posters use the matching provider thumbnail for that exact video ID. Decorative exercise-list SVGs are never substituted for video posters, and all embeds load only after a user tap.

## Sources and delivery

Local MP4/JPEG files are fetched individually on demand rather than precached. Vimeo and YouTube posters contact their respective image CDNs when displayed; iframes are created only after Play and start muted, inline and looping. Closing a guide or switching exercises unloads playback and restores focus. See `public/demos/ATTRIBUTION.md` for full source links, licences and SHA-256 checksums.
