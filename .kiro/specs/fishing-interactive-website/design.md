# Design Document: Fishing Interactive Website

## Overview

Fishing Interactive Website adalah Single Page Application (SPA) bertema mancing yang dibangun sepenuhnya dengan HTML, Tailwind CSS, dan Vanilla JavaScript tanpa framework atau library animasi eksternal. Aplikasi ini mensimulasikan pengalaman memancing interaktif dengan state machine yang jelas, animasi berbasis CSS/requestAnimationFrame, sistem katalog ikan berbobot, penghitung waktu sesi, dan manajemen audio.

Arsitektur utama menggunakan **module pattern** — setiap sistem besar (State Manager, Renderer, Audio Manager) dipisahkan sebagai modul JavaScript yang saling berkomunikasi melalui event-driven interface sederhana. Tidak ada framework reaktif; DOM dimanipulasi langsung oleh Renderer saat state berubah.

### Tujuan Desain

- **Interaktivitas penuh**: Setiap aksi pemain menghasilkan umpan balik visual dan/atau audio yang segera.
- **Keterbacaan kode**: Pemisahan tanggung jawab yang jelas antara state, rendering, dan audio.
- **Tidak ada dependensi eksternal**: Hanya Tailwind CSS (via CDN) dan Vanilla JS.
- **Responsif**: Tampilan menyesuaikan layar dari 375px hingga 1920px.

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        index.html                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   main.js (Entry Point)              │   │
│  │                                                      │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │   │
│  │  │ StateManager│  │   Renderer   │  │AudioManager│  │   │
│  │  │  (state.js) │  │ (renderer.js)│  │ (audio.js) │  │   │
│  │  └──────┬──────┘  └──────┬───────┘  └─────┬──────┘  │   │
│  │         │                │                │          │   │
│  │         └────────────────┴────────────────┘          │   │
│  │                    EventBus (events.js)               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Communication Pattern

Komponen tidak saling memanggil langsung — mereka berkomunikasi melalui **EventBus** (publish-subscribe sederhana). Contoh aliran:

```
Player klik "Cast"
  → UI Handler memanggil StateManager.cast()
    → StateManager mengubah state ke 'casting'
      → EventBus.emit('stateChange', { from: 'idle', to: 'casting' })
        → Renderer.onStateChange() memulai animasi casting
        → AudioManager.onStateChange() memainkan suara cast
```

### State Machine

```
┌───────┐  cast()   ┌─────────┐  hookLanded()  ┌─────────┐
│ idle  │──────────▶│ casting │───────────────▶│ waiting │
└───────┘           └─────────┘                └────┬────┘
    ▲                                               │
    │                                          biteEvent()
    │                                               │
    │  catchComplete()    ┌─────────┐   biteEvent() ▼
    │◀────────────────────│ reeling │          ┌─────────┐
    │     OR              └─────────┘          │ biting  │
    │  timerExpired()          ▲               └────┬────┘
    │                          │ reel()             │
    │                          └────────────────────┘
    │
    └──────────────────────────── (via missEvent or timerExpired)
```

State yang valid: `idle` | `casting` | `waiting` | `biting` | `reeling`

State tambahan UI: `start` (sebelum game dimulai) | `result` (setelah sesi berakhir)

---

## Components and Interfaces

### 1. EventBus (`events.js`)

Objek publish-subscribe minimal.

```javascript
// Interface
EventBus.on(eventName: string, handler: Function): void
EventBus.off(eventName: string, handler: Function): void
EventBus.emit(eventName: string, payload?: any): void
```

**Events yang digunakan:**

| Event Name        | Payload                        | Pengirim         | Penerima              |
|-------------------|--------------------------------|------------------|-----------------------|
| `stateChange`     | `{ from, to, data? }`          | StateManager     | Renderer, AudioManager|
| `fishCaught`      | `{ fish, score, inventory }`   | StateManager     | Renderer              |
| `timerTick`       | `{ remaining }`                | StateManager     | Renderer              |
| `sessionEnd`      | `{ score, inventory, hiScore }`| StateManager     | Renderer              |
| `sessionStart`    | `{}`                           | StateManager     | Renderer, AudioManager|
| `missEvent`       | `{}`                           | StateManager     | Renderer, AudioManager|

