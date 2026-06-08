/**
 * Audio_Manager.js
 *
 * Manages all sound effects for the Fishing Interactive Website using the
 * Web Audio API. Gracefully degrades when the API is unavailable or when
 * sound files fail to load.
 *
 * Sound files expected at:
 *   assets/sounds/cast.mp3
 *   assets/sounds/splash.mp3
 *   assets/sounds/bite.mp3
 *   assets/sounds/catch.mp3
 *
 * EventBus subscriptions (auto-wired in init()):
 *   'cast:initiated'  → play('cast')
 *   'bite:occurred'   → play('bite')
 *   'fish:caught'     → play('catch')
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.6
 */

import EventBus from './EventBus.js';

class Audio_Manager {
  constructor() {
    /**
     * The Web Audio API context.
     * Null if the browser does not support AudioContext (Requirement 9.6).
     * @type {AudioContext|null}
     */
    try {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      this.context = null;
    }

    /**
     * Map of sound name → decoded AudioBuffer (or null if load failed).
     * @type {Object.<string, AudioBuffer|null>}
     */
    this.sounds = {};

    /**
     * Whether sound playback is currently muted.
     * @type {boolean}
     */
    this.isMuted = false;
  }

  // ---------------------------------------------------------------------------
  // Initialisation
  // ---------------------------------------------------------------------------

  /**
   * Load all sound assets and subscribe to EventBus events.
   * Uses Promise.allSettled so a single load failure does not block the others.
   *
   * Requirements: 9.1, 9.2, 9.3, 9.4
   */
  async init() {
    // Load all four sounds concurrently; tolerate individual failures.
    await Promise.allSettled([
      this._loadSound('cast',   'assets/sounds/cast.mp3'),
      this._loadSound('splash', 'assets/sounds/splash.mp3'),
      this._loadSound('bite',   'assets/sounds/bite.mp3'),
      this._loadSound('catch',  'assets/sounds/catch.mp3'),
    ]);

    // Subscribe to game events to trigger sound effects automatically.
    EventBus.on('cast:initiated', () => this.play('cast'));
    EventBus.on('bite:occurred',  () => this.play('bite'));
    EventBus.on('fish:caught',    () => this.play('catch'));
  }

  // ---------------------------------------------------------------------------
  // Sound loading
  // ---------------------------------------------------------------------------

  /**
   * Fetch an audio file, decode it, and store the resulting AudioBuffer.
   * On any failure (no context, network error, decode error), stores null
   * and logs a warning — never throws.
   *
   * @param {string} name  — key used in this.sounds and with play()
   * @param {string} url   — path to the audio file
   * @returns {Promise<void>}
   * @private
   */
  async _loadSound(name, url) {
    // Guard: skip entirely when AudioContext is unavailable (Requirement 9.6).
    if (this.context === null) {
      this.sounds[name] = null;
      return;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} while fetching ${url}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
      this.sounds[name] = audioBuffer;
    } catch (err) {
      console.warn(`[Audio_Manager] Could not load sound "${name}" from "${url}":`, err);
      this.sounds[name] = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Playback
  // ---------------------------------------------------------------------------

  /**
   * Play a previously loaded sound by name.
   *
   * Guards (all silent — Requirement 9.6):
   *   • Skip if muted
   *   • Skip if AudioContext is unavailable
   *   • Skip if the sound failed to load (null) or was never registered
   *
   * @param {string} soundName — key matching one loaded via init()
   */
  play(soundName) {
    if (this.isMuted)                          return;
    if (this.context === null)                 return;
    if (!this.sounds[soundName])               return; // null or undefined

    try {
      const source = this.context.createBufferSource();
      source.buffer = this.sounds[soundName];
      source.connect(this.context.destination);
      source.start();
    } catch (err) {
      console.warn(`[Audio_Manager] Error playing sound "${soundName}":`, err);
    }
  }

  // ---------------------------------------------------------------------------
  // Mute controls (Requirement 9.5)
  // ---------------------------------------------------------------------------

  /**
   * Mute all sound effects.
   */
  mute() {
    this.isMuted = true;
  }

  /**
   * Unmute all sound effects.
   */
  unmute() {
    this.isMuted = false;
  }

  /**
   * Toggle the mute state.
   * Calling toggle() twice always restores the original state (Property 15).
   */
  toggle() {
    this.isMuted = !this.isMuted;
  }
}

export default Audio_Manager;
