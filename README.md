# Henry's Wild Typing

An offline-first, desktop-oriented typing adventure for Chrome and Edge on Windows and macOS. Vue 3 + Vite PWA + SQLite (`sql.js`, persisted in IndexedDB), following the architecture of `shopping-list`.

## Run

```sh
npm install
npm run dev
```

Open the localhost URL shown by Vite. For an installable production PWA, run `npm run build && npm run preview`, open the localhost URL in Chrome or Edge, then use the browser's **Install app** action. Load it once while online to cache the app; missions, SQLite progress, trophies, typing tests, and local field reports then work offline. Browser speech synthesis reads single words and hints using system voices when available.

## Missions

Ten progressively harder expeditions use animals featured on Forrest Galante's *Extinct or Alive* and its Shark Week specials. [Episode source](https://en.wikipedia.org/wiki/Extinct_or_Alive#Episodes). These are fictional learning missions, not accounts of verified modern animal sightings. Each mission includes a briefing, home-row lesson, three timed game stages, a field report, and a trophy. Gameplay includes a choose-and-stamp route map, cutting selectable vines, revealing camera traps, flying a word-command drone in three directions, tuning signals, identifying sonar echoes, assembling a journal in order, and static mouse-survey targets using left/right/double-click and scrolling. A one-minute test tracks WPM, accuracy, and WPM × accuracy over time. Saved data stays in the current browser profile on this device.

The app self-hosts **Atkinson Hyperlegible Next** so lowercase `l`, uppercase `I`, and the numeral `1` have distinct shapes, including when offline. Animal images are locally bundled, resized Wikimedia Commons photos (or historical specimens and an accurately labeled scientific illustration where live photography is unavailable). Notes distinguish representative relatives and archival images. Credits and license links are in the trophy shelf, with the individual image source also shown in each report; metadata lives in `src/images.ts`. No outside image or font request is needed in offline mode.

## Optional AI

Enter an OpenRouter key and chat model in Settings. Reports can then be checked for spelling, grammar, and punctuation; fix highlighted errors and re-check before sending to receive a fictional, explorer-style reply. Without connectivity or a key the report can be completed with a clearly labeled local reply. Requests are made directly from the browser to OpenRouter; the key is saved locally in SQLite. Browser speech synthesis does not require OpenRouter.