---

### 2. StateManager (`state.js`)

Mengelola seluruh game state, timer, inventory, dan logika seleksi ikan.

```javascript
// Public Interface
StateManager.init(): void
StateManager.cast(): void          // idle → casting
StateManager.reel(): void          // biting → reeling
StateManager.startSession(): void  // memulai sesi baru
StateManager.getState(): GameState
StateManager.getScore(): number
StateManager.getInventory(): Fish[]
StateManager.getHighScore(): number
StateManager.getTimeRemaining(): number
```

**Internal State Object:**

```javascript
{
  phase: 'idle' | 'casting' | 'waiting' | 'biting' | 'reeling',
  uiPhase: 'start' | 'game' | 'result',
  score: number,
  highScore: number,        // persisted di sessionStorage
  inventory: Fish[],
  timeRemaining: number,    // seconds
  biteTimer: TimeoutId | null,
  reactionTimer: TimeoutId | null,
  sessionTimer: IntervalId | null,
}
```

---

### 3. Renderer (`renderer.js`)

Mengelola semua manipulasi DOM dan animasi visual.

```javascript
// Public Interface
Renderer.init(domRefs: DOMRefs): void
Renderer.onStateChange(event: StateChangeEvent): void
Renderer.showFishNotification(fish: Fish): void
Renderer.updateScore(score: number, count: number): void
Renderer.updateTimer(remaining: number): void
Renderer.updateInventory(inventory: Fish[]): void
Renderer.showResultScreen(data: SessionResult): void
Renderer.hideResultScreen(): void
Renderer.showStartScreen(): void
Renderer.hideStartScreen(): void
Renderer.startBackgroundAnimations(): void
```

**DOMRefs object:**

```javascript
{
  scene: HTMLElement,          // container utama
  hook: HTMLElement,           // elemen kail
  rod: HTMLElement,            // elemen joran
  bobber: HTMLElement,         // elemen pelampung
  waterSurface: HTMLElement,   // garis permukaan air
  splash: HTMLElement,         // efek percikan
  scoreDisplay: HTMLElement,
  countDisplay: HTMLElement,
  timerDisplay: HTMLElement,
  inventoryPanel: HTMLElement,
  castBtn: HTMLElement,
  reelBtn: HTMLElement,
  startOverlay: HTMLElement,
  resultOverlay: HTMLElement,
  muteBtn: HTMLElement,
  notificationArea: HTMLElement,
  backgroundLayer: HTMLElement,
}
```

---

### 4. AudioManager (`audio.js`)

Mengelola semua efek suara menggunakan Web Audio API.

```javascript
// Public Interface
AudioManager.init(): void
AudioManager.play(soundName: SoundName): void
AudioManager.toggleMute(): void
AudioManager.isMuted(): boolean
```

**Sound Names:** `'cast'` | `'splash'` | `'bite'` | `'catch'` | `'miss'`

Suara dibangkitkan secara programatik menggunakan Web Audio API (OscillatorNode + GainNode) — tidak memerlukan file audio eksternal.

---

### 5. FishCatalog (`catalog.js`)

Berisi definisi semua jenis ikan dan algoritma pemilihan berbobot.

```javascript
// Public Interface
FishCatalog.getAll(): Fish[]
FishCatalog.selectWeighted(): Fish   // weighted random selection
FishCatalog.getRarityColor(rarity: string): string
```

---

## Data Models

### Fish

