/**
 * State_Manager.js
 *
 * Core state machine for the Fishing Interactive Website.
 * Manages game state, session timer, score, inventory, and mute toggle.
 * Communicates with other modules exclusively through EventBus events.
 *
 * Requirements: 7.1, 7.3, 8.3, 8.5, 9.5
 */

import EventBus from './EventBus.js';
import { FISH_CATALOG, selectFish } from './FishCatalog.js';

class State_Manager {
  constructor() {
    /**
     * Current state of the game.
     * Valid values: 'idle' | 'casting' | 'waiting' | 'biting' | 'reeling'
     * UI-only states 'start' and 'result' are also used during session lifecycle.
     * @type {string}
     */
    this.gameState = 'idle';

    /** @type {number} — accumulated score for the current session */
    this.score = 0;

    /** @type {number} — highest score achieved across all sessions this browser tab */
    this.highScore = 0;

    /**
     * Inventory of fish caught during the current session.
     * Each entry: { fishType: FishType, caughtAt: number (timestamp) }
     * @type {Array<{fishType: import('./FishCatalog.js').FishType, caughtAt: number}>}
     */
    this.inventory = [];

    /** @type {number} — seconds remaining in the current session (counts down from 60) */
    this.timer = 0;

    /** @type {number|null} — setInterval id for the 1-second countdown tick */
    this.timerIntervalId = null;

    /** @type {number|null} — setTimeout id for the scheduled bite event */
    this.biteTimeoutId = null;

    /** @type {number|null} — setTimeout id for the reaction-window expiry */
    this.reactionTimeoutId = null;

    /** @type {boolean} — when true, Audio_Manager should skip all sound playback */
    this.isMuted = false;
  }

  // ---------------------------------------------------------------------------
  // State transitions
  // ---------------------------------------------------------------------------

  /**
   * Transition to a new game state and emit `state:changed`.
   * Silently ignores a no-op transition (same state → same state).
   *
   * @param {string} state — target state string
   */
  transitionTo(state) {
    if (this.gameState === state) return; // silent no-op

    const from = this.gameState;
    this.gameState = state;
    EventBus.emit('state:changed', { from, to: state });
  }

  // ---------------------------------------------------------------------------
  // Session lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Start a new game session.
   * Resets score, inventory, and timer to initial values, transitions to 'idle',
   * and begins the 1-second countdown that emits `timer:tick` each second.
   * When the timer reaches 0, `endSession()` is called automatically.
   *
   * Requirements: 7.1, 7.3, 8.3
   */
  startSession() {
    // Clear any leftover timers from a previous session
    this._clearAllTimers();

    // Reset session state
    this.timer = 60;
    this.score = 0;
    this.inventory = [];

    // Transition to idle (start-screen is already hidden by the caller)
    this.transitionTo('idle');

    // Start the 1-second countdown
    this.timerIntervalId = setInterval(() => {
      this.timer -= 1;
      EventBus.emit('timer:tick', { remaining: this.timer });

      if (this.timer <= 0) {
        this.endSession();
      }
    }, 1000);
  }

  /**
   * End the current game session.
   * Clears all pending timeouts/intervals, updates high score if warranted,
   * transitions to 'result', and emits `session:ended`.
   *
   * Requirements: 7.3, 8.5
   */
  endSession() {
    this._clearAllTimers();

    // Update high score if this session beat it (Requirement 8.5)
    if (this.score > this.highScore) {
      this.highScore = this.score;
    }

    this.transitionTo('result');

    EventBus.emit('session:ended', {
      score: this.score,
      inventory: this.inventory,
      highScore: this.highScore,
    });
  }

  /**
   * Restart the game session (triggered by "Main Lagi" button).
   * Identical reset logic to `startSession()` — resets score, inventory, timer,
   * and resumes the countdown without re-showing the start screen.
   *
   * Requirement: 8.3
   */
  restartSession() {
    // Same reset logic as startSession — no start-screen show
    this._clearAllTimers();

    this.timer = 60;
    this.score = 0;
    this.inventory = [];

    this.transitionTo('idle');

    this.timerIntervalId = setInterval(() => {
      this.timer -= 1;
      EventBus.emit('timer:tick', { remaining: this.timer });

      if (this.timer <= 0) {
        this.endSession();
      }
    }, 1000);
  }

