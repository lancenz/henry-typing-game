# Henry's Wild Typing

An offline-first, desktop-oriented typing adventure for Chrome and Edge on Windows and macOS. Vue 3 + Vite PWA + SQLite (`sql.js`, persisted in IndexedDB), following the architecture of `shopping-list`.

## Run

```sh
npm install
npm run dev
```

Open the localhost URL shown by Vite. For an installable production PWA, run `npm run build && npm run preview`, open the localhost URL in Chrome or Edge, then use the browser's **Install app** action. Load it once while online to cache the app; missions, SQLite progress, trophies, typing tests, and local field reports then work offline. Browser speech synthesis reads single words and hints using system voices when available.

## Missions

Ten progressively harder expeditions use animals featured on Forrest Galante's *Extinct or Alive* and its Shark Week specials. [Episode source](https://en.wikipedia.org/wiki/Extinct_or_Alive#Episodes). These are fictional learning missions, not accounts of verified modern animal sightings. Each mission includes a briefing, home-row lesson, three timed game stages, a field report, and a trophy. In Travel, type 60 familiar words to fly from Auckland across a self-hosted antique-style world map to the destination. The red dotted trail and plane advance with each word; ten seconds without a correct key or exceeding 150 seconds crashes the plane and restarts the flight. Fieldwork is a 90-second typing race against three poacher vehicles, with side-scrolling habitat scenery and a boost on each correct key. Rivals are paced to finish after 91, 100, and 110 seconds, briefly slowing when far ahead; Henry must reach the finish in 90 seconds or retry. Both stages award stars based on conventional WPM × accuracy (five stars at 30+ adjusted WPM). Rescue is a 90-second wildlife camera watch: type at the mission's adjusted WPM target (10 in mission 1, increasing by 2 per mission to 28 in mission 10) and 92% recent accuracy to fill the Luck meter, then sustain that pace at green for 15 uninterrupted seconds to reveal the mission animal. If time runs out, the camera records no sighting and the watch can be retried. Camera views rotate between habitat-specific daytime and night-vision scenery every ten seconds. Rescue's five-star target is 2 adjusted WPM above that mission's minimum. A one-minute typing test tracks WPM, accuracy, and WPM × accuracy. Saved data stays in the current browser profile on this device.

The app self-hosts **Atkinson Hyperlegible Next** so lowercase `l`, uppercase `I`, and the numeral `1` have distinct shapes, including when offline. The antique flight map is generated from [Natural Earth public-domain country boundaries](https://www.naturalearthdata.com/about/terms-of-use/) with `node scripts/generate-world-map.mjs` and locally bundled; the camera follows the flight at closer zoom. Animal images are locally bundled, resized Wikimedia Commons photos (or historical specimens and an accurately labeled scientific illustration where live photography is unavailable). Notes distinguish representative relatives and archival images. Credits and license links are in the trophy shelf, with the individual image source also shown in each report; metadata lives in `src/images.ts`. No outside image or font request is needed in offline mode.

## Optional AI

Enter an OpenRouter key and chat model in Settings. Reports can then be checked for spelling, grammar, and punctuation; fix highlighted errors and re-check before sending to receive a fictional, explorer-style reply. Without connectivity or a key the report can be completed with a clearly labeled local reply. Requests are made directly from the browser to OpenRouter; the key is saved locally in SQLite. Browser speech synthesis does not require OpenRouter.