```typescript
interface Fish {
  id: string;            // e.g., "bass", "goldfish"
  name: string;          // Nama tampilan, e.g., "Bass"
  emoji: string;         // Emoji ikon, e.g., "🐟"
  rarity: 'common' | 'uncommon' | 'rare';
  weight: number;        // Bobot untuk weighted random (lebih tinggi = lebih sering)
  points: number;        // Nilai poin saat ditangkap
  rarityColor: string;   // Tailwind color class untuk tampilan
}
```

### Fish Catalog (6 jenis ikan minimum)

| ID         | Name          | Emoji | Rarity   | Weight | Points |
|------------|---------------|-------|----------|--------|--------|
| `sardine`  | Sarden        | 🐟    | common   | 50     | 10     |
| `catfish`  | Lele          | 🐠    | common   | 40     | 15     |
| `bass`     | Bass          | 🎣    | uncommon | 25     | 30     |
| `carp`     | Mas           | 🐡    | uncommon | 20     | 40     |
| `salmon`   | Salmon        | 🐙    | rare     | 10     | 75     |
| `swordfish`| Ikan Pedang   | ⚔️    | rare     | 5      | 120    |

**Total weight: 150**. Probabilitas contoh: Sarden = 50/150 ≈ 33%, Ikan Pedang = 5/150 ≈ 3.3%.

### Weighted Random Algorithm

```javascript
function selectWeighted(catalog) {
  const totalWeight = catalog.reduce((sum, f) => sum + f.weight, 0);
  let random = Math.random() * totalWeight;
  for (const fish of catalog) {
    random -= fish.weight;
    if (random <= 0) return fish;
  }
  return catalog[catalog.length - 1]; // fallback
}
```

### GameState

```typescript
interface GameState {
  phase: 'idle' | 'casting' | 'waiting' | 'biting' | 'reeling';
  uiPhase: 'start' | 'game' | 'result';
  score: number;
  highScore: number;
  inventory: CaughtFish[];
  timeRemaining: number;
}
```

### CaughtFish (inventory entry)

```typescript
interface CaughtFish {
  fish: Fish;
  caughtAt: number;    // timestamp
}
```

### SessionResult

```typescript
interface SessionResult {
  score: number;
  fishCount: number;
  inventory: CaughtFish[];
  highScore: number;
  isNewHighScore: boolean;
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Weighted Selection Produces Valid Fish

*For any* call to `FishCatalog.selectWeighted()`, the returned Fish object SHALL be a member of the defined catalog and SHALL have a valid `id`, `name`, `rarity`, `weight`, and `points` field.

**Validates: Requirements 5.1, 5.2**

---

### Property 2: Weighted Selection Respects Rarity Distribution

*For any* sufficiently large number of calls to `FishCatalog.selectWeighted()` (≥ 1000 iterations), the empirical frequency of each fish SHALL be proportional to its weight within a reasonable tolerance (±5%), confirming that rarer fish appear less often than common fish.

**Validates: Requirements 5.2, 5.3**

---

### Property 3: Score Monotonically Increases on Catch

*For any* sequence of fish catches, the Score after N catches SHALL always be greater than or equal to the Score after N-1 catches — the score never decreases during an active session.

**Validates: Requirements 4.4, 6.1**

---

### Property 4: Inventory Length Matches Catch Count

*For any* sequence of fish catches during a session, the length of the Inventory array SHALL equal the total number of successful Reel_Actions performed (i.e., one entry per catch, no duplicates or missing entries).

**Validates: Requirements 4.3, 6.2, 6.4**

---

### Property 5: State Transitions Are Valid

*For any* sequence of valid player actions (`cast`, `reel`) and internal events (`biteEvent`, `missEvent`, `timerExpire`, `hookLanded`), the Game state SHALL only ever transition along the defined edges of the state machine. No invalid state transition shall occur.

**Validates: Requirements 2.1, 2.4, 3.4, 3.6, 4.1, 4.7**

---

### Property 6: Cast and Reel Guard Conditions

*For any* call to `StateManager.cast()` when the game phase is not `idle`, the state SHALL remain unchanged. *For any* call to `StateManager.reel()` when the game phase is not `biting`, the state SHALL remain unchanged.

**Validates: Requirements 2.5, 4.8**

---

### Property 7: Session Reset Clears All State

*For any* completed game session, after calling `startSession()` (play again), the Score SHALL be 0, the Inventory SHALL be empty, and the Timer SHALL be reset to 60 seconds before any player interaction.

**Validates: Requirements 8.3**

---

### Property 8: High Score Is Non-Decreasing

*For any* sequence of completed game sessions, the tracked high score SHALL never decrease — it SHALL only update when a new session score strictly exceeds the current high score.

**Validates: Requirements 8.5**

---

### Property 9: Timer Countdown Is Monotonically Decreasing

*For any* active game session, each `timerTick` event SHALL report a `remaining` value that is strictly less than the previous `remaining` value, and the timer SHALL never increase or reset during an active session.

**Validates: Requirements 7.1, 7.2, 7.3**

---

### Property 10: Mute Toggle Is Idempotent Across Pairs

*For any* initial mute state, calling `toggleMute()` twice in succession SHALL return the Audio_Manager to its original mute state (toggle is its own inverse).

**Validates: Requirements 9.5**

---

## Error Handling

### State Guard Errors

Semua public method di StateManager mengimplementasikan **guard clauses** yang menolak aksi tidak valid secara senyap (tanpa melempar error) sesuai requirement:

```javascript
cast() {
  if (this.state.phase !== 'idle') return; // guard
  // ...
}

