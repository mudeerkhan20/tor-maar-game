# Tor Maar

A retro, monochrome Snake game (Nokia-keypad style) built with plain HTML5, CSS3,
JavaScript and the Canvas API. Mobile-first, fully offline, no accounts, no
analytics, no external assets. Includes the signature **"Maar Ralo"** animation at
the start of every new game, and is structured for packaging as an Android app
with Capacitor.

## Run and preview

Requires Node 18+ (tested on Node 22).

```bash
npm install
npm run dev        # dev server (also reachable from your phone on the same Wi-Fi)
```

## Production build

```bash
npm run build      # outputs a fully static, relative-path site to dist/
npm run preview    # serve dist/ locally to check it
```

`vite.config.js` uses `base: './'`, so every asset path in `dist/` is relative.
That is what Capacitor needs. Nothing is loaded from the network.

## Tests

```bash
npm test           # 15 unit tests: engine rules + local storage
```

## Project layout

| File | Role |
| --- | --- |
| `src/engine.js` | Pure game logic: movement, collisions, food, scoring, speed, modes |
| `src/renderer.js` | Canvas drawing of the LCD board (integer cell sizes, no blur) |
| `src/input.js` | Keyboard, D-pad and swipe, registered once via one `AbortController` |
| `src/sound.js` | Web Audio sound effects, unlocked on the first user gesture |
| `src/storage.js` | Safe localStorage wrapper (corruption / unavailable storage tolerant) |
| `src/ui.js` | DOM screens, HUD, "Maar Ralo" trigger |
| `src/main.js` | State machine and the single game loop |
| `src/styles.css` | Phone frame, LCD look, layout, animation |
| `public/` | `sw.js` (offline cache), `manifest.webmanifest`, `icon.svg` |

Scoring and difficulty constants (`POINTS_PER_FOOD`, `START_INTERVAL`,
`MIN_INTERVAL`, `SPEED_STEP`) are at the top of `src/engine.js`.

Best scores are kept **per mode** (Classic, Wrap, Practice) and the menu shows the
best for the selected mode.

## Package as an Android APK (Capacitor)

Do this on a machine with Node, JDK 17 and Android Studio (Android SDK) installed.
`capacitor.config.json` is already included (`appId: com.tormaar.game`,
`webDir: dist`).

```bash
npm install
npm install @capacitor/core @capacitor/android
npm install -D @capacitor/cli
npm run build
npx cap add android
npx cap sync android
npx cap open android      # opens Android Studio
```

In Android Studio: **Build > Build Bundle(s) / APK(s) > Build APK(s)**, or from
the terminal:

```bash
cd android && ./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

For a Play Store release, create a signing key and use **Build > Generate Signed
Bundle / APK**. Tips:

- Lock portrait: in `android/app/src/main/AndroidManifest.xml` add
  `android:screenOrientation="portrait"` to the `<activity>` element.
- The app needs no permissions. Vibration uses `navigator.vibrate`, which works in
  the WebView without extra permissions on most devices.
- Re-run `npm run build && npx cap sync android` after every change to the game.

## Controls

- Steer: on-screen arrows, swipe on the board, arrow keys, or WASD
- Pause / resume: II button or Space
- Start / restart / resume: buttons or Enter

## Verification status (be aware of this)

Done and passing:

- 15 unit tests (`npm test`): movement, no-reverse, walls, wrap, self-collision in
  all modes, tail-follow safety, food never on the snake, score counted once, board
  full, reset, difficulty curve, storage persistence and corruption.
- A 62-check headless Chromium run (360x640 @2x touch device) against a bundled
  copy of the game: menu/ready/pause/game-over/instructions/settings screens, all
  buttons, D-pad, WASD, arrows, swipe, Maar Ralo appearing once per game and
  fading, pause/resume without speed change, no duplicate loops after 5 restarts,
  eating and growing, best score / mode / sound persisting across reload, corrupted
  storage, 320x568 / 412x915 / landscape layouts without overflow, offline reload
  via the service worker, zero console errors and zero external requests.

**Not performed:**

- **`npm install` and `npm run build` (Vite) were not run.** The environment I
  built this in blocks access to the npm registry, so Vite could not be installed.
  The browser run above used an esbuild bundle of the same source instead, which is
  equivalent for testing but is not the Vite output. Please run `npm install &&
  npm run build` once on your machine and check that `dist/` appears.
- **No APK was built.** I did not run Capacitor or Android tooling. The steps above
  are untested here.
- Not tested on a real Android device or WebView, so audio and vibration inside the
  WebView are unverified.

## Remaining / possible improvements

- Capacitor / APK build and on-device testing (see above).
- PNG launcher icons and a splash screen for Android (only an SVG icon exists).
- Landscape is usable but portrait is the designed layout.
- No dedicated self-collision browser test; it is covered by unit tests only.
- Optional: per-mode best-score reset, haptic patterns, extra themes.
