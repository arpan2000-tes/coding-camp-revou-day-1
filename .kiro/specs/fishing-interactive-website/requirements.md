# Requirements Document

## Introduction

Fishing Interactive Website adalah sebuah Single Page Application (SPA) bertema mancing/fishing yang interaktif. Pengguna dapat berinteraksi langsung dengan elemen-elemen mancing di halaman web, seperti melempar kail, menunggu ikan menggigit, menarik kail, dan mengumpulkan hasil tangkapan. Website dibangun menggunakan HTML, CSS Tailwind, dan Vanilla JavaScript — tanpa framework tambahan.

---

## Glossary

- **SPA**: Single Page Application — aplikasi web satu halaman tanpa perpindahan halaman.
- **Game**: Istilah untuk seluruh sesi permainan mancing interaktif.
- **Player**: Pengguna yang berinteraksi dengan aplikasi.
- **Rod**: Joran pancing virtual yang dikendalikan Player.
- **Hook**: Kail virtual yang dilempar ke air.
- **Fish**: Objek ikan virtual yang muncul secara acak di dalam air.
- **Catch_Zone**: Area visual di mana kail dapat menangkap ikan.
- **Score**: Nilai numerik yang merepresentasikan jumlah ikan yang berhasil ditangkap dalam satu sesi.
- **Inventory**: Daftar ikan yang berhasil ditangkap Player selama sesi berlangsung.
- **Cast_Action**: Aksi Player melempar kail ke air.
- **Reel_Action**: Aksi Player menarik kail setelah ikan menggigit.
- **Bite_Event**: Kejadian ketika ikan menggigit kail.
- **Miss_Event**: Kejadian ketika Player gagal melakukan Reel_Action tepat waktu.
- **Game_Session**: Satu sesi permainan dari awal hingga berakhir.
- **Timer**: Penghitung waktu mundur yang membatasi durasi Game_Session.
- **Renderer**: Komponen JavaScript yang bertanggung jawab menggambar dan memperbarui tampilan visual.
- **State_Manager**: Komponen JavaScript yang mengelola state permainan secara terpusat.
- **Audio_Manager**: Komponen JavaScript yang mengelola efek suara dalam permainan.

---

## Requirements

### Requirement 1: Tampilan Utama dan Layout

**User Story:** As a Player, I want to see a visually appealing fishing-themed single page, so that I feel immersed in the fishing experience from the moment I open the website.

#### Acceptance Criteria

1. THE Renderer SHALL display a full-screen fishing scene that includes a sky area, water area, and a bottom/ground area within a single HTML page.
2. THE Renderer SHALL render animated water ripple effects in the water area continuously while the page is open.
3. THE Renderer SHALL display a Rod visual anchored to one side of the screen representing the Player's fishing rod.
4. WHEN the page is first loaded, THE Renderer SHALL display a start screen overlay with a "Mulai Mancing" button before the Game_Session begins.
5. THE Renderer SHALL use Tailwind CSS utility classes for all layout, spacing, color, and typography styling.
6. THE Renderer SHALL be responsive and display correctly on screen widths from 375px to 1920px.

---

### Requirement 2: Melempar Kail (Cast Action)

**User Story:** As a Player, I want to cast my fishing hook into the water, so that I can start the process of catching fish.

#### Acceptance Criteria

1. WHEN the Player clicks or taps the "Cast" button, THE State_Manager SHALL transition the Game state from `idle` to `casting`.
2. WHEN the Game state transitions to `casting`, THE Renderer SHALL animate the Hook traveling from the Rod position into the water area.
3. WHEN the Hook animation reaches the water surface, THE Renderer SHALL display a splash visual effect at the Hook's entry point.
4. WHEN the Hook enters the water, THE State_Manager SHALL transition the Game state from `casting` to `waiting`.
5. IF the Player clicks "Cast" while the Game state is not `idle`, THEN THE State_Manager SHALL ignore the Cast_Action without producing an error.

---

### Requirement 3: Menunggu Ikan Menggigit (Waiting for Bite)

**User Story:** As a Player, I want to wait for a fish to bite my hook, so that I have a moment of anticipation during fishing.

#### Acceptance Criteria

1. WHILE the Game state is `waiting`, THE State_Manager SHALL schedule a Bite_Event at a random interval between 2 seconds and 6 seconds.
2. WHEN a Bite_Event occurs, THE Renderer SHALL display a visual indicator (e.g., bobber shake animation or "!" icon) to alert the Player.
3. WHEN a Bite_Event occurs, THE Audio_Manager SHALL play a bite sound effect to alert the Player.
4. WHEN a Bite_Event occurs, THE State_Manager SHALL transition the Game state from `waiting` to `biting`.
5. WHILE the Game state is `biting`, THE State_Manager SHALL start a reaction window timer of 3 seconds for the Player to perform a Reel_Action.
6. WHEN the reaction window timer expires without a Reel_Action, THE State_Manager SHALL trigger a Miss_Event and transition the Game state to `idle`.

---

### Requirement 4: Menarik Kail dan Menangkap Ikan (Reel Action & Catch)

**User Story:** As a Player, I want to reel in my line when a fish bites, so that I can catch the fish and add it to my collection.

#### Acceptance Criteria

1. WHEN the Player clicks or taps the "Reel!" button while the Game state is `biting`, THE State_Manager SHALL transition the Game state from `biting` to `reeling`.
2. WHEN the Game state transitions to `reeling`, THE Renderer SHALL animate the Hook and a Fish traveling upward from the water toward the Rod.
3. WHEN the reel animation completes, THE State_Manager SHALL randomly select one Fish type from the available Fish catalog and add it to the Inventory.
4. WHEN a Fish is added to the Inventory, THE State_Manager SHALL increment the Score by the point value associated with that Fish type.
5. WHEN the reel animation completes, THE Audio_Manager SHALL play a catch success sound effect.
6. WHEN the reel animation completes, THE Renderer SHALL display the caught Fish name and point value as a floating notification for 2 seconds.
7. WHEN the catch sequence completes, THE State_Manager SHALL transition the Game state back to `idle`.
8. IF the Player clicks "Reel!" while the Game state is not `biting`, THEN THE State_Manager SHALL ignore the Reel_Action without producing an error.