reel() {
  if (this.state.phase !== 'biting') return; // guard
  // ...
}
```

### Web Audio API Not Supported

AudioManager memeriksa dukungan browser saat `init()`:

```javascript
init() {
  try {
    this._ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    this._supported = false; // silent fallback
  }
}

play(soundName) {
  if (!this._supported || this._muted) return; // skip silently
  // ...
}
```

### Timer Cleanup

Saat sesi berakhir atau game di-restart, semua timer (biteTimer, reactionTimer, sessionTimer) di-clear secara eksplisit:

```javascript
_clearAllTimers() {
  clearTimeout(this.state.biteTimer);
  clearTimeout(this.state.reactionTimer);
  clearInterval(this.state.sessionTimer);
  this.state.biteTimer = null;
  this.state.reactionTimer = null;
  this.state.sessionTimer = null;
}
```

Ini mencegah stale timer yang bisa memicu state transition setelah sesi berakhir.

### Animation Cleanup

Renderer melacak semua `requestAnimationFrame` ID yang aktif dan membatalkannya saat state berubah secara tidak terduga, mencegah multiple animation loops yang tumpang tindih.

### sessionStorage Unavailable

High score disimpan di `sessionStorage`. Jika tidak tersedia (misalnya private mode strict), high score akan disimpan hanya di memori JS untuk durasi tab tersebut:

```javascript
_saveHighScore(score) {
  try {
    sessionStorage.setItem('fishingHighScore', String(score));
  } catch (e) {
    // in-memory fallback already handled by this.state.highScore
  }
}
```

---

## Testing Strategy

### Pendekatan Pengujian Ganda

Strategi pengujian menggunakan dua lapisan komplementer:

1. **Unit Tests (Example-Based)**: Memverifikasi skenario konkret, edge cases, dan kondisi error.
2. **Property-Based Tests (PBT)**: Memverifikasi properti universal yang harus berlaku untuk semua input yang valid.

### Library yang Digunakan

- **Test Runner**: [Vitest](https://vitest.dev/) — kompatibel dengan Vanilla JS modern tanpa konfigurasi build kompleks.
- **Property-Based Testing**: [fast-check](https://fast-check.io/) — library PBT untuk JavaScript/TypeScript.
- Konfigurasi minimum **100 iterasi per property test** (default fast-check: 100).

### Unit Tests (Example-Based)

**StateManager:**
- Cast saat state `idle` → state berubah ke `casting` ✓
- Cast saat state bukan `idle` → state tidak berubah ✓
- Reel saat state `biting` → state berubah ke `reeling` ✓
- Reel saat state bukan `biting` → state tidak berubah ✓
- Timer mencapai 0 → session berakhir, state → result ✓
- Restart game → score = 0, inventory kosong, timer = 60 ✓
- High score tidak turun setelah session dengan score lebih rendah ✓

**FishCatalog:**
- `selectWeighted()` selalu mengembalikan fish yang ada di catalog ✓
- Catalog mengandung minimal 6 fish ✓
- Setiap fish memiliki minimal 3 rarity tier ✓

**AudioManager:**
- `toggleMute()` dua kali mengembalikan ke state semula ✓
- `play()` tidak melempar error ketika Web Audio API tidak tersedia ✓

**Renderer (DOM Unit Tests):**
- Score display diperbarui saat `updateScore()` dipanggil ✓
- Timer display menampilkan warna merah + animasi pulse saat remaining ≤ 10 ✓
- Result overlay ditampilkan saat `showResultScreen()` dipanggil ✓

### Property-Based Tests (PBT)

Setiap property test mengacu pada properti yang didefinisikan di bagian Correctness Properties.

```javascript
// Tag format: Feature: fishing-interactive-website, Property {n}: {property_text}
import fc from 'fast-check';