  // ---------------------------------------------------------------------------
  // Fishing lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Initiate a cast action.
   * Guard: only runs when gameState === 'idle'.
   * Transitions to 'casting', emits 'cast:initiated', then after a 700ms stub
   * timeout transitions to 'waiting' and schedules a bite event.
   *
   * Requirements: 2.1, 2.5
   */
  cast() {
    if (this.gameState !== 'idle') return; // guard

    this.transitionTo('casting');
    EventBus.emit('cast:initiated');

    // Stub timeout — replaced in task 11.1 by Renderer's real animateCast() Promise
    setTimeout(() => {
      this.transitionTo('waiting');
      this.scheduleBite();
    }, 700);
  }

  /**
   * Schedule a bite event at a random delay between 2000–6000ms.
   * Stores the setTimeout id in biteTimeoutId.
   *
   * Requirement: 3.1
   */
  scheduleBite() {
    const delay = 2000 + Math.floor(Math.random() * 4001);
    this.biteTimeoutId = setTimeout(() => {
      this.biteTimeoutId = null;
      this.fireBite();
    }, delay);
  }

  /**
   * Fire the bite event.
   * Transitions to 'biting', emits 'bite:occurred', and starts a 3000ms
   * reaction window that calls missEvent() on expiry.
   *
   * Requirements: 3.4, 3.5
   */
  fireBite() {
    this.transitionTo('biting');
    EventBus.emit('bite:occurred');

    this.reactionTimeoutId = setTimeout(() => {
      this.missEvent();
    }, 3000);
  }

  /**
   * Handle a missed bite (reaction window expired).
   * Clears reactionTimeoutId, emits 'miss:occurred', transitions to 'idle'.
   *
   * Requirement: 3.6
   */
  missEvent() {
    clearTimeout(this.reactionTimeoutId);
    this.reactionTimeoutId = null;

    EventBus.emit('miss:occurred');
    this.transitionTo('idle');
  }

  /**
   * Reel in the line after a fish bites.
   * Guard: only runs when gameState === 'biting'.
   * Clears the reaction window, transitions to 'reeling', selects and adds a
   * fish to inventory, emits 'fish:caught', then after an 800ms stub timeout
   * transitions back to 'idle'.
   *
   * Requirements: 4.1, 4.3, 4.4, 4.7, 4.8
   */
  reel() {
    if (this.gameState !== 'biting') return; // guard

    clearTimeout(this.reactionTimeoutId);
    this.reactionTimeoutId = null;

    this.transitionTo('reeling');

    const caughtFish = selectFish(FISH_CATALOG);
    this.addToInventory(caughtFish);

    const lastCaughtFish = this.inventory[this.inventory.length - 1].fishType;
    EventBus.emit('fish:caught', {
      fish: lastCaughtFish,
      score: this.score,
      inventory: this.inventory,
    });

    // Stub timeout — replaced in task 11.1 by Renderer's real animateReel() Promise
    setTimeout(() => {
      this.transitionTo('idle');
    }, 800);
  }

  /**
   * Add a caught fish to the inventory and update the score.
   * Emits 'score:updated' with the new score and fish count.
   *
   * @param {import('./FishCatalog.js').FishType} fish
   *
   * Requirements: 4.3, 4.4
   */
  addToInventory(fish) {
    this.inventory.push({ fishType: fish, caughtAt: Date.now() });
    this.score += fish.points;
    EventBus.emit('score:updated', {
      score: this.score,
      fishCount: this.inventory.length,
    });
  }

  // ---------------------------------------------------------------------------
  // Mute control
  // ---------------------------------------------------------------------------

  /**
   * Flip the isMuted flag.
   * Emits no event — callers (main.js) coordinate Audio_Manager directly.
   *
   * Requirement: 9.5
   */
  toggleMute() {
    this.isMuted = !this.isMuted;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Clear all active timers and intervals, then set their ids to null.
   * Must be called before any session reset to prevent stale callbacks.
   *
   * @private
   */
  _clearAllTimers() {
    if (this.timerIntervalId !== null) {
      clearInterval(this.timerIntervalId);
      this.timerIntervalId = null;
    }
    if (this.biteTimeoutId !== null) {
      clearTimeout(this.biteTimeoutId);
      this.biteTimeoutId = null;
    }
    if (this.reactionTimeoutId !== null) {
      clearTimeout(this.reactionTimeoutId);
      this.reactionTimeoutId = null;
    }
  }
}

export default State_Manager;
