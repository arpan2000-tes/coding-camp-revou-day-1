# Implementation Plan: Fishing Interactive Website

## Overview

Build a browser-only, no-build-tool SPA using HTML, Tailwind CSS (CDN), and Vanilla JavaScript.
The work is ordered so each step compiles to a runnable page: scaffolding first, then the
EventBus, State_Manager, FishCatalog, Audio_Manager, Renderer (UI layout → animations → event
wiring), and finally property-based tests with fast-check loaded via CDN.

---

## Tasks

- [x] 1. Project scaffolding and file structure
  - Create every file and directory listed in the design's File Structure section:
    `index.html`, `css/animations.css`, `js/main.js`, `js/EventBus.js`,
    `js/State_Manager.js`, `js/Renderer.js`, `js/Audio_Manager.js`,
    `js/FishCatalog.js`, `js/utils.js`, `assets/sounds/` (placeholder files),
    `assets/sprites/` (empty directory).
  - `index.html`: add `<meta charset>`, viewport tag, Tailwind CDN `<script>` tag,
    `<link>` to `css/animations.css`, and `<script type="module" src="js/main.js">`.
  - Stub every JS file with an empty export so the browser does not throw on load.
  - _Requirements: 1.1, 1.5_

- [x] 2. EventBus module
  - [x] 2.1 Implement `EventBus.js` as a singleton with `on`, `off`, and `emit` methods
    - `on(eventName, handler)` — register a listener; support multiple listeners per event.
    - `off(eventName, handler)` — remove an exact listener reference.
    - `emit(eventName, payload)` — call every registered handler with the payload; swallow
      individual handler errors with a `console.error` so one bad subscriber never breaks others.
    - Export as a module-level singleton (`const EventBus = { … }; export default EventBus;`).
    - _Requirements: (internal — enables all cross-component communication)_

  - [x] 2.2 Write unit tests for EventBus
    - Test that a registered handler is called when the matching event is emitted.
    - Test that `off` removes exactly that handler and no others.
    - Test that emitting an event with no listeners does not throw.
    - Test that multiple handlers for the same event are all called.
    - _Requirements: 2.5, 4.8_

- [x] 3. FishCatalog module
  - [x] 3.1 Implement `FishCatalog.js` with the full catalog and `selectFish()` function
    - Define and export `FISH_CATALOG` — an array of 6 `FishType` objects matching the design
      table (ikan_mas, ikan_lele, ikan_mujair, ikan_nila, ikan_bawal, ikan_arwana).
    - Implement and export `selectFish(catalog)` using the weighted random algorithm from the design.
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 3.2 Write property test — Property 9: Weighted Random Selects a Valid Fish
    - **Property 9: Weighted Random Selects a Valid Fish**
    - **Validates: Requirements 5.2**
    - Use fast-check (CDN) to generate arbitrary subsets of the catalog (all weights > 0).
    - Assert `selectFish(catalog)` always returns an entry that exists in `catalog` and is
      never `null` or `undefined`.