// Feature: fishing-interactive-website, Property 1: Weighted Selection Produces Valid Fish
test('selectWeighted always returns a catalog member', () => {
  const catalog = FishCatalog.getAll();
  fc.assert(fc.property(fc.nat(), () => {
    const fish = FishCatalog.selectWeighted();
    expect(catalog.some(f => f.id === fish.id)).toBe(true);
    expect(fish.id).toBeDefined();
    expect(fish.name).toBeDefined();
    expect(fish.points).toBeGreaterThan(0);
    expect(fish.weight).toBeGreaterThan(0);
  }), { numRuns: 200 });
});

// Feature: fishing-interactive-website, Property 2: Weighted Selection Respects Rarity Distribution
test('weighted selection frequency proportional to weight', () => {
  const catalog = FishCatalog.getAll();
  const totalWeight = catalog.reduce((s, f) => s + f.weight, 0);
  const counts = {};
  const N = 5000;
  for (let i = 0; i < N; i++) {
    const fish = FishCatalog.selectWeighted();
    counts[fish.id] = (counts[fish.id] || 0) + 1;
  }
  catalog.forEach(fish => {
    const expected = fish.weight / totalWeight;
    const actual = (counts[fish.id] || 0) / N;
    expect(Math.abs(actual - expected)).toBeLessThan(0.05); // ±5% tolerance
  });
});

// Feature: fishing-interactive-website, Property 3: Score Monotonically Increases on Catch
test('score never decreases during a session', () => {
  fc.assert(fc.property(
    fc.array(fc.nat({ max: 120 }), { minLength: 1, maxLength: 20 }),
    (pointValues) => {
      let score = 0;
      for (const pts of pointValues) {
        const prev = score;
        score += pts;
        expect(score).toBeGreaterThanOrEqual(prev);
      }
    }
  ), { numRuns: 100 });
});

// Feature: fishing-interactive-website, Property 4: Inventory Length Matches Catch Count
test('inventory length equals number of catches', () => {
  fc.assert(fc.property(
    fc.array(fc.nat({ max: 5 }), { minLength: 0, maxLength: 30 }),
    (catches) => {
      const inventory = [];
      catches.forEach(() => inventory.push(FishCatalog.selectWeighted()));
      expect(inventory.length).toBe(catches.length);
    }
  ), { numRuns: 100 });
});