---

### Requirement 5: Jenis dan Katalog Ikan (Fish Catalog)

**User Story:** As a Player, I want to catch different types of fish with varying rarity and point values, so that the fishing experience feels varied and rewarding.

#### Acceptance Criteria

1. THE State_Manager SHALL maintain a Fish catalog containing at least 6 distinct Fish types, each with a unique name, rarity weight, point value, and visual emoji or icon.
2. WHEN a Fish is caught, THE State_Manager SHALL select the Fish type using a weighted random algorithm where rarer Fish types have a lower probability of being selected.
3. THE Fish catalog SHALL include at least 3 rarity tiers: Common (high probability), Uncommon (medium probability), and Rare (low probability).
4. THE Renderer SHALL display each Fish type's rarity tier and point value in the Inventory panel.

---

### Requirement 6: Skor dan Inventori (Score & Inventory)

**User Story:** As a Player, I want to see my current score and a list of fish I've caught, so that I can track my progress during the game session.

#### Acceptance Criteria

1. THE Renderer SHALL display the current Score value prominently on the screen and update it in real-time whenever a Fish is added to the Inventory.
2. THE Renderer SHALL display the Inventory as a panel listing all caught Fish with their name, rarity, and point contribution.
3. WHEN a Fish is added to the Inventory, THE Renderer SHALL update the Inventory panel without requiring a page reload.
4. THE Renderer SHALL display the total number of Fish caught alongside the Score.
5. WHEN the Game_Session ends, THE Renderer SHALL display the final Score and Inventory summary in the result screen.

---

### Requirement 7: Timer dan Batas Waktu Sesi (Session Timer)

**User Story:** As a Player, I want a countdown timer during the game session, so that I have a sense of urgency and challenge while fishing.

#### Acceptance Criteria

1. WHEN a Game_Session starts, THE State_Manager SHALL initialize a Timer with a duration of 60 seconds.
2. WHILE a Game_Session is active, THE Renderer SHALL display the remaining Timer value and update it every 1 second.
3. WHEN the Timer reaches 0, THE State_Manager SHALL end the Game_Session and transition to the result state.
4. WHEN the Timer reaches 10 seconds or fewer, THE Renderer SHALL display the Timer value in a visually distinct style (e.g., red color and pulsing animation) to warn the Player.
5. IF a Bite_Event is pending when the Timer reaches 0, THEN THE State_Manager SHALL cancel the Bite_Event and end the Game_Session immediately.

---

### Requirement 8: Layar Hasil dan Mulai Ulang (Result Screen & Restart)

**User Story:** As a Player, I want to see my final results and be able to restart the game, so that I can play again and try to beat my previous score.

#### Acceptance Criteria

1. WHEN the Game_Session ends, THE Renderer SHALL display a result overlay showing the final Score, total Fish caught, and the complete Inventory list.
2. THE Renderer SHALL display a "Main Lagi" (Play Again) button on the result screen.
3. WHEN the Player clicks "Main Lagi", THE State_Manager SHALL reset the Score to 0, clear the Inventory, reset the Timer, and transition the Game state to `idle`.
4. WHEN the Player clicks "Main Lagi", THE Renderer SHALL hide the result overlay and return to the main game view.
5. THE State_Manager SHALL track and display the highest Score achieved across all Game_Sessions within the current browser session (high score).

---

### Requirement 9: Efek Suara (Sound Effects)

**User Story:** As a Player, I want to hear sound effects during key game interactions, so that the fishing experience feels more immersive and satisfying.

#### Acceptance Criteria

1. THE Audio_Manager SHALL play a distinct cast sound effect when the Player performs a Cast_Action.
2. THE Audio_Manager SHALL play a distinct bite sound effect when a Bite_Event occurs.
3. THE Audio_Manager SHALL play a distinct reel/catch sound effect when a Fish is successfully caught.
4. THE Audio_Manager SHALL play a splash sound effect when the Hook enters the water.
5. WHEN the Player toggles the mute control, THE Audio_Manager SHALL mute or unmute all sound effects accordingly.
6. WHERE a browser does not support the Web Audio API, THE Audio_Manager SHALL silently skip sound playback without displaying an error to the Player.

---

### Requirement 10: Animasi dan Visual Feedback (Animations & Visual Feedback)

**User Story:** As a Player, I want smooth animations and visual feedback for every interaction, so that the game feels responsive and polished.

#### Acceptance Criteria

1. WHEN the Game state transitions to `casting`, THE Renderer SHALL animate the Hook arc from the Rod to the water entry point over a duration of 500ms to 800ms.
2. WHEN a Bite_Event occurs, THE Renderer SHALL animate a bobber shake for a minimum of 3 cycles before the reaction window expires.
3. WHEN a Miss_Event occurs, THE Renderer SHALL display a visual "Miss!" notification for 1.5 seconds.
4. WHEN the Player performs a Reel_Action, THE Renderer SHALL animate the Fish being pulled out of the water over a duration of 600ms to 1000ms.
5. THE Renderer SHALL use CSS transitions or requestAnimationFrame-based animations exclusively — no external animation libraries shall be used.
6. WHEN the Game state is `idle`, THE Renderer SHALL display background animations (e.g., birds, clouds, or floating leaves) to keep the scene lively.