- [ ] 4. State_Manager module
  - [x] 4.1 Implement `State_Manager.js` — core state machine skeleton
    - Define the `State_Manager` class with all properties from the design
      (`gameState`, `score`, `highScore`, `inventory`, `timer`, `timerIntervalId`,
      `biteTimeoutId`, `reactionTimeoutId`, `isMuted`).
    - Implement `transitionTo(state)` — updates `gameState` and emits `state:changed`
      with `{ from, to }` payload; silently ignores an identical re-transition.
    - Implement `startSession()` — sets `timer = 60`, `score = 0`, `inventory = []`,
      transitions to `idle`, and starts the 1-second countdown interval that emits `timer:tick`.
    - Implement `endSession()` — clears all pending timeouts/intervals, calculates and updates
      `highScore`, transitions to `result`, emits `session:ended`.
    - Implement `restartSession()` — identical reset to `startSession()` without re-showing
      the start screen.
    - Implement `toggleMute()` — flips `isMuted`, emits no event (Renderer polls via direct call).
    - Import `EventBus` and `FISH_CATALOG` / `selectFish` from their respective modules.
    - _Requirements: 7.1, 7.3, 8.3, 8.5, 9.5_

  - [x] 4.2 Implement cast/waiting/bite/reel lifecycle methods
    - `cast()` — guard: only runs when `gameState === 'idle'`; transitions to `casting`;
      emits `cast:initiated`; calls `transitionTo('waiting')` after cast animation duration
      (use a `Promise`-returning `animateCast` stub or a fixed 700ms `setTimeout` to be
      replaced later by Renderer's real animation).
    - `scheduleBite()` — schedules `fireBite()` at a random delay between 2000–6000ms;
      stores the `setTimeout` id in `biteTimeoutId`.
    - `fireBite()` — transitions to `biting`; emits `bite:occurred`; starts 3000ms reaction
      window that calls `missEvent()` on expiry; stores id in `reactionTimeoutId`.
    - `missEvent()` — clears `reactionTimeoutId`; emits `miss:occurred`; transitions to `idle`.
    - `reel()` — guard: only runs when `gameState === 'biting'`; clears `reactionTimeoutId`;
      transitions to `reeling`; calls `addToInventory(selectFish(catalog))`; emits `fish:caught`;
      after reel animation duration (stub 800ms) transitions back to `idle`.
    - `addToInventory(fish)` — pushes `{ fishType: fish, caughtAt: Date.now() }` to `inventory`;
      increments `score` by `fish.points`; emits `score:updated` with `{ score, fishCount }`.
    - _Requirements: 2.1, 2.4, 2.5, 3.1, 3.4, 3.5, 3.6, 4.1, 4.3, 4.4, 4.7, 4.8_

  - [-] 4.3 Write property test — Property 1: Valid Cast Transition
    - **Property 1: Valid Cast Transition**
    - **Validates: Requirements 2.1**
    - Instantiate `State_Manager` and set `gameState = 'idle'`.
    - Use fast-check to run `cast()` repeatedly; assert state always transitions to `casting`.

  - [-] 4.4 Write property test — Property 3: Invalid Actions Are Silently Ignored
    - **Property 3: Invalid Actions Are Silently Ignored**
    - **Validates: Requirements 2.5, 4.8**
    - Use fast-check to generate non-`idle` states; assert `cast()` leaves state unchanged
      and throws no error.
    - Use fast-check to generate non-`biting` states; assert `reel()` leaves state unchanged
      and throws no error.

  - [-] 4.5 Write property test — Property 7: Catch Integrity
    - **Property 7: Catch Integrity — Inventory Growth and Score Consistency**
    - **Validates: Requirements 4.3, 4.4**
    - Use fast-check to generate random sequences of caught fish (from the catalog).
    - After each catch, assert `inventory.length` increased by exactly 1 and
      `score === inventory.reduce((s, e) => s + e.fishType.points, 0)`.

  - [-] 4.6 Write property test — Property 13: Restart Produces Clean State
    - **Property 13: Restart Produces Clean State**
    - **Validates: Requirements 8.3**
    - Use fast-check to generate arbitrary game states (various scores, inventories, timers).
    - Assert that after `restartSession()`, `score === 0`, `inventory.length === 0`,
      `timerRemaining === 60`, and `gameState === 'idle'`.

  - [-] 4.7 Write property test — Property 14: High Score Is Non-Decreasing Maximum
    - **Property 14: High Score Is Non-Decreasing Maximum**
    - **Validates: Requirements 8.5**
    - Use fast-check to generate arrays of non-negative session scores.
    - Simulate calling `endSession()` for each score; assert `highScore` always equals
      `Math.max(...scores)` and never decreases between sessions.

  - [-] 4.8 Write property test — Property 11: Timer Expiry Ends Session
    - **Property 11: Timer Expiry Ends Session**
    - **Validates: Requirements 7.3, 7.5**
    - Simulate timer reaching 0 while `biteTimeoutId` is set; assert `gameState` transitions
      to `result` and `biteTimeoutId` is cleared (null).

- [x] 5. Checkpoint — core logic verified
  - Ensure all unit and property tests pass. Open `index.html` in a browser; no console errors
    should appear on load. Ask the user if any questions arise before proceeding.

- [x] 6. Audio_Manager module
  - [x] 6.1 Implement `Audio_Manager.js` with Web Audio API and graceful degradation
    - Constructor creates `AudioContext` inside a `try/catch`; if creation fails, store
      `this.context = null`.
    - `init()` — calls `_loadSound` for each of the 4 sound names (`cast`, `splash`, `bite`,
      `catch`); stores decoded `AudioBuffer` objects in `this.sounds`.
    - `_loadSound(url)` — `fetch` → `arrayBuffer` → `context.decodeAudioData`; on failure,
      logs a warning and stores `null` for that key.
    - `play(soundName)` — guards: skip if `isMuted`, skip if `context === null`, skip if
      `sounds[soundName]` is `null`; otherwise create a `BufferSourceNode`, connect to
      `context.destination`, and call `.start()`.
    - `mute()`, `unmute()`, `toggle()` — set `isMuted` accordingly.
    - Subscribe to `state:changed` and `bite:occurred` from `EventBus` to auto-play sounds:
      `cast:initiated` → play `'cast'`; `bite:occurred` → play `'bite'`;
      `fish:caught` → play `'catch'`; splash timing handled by Renderer event.
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.6_

  - [ ] 6.2 Write property test — Property 15: Mute Toggle Is a Round Trip
    - **Property 15: Mute Toggle Is a Round Trip**
    - **Validates: Requirements 9.5**
    - Use fast-check to generate arbitrary initial `isMuted` values.
    - Assert that calling `toggle()` twice always restores the original `isMuted` value.
    - Assert that when `isMuted = true`, calling `play()` with any valid sound name
      does not invoke `AudioContext` playback (stub/spy `context.createBufferSource`).

- [x] 7. `utils.js` helper functions
  - [x] 7.1 Implement `utils.js` with shared helpers
    - `randomBetween(min, max)` — returns a random integer `n` where `min ≤ n ≤ max`.
    - `clamp(value, min, max)` — clamps a number to the [min, max] range.
    - `lerp(a, b, t)` — linear interpolation `a + (b - a) * t`.
    - `rafOrTimeout(callback, ms)` — calls `callback` after `ms` via `requestAnimationFrame`
      loop; falls back to `setTimeout(callback, ms)` if `requestAnimationFrame` is not defined.
    - Export all functions named.
    - _Requirements: 10.5_

- [x] 8. `css/animations.css` — custom keyframe definitions
  - [x] 8.1 Write all custom CSS keyframe animations required by the design
    - `@keyframes ripple` — scale + opacity fade for water ripple circles.
    - `@keyframes bobber-shake` — alternating `rotate` ± 15deg for bobber bite indicator.
    - `@keyframes splash` — scale up + opacity fade for splash effect on water entry.
    - `@keyframes float-up-fade` — `translateY` upward + opacity 1→0 for catch/miss notifications.
    - `@keyframes timer-pulse` — `scale` 1 → 1.2 → 1 with red color shift for urgent timer.
    - `@keyframes cloud-drift` — `translateX` from off-screen right to off-screen left for background clouds/birds.
    - Add utility classes that apply each animation (e.g., `.animate-ripple`,
      `.animate-bobber-shake`, `.animate-splash`, `.animate-float-up-fade`,
      `.animate-timer-pulse`, `.animate-cloud-drift`).
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 9. `index.html` — full UI markup
  - [x] 9.1 Write the complete HTML structure using Tailwind CSS utility classes
    - HUD bar (fixed top): mute toggle button, score/fish-count display, timer display.
    - Sky area (`~25vh`): container for cloud/bird elements generated by JS.
    - Water area (`~50vh`): water surface div with ripple overlay, bobber/hook element,
      water canvas or absolutely-positioned div for the hook arc.
    - Ground area (`~25vh`): rod visual, Cast button (`id="btn-cast"`), Reel button
      (`id="btn-reel"`).
    - Inventory panel: sidebar on large screens, accordion on small screens; `id="inventory-panel"`.
    - Start screen overlay (`id="screen-start"`): centred card, heading, "Mulai Mancing" button.
    - Result screen overlay (`id="screen-result"`): final score, fish count, inventory summary,
      high score, "Main Lagi" button.
    - Notification div (`id="notification"`) absolutely positioned for floating catch/miss text.
    - All `<script type="module">` tags at end of `<body>`.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 9.2 Write property test — Property 10: Inventory Row Renders Rarity and Points
    - **Property 10: Inventory Row Renders Rarity and Points**
    - **Validates: Requirements 5.4**
    - Use fast-check to generate arbitrary `FishEntry` objects (valid fishType + caughtAt).
    - Call `Renderer.updateInventoryPanel([entry])` and assert the resulting DOM row
      contains both the rarity string and the numeric points value of the fish.

- [x] 10. Renderer module — DOM wiring and static rendering
  - [x] 10.1 Implement `Renderer.js` — `init()`, screen transitions, and HUD updates
    - Cache all element references (`getElementById`/`querySelector`) into `this.elements`;
      guard each with a `null` check and `console.error` on missing elements.
    - Subscribe to EventBus events: `state:changed`, `score:updated`, `timer:tick`,
      `session:ended`, `fish:caught`, `bite:occurred`, `miss:occurred`.
    - `showStartScreen()` / `hideStartScreen()` — toggle opacity/visibility via Tailwind
      classes (`opacity-100 pointer-events-auto` ↔ `opacity-0 pointer-events-none`).
    - `showResultScreen(data)` — populate result overlay with `data.score`,
      `data.inventory`, `data.highScore`; then show the overlay.
    - `hideResultScreen()` — hide the overlay.
    - `updateScore(score, fishCount)` — update HUD score and fish count text nodes.
    - `updateTimer(remaining)` — update timer text; add `.animate-timer-pulse` class
      when `remaining ≤ 10`, remove it otherwise.
    - `updateInventoryPanel(inventory)` — re-render the inventory list rows
      (`[emoji] [name]  [rarity badge]  [+XX pts]` pattern).
    - `showCatchNotification(fish)` — inject notification text, add `.animate-float-up-fade`,
      auto-remove after 2 seconds.
    - `showMissNotification()` — same pattern with "Miss!" text, auto-remove after 1.5 seconds.
    - `toggleMuteIcon(isMuted)` — swap mute/unmute icon in HUD.
    - `renderBackgroundAnimations()` — programmatically create cloud/bird elements with
      random starting offsets and attach `.animate-cloud-drift`; call when entering `idle`.
    - `startWaterRipples()` — create ripple circle elements at random horizontal positions
      in the water area on a repeating interval; attach `.animate-ripple`.
    - _Requirements: 1.2, 1.3, 1.4, 6.1, 6.2, 6.3, 6.4, 6.5, 7.2, 7.4, 8.1, 8.2, 8.4, 10.6_

  - [x] 10.2 Implement cast and reel animations in `Renderer.js`
    - `animateCast()` — resolve rod-tip and random water-entry coordinates; run a
      `requestAnimationFrame` loop computing quadratic Bézier `(x(t), y(t))` from the design
      formulas; move the hook element each frame; resolve the returned `Promise` when `t ≥ 1`.
      Duration must be randomly chosen between 500ms and 800ms per the design spec.
    - After the hook reaches the water, call `animateSplash(x, y)` — inject a `.animate-splash`
      div at `(x, y)` and remove it after 400ms.
    - `animateBobberShake()` — add `.animate-bobber-shake` to the bobber element; remove
      the class after `~1.5s` (`3 cycles × 500ms`).
    - `animateReel()` — run a `requestAnimationFrame` loop linearly interpolating the hook/fish
      element's Y position from water surface to rod tip; resolve the `Promise` when complete.
      Duration must be randomly chosen between 600ms and 1000ms per the design spec.
    - _Requirements: 2.2, 2.3, 3.2, 4.2, 10.1, 10.2, 10.4, 10.5_

  - [~] 10.3 Write property test — Property 16: Animation Durations Are Within Specified Ranges
    - **Property 16: Animation Durations Are Within Specified Ranges**
    - **Validates: Requirements 10.1, 10.4**
    - Use fast-check to call `animateCast()` (or expose its duration-selection logic) many times;
      assert every sampled duration is in [500, 800].
    - Use fast-check to call `animateReel()` duration-selection logic many times;
      assert every sampled duration is in [600, 1000].

- [x] 11. `main.js` — entry point and full wiring
  - [x] 11.1 Wire all modules together in `main.js`
    - Import `EventBus`, `State_Manager`, `Renderer`, `Audio_Manager`,
      `FISH_CATALOG`, and `selectFish` from their respective modules.
    - Instantiate `State_Manager` and `Renderer`; call `Renderer.init()` then
      `Audio_Manager.init()` (await).
    - Attach click listeners:
      - `#btn-start` → `stateManager.startSession()`
      - `#btn-cast` → `stateManager.cast()`
      - `#btn-reel` → `stateManager.reel()`
      - `#btn-restart` → `stateManager.restartSession()`
      - `#btn-mute` → `stateManager.toggleMute(); audioManager.toggle(); renderer.toggleMuteIcon(...)`
    - Connect `Renderer.animateCast()` and `Renderer.animateReel()` Promises into
      `State_Manager`'s `cast()` and `reel()` callbacks, replacing the stub timeouts from task 4.2.
    - Call `Renderer.startWaterRipples()` once on load.
    - Show start screen via `Renderer.showStartScreen()`.
    - _Requirements: 1.4, 2.1, 2.2, 3.2, 4.1, 4.2, 9.5_

  - [~] 11.2 Write property test — Property 2: Cast-to-Waiting Transition
    - **Property 2: Cast-to-Waiting Transition**
    - **Validates: Requirements 2.4**
    - Stub `Renderer.animateCast()` to resolve immediately.
    - Use fast-check to confirm that for any `casting` state, completing the animation always
      results in `waiting` and never any other state.

  - [~] 11.3 Write property test — Property 4: Bite Triggers Biting State
    - **Property 4: Bite Triggers Biting State**
    - **Validates: Requirements 3.4**
    - Stub `scheduleBite()` to fire immediately; use fast-check to confirm `waiting` → `biting`
      for any valid session.

  - [~] 11.4 Write property test — Property 5: Missed Bite Returns to Idle
    - **Property 5: Missed Bite Returns to Idle**
    - **Validates: Requirements 3.6**
    - Stub reaction-window timer to expire immediately; use fast-check to confirm `biting` → `idle`.

  - [~] 11.5 Write property test — Property 6: Reel Action Triggers Reeling State
    - **Property 6: Reel Action Triggers Reeling State**
    - **Validates: Requirements 4.1**
    - Use fast-check to call `reel()` in `biting` state; assert transition to `reeling`.

  - [~] 11.6 Write property test — Property 8: Reel Completion Returns to Idle
    - **Property 8: Reel Completion Returns to Idle**
    - **Validates: Requirements 4.7**
    - Stub `Renderer.animateReel()` to resolve immediately; assert `reeling` → `idle`.

  - [~] 11.7 Write property test — Property 12: Timer Warning Threshold
    - **Property 12: Timer Warning Threshold**
    - **Validates: Requirements 7.4**
    - Use fast-check to generate arbitrary `remaining` values (0–60).
    - Assert that the timer element has `.animate-timer-pulse` if and only if
      `remaining ≤ 10`.

- [x] 12. Final checkpoint — full integration verified
  - Ensure all unit and property tests pass.
  - Open `index.html` in a browser; play through a full session (cast → wait → bite → reel →
    result → restart) and verify no console errors.
  - Verify the page renders correctly at 375px and 1920px viewport widths (browser DevTools).
  - Ask the user if any questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP build.
- fast-check is loaded via CDN for property tests; no build step is needed.
- The stub `setTimeout` used in task 4.2 for cast/reel durations is intentionally temporary —
  it is replaced in task 11.1 with real Renderer Promises.
- All sound files in `assets/sounds/` are expected at the paths listed in the design.
  If they are absent the game degrades gracefully per requirement 9.6.
- Property tests reference the property numbers from the design's "Correctness Properties"
  section for full traceability.
- Each task references the specific acceptance-criteria sub-clauses it satisfies.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "3.1", "7.1", "8.1"] },
    { "id": 1, "tasks": ["2.2", "3.2", "4.1", "9.1"] },
    { "id": 2, "tasks": ["4.2", "6.1", "9.2"] },
    { "id": 3, "tasks": ["4.3", "4.4", "4.5", "4.6", "4.7", "4.8", "6.2", "10.1"] },
    { "id": 4, "tasks": ["10.2"] },
    { "id": 5, "tasks": ["10.3", "11.1"] },
    { "id": 6, "tasks": ["11.2", "11.3", "11.4", "11.5", "11.6", "11.7"] }
  ]
}
```