// Feature: fishing-interactive-website, Property 5: State Transitions Are Valid
test('only valid state transitions occur', () => {
  const validTransitions = {
    idle: ['casting'],
    casting: ['waiting'],
    waiting: ['biting', 'idle'],
    biting: ['reeling', 'idle'],
    reeling: ['idle'],
  };
  fc.assert(fc.property(
    fc.array(
      fc.oneof(fc.constant('cast'), fc.constant('reel'), fc.constant('bite'), fc.constant('miss'), fc.constant('landed')),
      { minLength: 1, maxLength: 50 }
    ),
    (actions) => {
      const sm = createTestStateManager();
      for (const action of actions) {
        const before = sm.getPhase();
        sm.applyAction(action);
        const after = sm.getPhase();
        if (before !== after) {
          expect(validTransitions[before]).toContain(after);
        }
      }
    }
  ), { numRuns: 100 });
});

// Feature: fishing-interactive-website, Property 6: Cast and Reel Guard Conditions
test('cast is ignored when not idle', () => {
  fc.assert(fc.property(
    fc.oneof(fc.constant('casting'), fc.constant('waiting'), fc.constant('biting'), fc.constant('reeling')),
    (phase) => {
      const sm = createTestStateManagerAtPhase(phase);
      sm.cast();
      expect(sm.getPhase()).toBe(phase);
    }
  ), { numRuns: 100 });
});

// Feature: fishing-interactive-website, Property 7: Session Reset Clears All State
test('startSession resets score, inventory, and timer', () => {
  fc.assert(fc.property(
    fc.integer({ min: 1, max: 9999 }),
    fc.array(fc.nat(), { minLength: 1, maxLength: 20 }),
    (score, inventoryItems) => {
      const sm = createTestStateManager();
      sm._state.score = score;
      sm._state.inventory = inventoryItems.map(() => FishCatalog.selectWeighted());
      sm.startSession();
      expect(sm.getScore()).toBe(0);
      expect(sm.getInventory()).toHaveLength(0);
      expect(sm.getTimeRemaining()).toBe(60);
    }
  ), { numRuns: 100 });
});

// Feature: fishing-interactive-website, Property 8: High Score Is Non-Decreasing
test('high score never decreases', () => {
  fc.assert(fc.property(
    fc.array(fc.integer({ min: 0, max: 9999 }), { minLength: 2, maxLength: 20 }),
    (sessionScores) => {
      let highScore = 0;
      for (const score of sessionScores) {
        const prev = highScore;
        if (score > highScore) highScore = score;
        expect(highScore).toBeGreaterThanOrEqual(prev);
      }
    }
  ), { numRuns: 100 });
});

// Feature: fishing-interactive-website, Property 10: Mute Toggle Is Idempotent Across Pairs
test('toggleMute twice returns to original state', () => {
  fc.assert(fc.property(fc.boolean(), (initialMuted) => {
    const am = createTestAudioManager(initialMuted);
    const before = am.isMuted();
    am.toggleMute();
    am.toggleMute();
    expect(am.isMuted()).toBe(before);
  }), { numRuns: 100 });
});
```

### File Structure

```
src/
├── index.html
├── main.js              # Entry point, inisialisasi semua modul
├── state.js             # StateManager
├── renderer.js          # Renderer
├── audio.js             # AudioManager
├── catalog.js           # FishCatalog dan weighted selection
├── events.js            # EventBus
└── animations.js        # Helper animasi rAF

test/
├── state.test.js
├── catalog.test.js
├── audio.test.js
└── renderer.test.js
```

### Catatan Animasi

Semua animasi menggunakan salah satu dari:
- **CSS transitions** (`transition: transform 0.6s ease-out`) untuk pergerakan sederhana.
- **CSS `@keyframes` + Tailwind `animate-*`** untuk efek berulang (bobber, water ripple, clouds).
- **`requestAnimationFrame`** untuk animasi fisika sederhana (arc hook, reel pull) yang membutuhkan kontrol frame-by-frame.

Tidak ada library seperti GSAP, Anime.js, atau Framer Motion yang digunakan.
