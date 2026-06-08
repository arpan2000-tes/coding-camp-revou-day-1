/**
 * Renderer.js
 *
 * Handles all DOM manipulation, screen transitions, HUD updates,
 * and visual animations for the Fishing Interactive Website.
 * Communicates with other modules exclusively through EventBus subscriptions.
 *
 * Requirements: 1.2, 1.3, 1.4, 6.1, 6.2, 6.3, 6.4, 6.5, 7.2, 7.4,
 *               8.1, 8.2, 8.4, 10.6, 2.2, 2.3, 3.2, 4.2, 10.1, 10.2, 10.4, 10.5
 */

import EventBus from './EventBus.js';
import { lerp } from './utils.js';

class Renderer {
  constructor() {
    /**
     * Cached DOM element references.
     * Populated during init(); each entry may be null if the element
     * is missing from the DOM (logged via console.error).
     * @type {Object.<string, HTMLElement|null>}
     */
    this.elements = {};

    /** @type {number|null} — setInterval id for the water ripple generator */
    this._rippleIntervalId = null;
  }

  // ---------------------------------------------------------------------------
  // Initialisation
  // ---------------------------------------------------------------------------

  /**
   * Cache all required DOM element references and subscribe to EventBus events.
   * Must be called once after the DOM is ready (e.g. from main.js DOMContentLoaded).
   *
   * Requirements: 1.2, 1.3, 1.4
   */
  init() {
    this._cacheElements();
    this._subscribeEvents();
  }

  /**
   * Look up and store every element needed by the Renderer.
   * Logs a console.error for any element that cannot be found.
   * @private
   */
  _cacheElements() {
    /** @type {Array<[string, string]>} — [key, selector] pairs */
    const queries = [
      ['scoreDisplay',      '#score-display'],
      ['fishCount',         '#fish-count'],
      ['timerDisplay',      '#timer-display'],
      ['btnCast',           '#btn-cast'],
      ['btnReel',           '#btn-reel'],
      ['btnMute',           '#btn-mute'],
      ['muteIcon',          '#mute-icon'],
      ['screenStart',       '#screen-start'],
      ['screenResult',      '#screen-result'],
      ['resultScore',       '#result-score'],
      ['resultFishCount',   '#result-fish-count'],
      ['resultHighScore',   '#result-high-score'],
      ['resultInventory',   '#result-inventory'],
      ['inventoryList',     '#inventory-list'],
      ['inventoryEmpty',    '#inventory-empty'],
      ['notification',      '#notification'],
      ['skyArea',           '#sky-area'],
      ['waterArea',         '#water-area'],
      ['rippleContainer',   '#ripple-container'],
      ['bobber',            '#bobber'],
      ['hook',              '#hook'],
    ];

    for (const [key, selector] of queries) {
      const el = document.querySelector(selector);
      if (!el) {
        console.error(`[Renderer] Missing DOM element: "${selector}"`);
      }
      this.elements[key] = el;
    }
  }

  /**
   * Subscribe to all required EventBus events.
   * @private
   */
  _subscribeEvents() {
    EventBus.on('state:changed',  ({ from, to }) => this._onStateChanged({ from, to }));
    EventBus.on('score:updated',  ({ score, fishCount }) => this.updateScore(score, fishCount));
    EventBus.on('timer:tick',     ({ remaining }) => this.updateTimer(remaining));
    EventBus.on('session:ended',  (data) => this.showResultScreen(data));
    EventBus.on('fish:caught',    ({ fish }) => this.showCatchNotification(fish));
    EventBus.on('bite:occurred',  () => this.animateBobberShake());
    EventBus.on('miss:occurred',  () => this.showMissNotification());
  }

  // ---------------------------------------------------------------------------
  // State change handler
  // ---------------------------------------------------------------------------

  /**
   * React to game state transitions by updating relevant UI elements.
   *
   * @param {{ from: string, to: string }} event
   * @private
   */
  _onStateChanged({ from, to }) {
    switch (to) {
      case 'idle':
        this.renderBackgroundAnimations();
        this._show(this.elements.btnCast);
        this._hide(this.elements.btnReel);
        break;

      case 'casting':
        this._hide(this.elements.btnCast);
        this._hide(this.elements.btnReel);
        break;

      case 'waiting':
        // Show the bobber when the hook is in the water
        if (this.elements.bobber) {
          this.elements.bobber.style.display = 'block';
        }
        break;

      case 'biting':
        // Visual bobber shake is handled by the bite:occurred event → animateBobberShake()
        break;

      case 'reeling':
        this._show(this.elements.btnReel);
        break;

      case 'result':
        // showResultScreen() is triggered by session:ended event, not here
        break;

      default:
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Screen transition methods
  // ---------------------------------------------------------------------------

  /**
   * Show the start screen overlay.
   * Removes `hidden`, adds `flex` so the overlay is visible and centred.
   *
   * Requirement: 1.4
   */
  showStartScreen() {
    const el = this.elements.screenStart;
    if (!el) return;
    el.classList.remove('hidden');
    el.classList.add('flex');
  }

  /**
   * Hide the start screen overlay.
   * Adds `hidden`, removes `flex`.
   *
   * Requirement: 1.4
   */
  hideStartScreen() {
    const el = this.elements.screenStart;
    if (!el) return;
    el.classList.add('hidden');
    el.classList.remove('flex');
  }

  /**
   * Populate and display the result screen overlay.
   *
   * @param {{ score: number, inventory: Array, highScore: number }} data
   *
   * Requirements: 8.1, 8.2
   */
  showResultScreen(data) {
    const { score, inventory, highScore } = data;

    // Populate stats
    if (this.elements.resultScore) {
      this.elements.resultScore.textContent = score;
    }
    if (this.elements.resultFishCount) {
      this.elements.resultFishCount.textContent = inventory ? inventory.length : 0;
    }
    if (this.elements.resultHighScore) {
      this.elements.resultHighScore.textContent = highScore;
    }

    // Populate inventory list inside result screen
    if (this.elements.resultInventory) {
      this.elements.resultInventory.innerHTML = '';

      if (inventory && inventory.length > 0) {
        for (const entry of inventory) {
          const fish = entry.fishType;
          const li = document.createElement('li');
          li.className = 'flex items-center gap-2 px-3 py-2';
          li.innerHTML =
            `<span class="text-xl" aria-hidden="true">${fish.emoji}</span>` +
            `<span class="flex-1 font-medium">${fish.name}</span>` +
            `<span class="${fish.rarityColor} font-semibold text-xs px-1 rounded bg-gray-100">${fish.rarity}</span>` +
            `<span class="text-sky-700 font-bold text-xs">+${fish.points} pts</span>`;
          this.elements.resultInventory.appendChild(li);
        }
      }
    }

    // Show the overlay
    const el = this.elements.screenResult;
    if (!el) return;
    el.classList.remove('hidden');
    el.classList.add('flex');
  }

  /**
   * Hide the result screen overlay.
   * Adds `hidden`, removes `flex`.
   *
   * Requirement: 8.4
   */
  hideResultScreen() {
    const el = this.elements.screenResult;
    if (!el) return;
    el.classList.add('hidden');
    el.classList.remove('flex');
  }

  // ---------------------------------------------------------------------------
  // HUD update methods
  // ---------------------------------------------------------------------------

  /**
   * Update the score and fish count displays in the HUD.
   *
   * @param {number} score
   * @param {number} fishCount
   *
   * Requirements: 6.1, 6.4
   */
  updateScore(score, fishCount) {
    if (this.elements.scoreDisplay) {
      this.elements.scoreDisplay.textContent = `Skor: ${score}`;
    }
    if (this.elements.fishCount) {
      this.elements.fishCount.textContent = `🐟 ${fishCount}`;
    }
  }

  /**
   * Update the timer display in the HUD.
   * Applies a pulsing red animation when 10 or fewer seconds remain.
   *
   * @param {number} remaining — seconds remaining
   *
   * Requirements: 7.2, 7.4
   */
  updateTimer(remaining) {
    const el = this.elements.timerDisplay;
    if (!el) return;

    el.textContent = `⏱ ${remaining}`;

    if (remaining <= 10) {
      el.classList.add('animate-timer-pulse');
    } else {
      el.classList.remove('animate-timer-pulse');
    }
  }

  /**
   * Re-render the inventory side panel with all caught fish.
   * Each row: [emoji] [name] [rarity badge] [+XX pts]
   * Shows/hides the empty-state placeholder accordingly.
   *
   * @param {Array<{fishType: Object, caughtAt: number}>} inventory
   *
   * Requirements: 6.2, 6.3
   */
  updateInventoryPanel(inventory) {
    const list  = this.elements.inventoryList;
    const empty = this.elements.inventoryEmpty;

    if (!list) return;

    // Clear existing rows
    list.innerHTML = '';

    if (!inventory || inventory.length === 0) {
      if (empty) empty.style.display = '';
      return;
    }

    // Hide the empty placeholder
    if (empty) empty.style.display = 'none';

    for (const entry of inventory) {
      const fish = entry.fishType;
      const li = document.createElement('li');
      li.className = 'flex items-center gap-2 px-3 py-2';
      li.innerHTML =
        `<span class="text-xl" aria-hidden="true">${fish.emoji}</span>` +
        `<span class="flex-1 font-medium">${fish.name}</span>` +
        `<span class="${fish.rarityColor} font-semibold text-xs px-1 rounded bg-gray-100">${fish.rarity}</span>` +
        `<span class="text-sky-700 font-bold text-xs">+${fish.points} pts</span>`;
      list.appendChild(li);
    }
  }

  /**
   * Display a floating catch notification for 2 seconds.
   *
   * @param {{ emoji: string, name: string, points: number }} fish
   *
   * Requirements: 4.6 (visual feedback), 10.3
   */
  showCatchNotification(fish) {
    const el = this.elements.notification;
    if (!el) return;

    el.textContent = `🎣 ${fish.emoji} ${fish.name} +${fish.points}pts!`;
    el.classList.add('animate-float-up-fade');

    setTimeout(() => {
      el.textContent = '';
      el.classList.remove('animate-float-up-fade');
    }, 2000);
  }

  /**
   * Display a floating "Miss!" notification for 1.5 seconds.
   *
   * Requirement: 10.3
   */
  showMissNotification() {
    const el = this.elements.notification;
    if (!el) return;

    el.textContent = '💨 Miss!';
    el.classList.add('animate-float-up-fade');

    setTimeout(() => {
      el.textContent = '';
      el.classList.remove('animate-float-up-fade');
    }, 1500);
  }

  /**
   * Swap the mute icon in the HUD button based on mute state.
   *
   * @param {boolean} isMuted
   *
   * Requirement: 9.5
   */
  toggleMuteIcon(isMuted) {
    if (this.elements.muteIcon) {
      this.elements.muteIcon.textContent = isMuted ? '🔇' : '🔊';
    }
  }

  // ---------------------------------------------------------------------------
  // Animation helpers
  // ---------------------------------------------------------------------------

  /**
   * Animate the bobber shake to indicate a fish bite.
   * Adds the CSS animation class, then removes it after ~1500ms (3 × 500ms cycles).
   *
   * Requirement: 10.2
   */
  animateBobberShake() {
    const el = this.elements.bobber;
    if (!el) return;

    el.classList.remove('animate-bobber-shake'); // reset if already animating

    // Force a reflow so removing + re-adding the class restarts the animation
    void el.offsetWidth;

    el.classList.add('animate-bobber-shake');
    setTimeout(() => {
      el.classList.remove('animate-bobber-shake');
    }, 1500);
  }

  /**
   * Create 5 cloud/bird span elements in the sky area with randomised
   * vertical positions and staggered animation delays.
   * Applied only when entering the `idle` state.
   *
   * Requirement: 10.6
   */
  renderBackgroundAnimations() {
    const sky = this.elements.skyArea;
    if (!sky) return;

    // Remove any previously created cloud elements to avoid accumulation
    const existing = sky.querySelectorAll('.cloud-element');
    existing.forEach((el) => el.remove());

    const emojis = ['☁️', '☁️', '🐦', '☁️', '🐦'];

    emojis.forEach((emoji, index) => {
      const span = document.createElement('span');
      span.className = 'cloud-element animate-cloud-drift';
      span.textContent = emoji;
      span.setAttribute('aria-hidden', 'true');

      // Random vertical position between 5% and 70%
      const topPct = 5 + Math.random() * 65;
      span.style.top = `${topPct}%`;

      // Stagger animation delays so clouds don't all move in sync
      const delayS = (index * 3 + Math.random() * 2).toFixed(2);
      span.style.animationDelay = `-${delayS}s`;

      sky.appendChild(span);
    });
  }

  /**
   * Start a repeating interval (every 800ms) that creates ripple circles
   * at random horizontal positions in the water area.
   * Each ripple element is removed automatically after 2000ms.
   *
   * Requirement: 1.2
   */
  startWaterRipples() {
    if (this._rippleIntervalId !== null) return; // already running

    this._rippleIntervalId = setInterval(() => {
      const container = this.elements.rippleContainer;
      if (!container) return;

      const ripple = document.createElement('div');
      ripple.className = 'ripple-circle animate-ripple';

      // Random horizontal position (10%–90% to keep circles visible)
      const leftPct = 10 + Math.random() * 80;
      ripple.style.left = `${leftPct}%`;
      ripple.style.top  = `${20 + Math.random() * 60}%`;

      container.appendChild(ripple);

      // Clean up the element once its animation completes
      setTimeout(() => {
        ripple.remove();
      }, 2000);
    }, 800);
  }

  /**
   * Stop the water ripple interval (e.g. when cleaning up).
   */
  stopWaterRipples() {
    if (this._rippleIntervalId !== null) {
      clearInterval(this._rippleIntervalId);
      this._rippleIntervalId = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Cast / Reel animation methods
  // ---------------------------------------------------------------------------

  /**
   * Animate the hook traveling from the rod tip to a random water entry point
   * along a quadratic Bézier arc, then trigger a splash effect.
   *
   * Duration is randomly chosen between 500ms and 800ms.
   * Stores the chosen duration on `this._castDuration` for inspection.
   *
   * @returns {Promise<void>} Resolves when the hook reaches the water.
   *
   * Requirements: 2.2, 2.3, 10.1, 10.5
   */
  animateCast() {
    return new Promise((resolve) => {
      // Pick a random duration in [500, 800] ms
      const duration = 500 + Math.floor(Math.random() * 301);
      this._castDuration = duration;

      const waterArea = this.elements.waterArea;
      if (!waterArea) {
        resolve();
        return;
      }

      const rect = waterArea.getBoundingClientRect();

      // Rod-tip position: left side of the ground area, slightly above water
      const rodTip = { x: 60, y: rect.top - 40 };

      // Random water entry point: 30%–70% of the water width, 20px below the top
      const waterEntry = {
        x: rect.width * 0.3 + Math.random() * rect.width * 0.4,
        y: rect.top + 20,
      };

      // Quadratic Bézier control point: midpoint horizontally, 100px above rod tip
      const control = {
        x: (rodTip.x + waterEntry.x) / 2,
        y: rodTip.y - 100,
      };

      const hook = this.elements.hook;
      if (hook) {
        hook.style.display = 'block';
      }

      const startTime = performance.now();

      const step = (now) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);

        const mt = 1 - t;
        const x = mt * mt * rodTip.x + 2 * mt * t * control.x + t * t * waterEntry.x;
        const y = mt * mt * rodTip.y + 2 * mt * t * control.y + t * t * waterEntry.y;

        if (hook) {
          hook.style.left = x + 'px';
          hook.style.top  = y + 'px';
        }

        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          // Hook has reached the water — show splash then resolve
          this.animateSplash(waterEntry.x, waterEntry.y);
          resolve();
        }
      };

      requestAnimationFrame(step);
    });
  }

  /**
   * Inject a splash visual at position (x, y) inside the water area.
   * The element is automatically removed after 400ms.
   *
   * @param {number} x — left offset in pixels
   * @param {number} y — top offset in pixels
   *
   * Requirement: 2.3
   */
  animateSplash(x, y) {
    const waterArea = this.elements.waterArea;
    if (!waterArea) return;

    const splash = document.createElement('div');
    splash.className = 'animate-splash';
    splash.setAttribute('aria-hidden', 'true');

    Object.assign(splash.style, {
      position:        'absolute',
      left:            x + 'px',
      top:             y + 'px',
      transform:       'translate(-50%, -50%)',
      width:           '40px',
      height:          '40px',
      borderRadius:    '50%',
      background:      'rgba(186,230,253,0.8)',
      pointerEvents:   'none',
    });

    waterArea.appendChild(splash);

    setTimeout(() => {
      splash.remove();
    }, 400);
  }

  /**
   * Animate the hook (and fish) linearly from its current screen position
   * back to the rod area.
   *
   * Duration is randomly chosen between 600ms and 1000ms.
   * Stores the chosen duration on `this._reelDuration` for inspection.
   *
   * @returns {Promise<void>} Resolves when the hook reaches the rod.
   *
   * Requirements: 3.2, 4.2, 10.4, 10.5
   */
  animateReel() {
    return new Promise((resolve) => {
      // Pick a random duration in [600, 1000] ms
      const duration = 600 + Math.floor(Math.random() * 401);
      this._reelDuration = duration;

      const hook = this.elements.hook;
      if (!hook) {
        resolve();
        return;
      }

      // Current hook position (set by animateCast)
      const startX = parseFloat(hook.style.left)  || 60;
      const startY = parseFloat(hook.style.top)   || 0;

      // Target: rod area — top of the ground section
      const groundEl = document.querySelector('#ground-area');
      const groundTop = groundEl ? groundEl.getBoundingClientRect().top : 0;
      const target = { x: 60, y: groundTop + 20 };

      const startTime = performance.now();

      const step = (now) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);

        const x = lerp(startX, target.x, t);
        const y = lerp(startY, target.y, t);

        hook.style.left = x + 'px';
        hook.style.top  = y + 'px';

        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          // Animation complete — hide the hook and resolve
          hook.style.display = 'none';
          resolve();
        }
      };

      requestAnimationFrame(step);
    });
  }

  // ---------------------------------------------------------------------------
  // Private utilities
  // ---------------------------------------------------------------------------

  /**
   * Show an element by adding `flex` and removing `hidden`.
   * @param {HTMLElement|null} el
   * @private
   */
  _show(el) {
    if (!el) return;
    el.classList.remove('hidden');
    el.classList.add('flex');
  }

  /**
   * Hide an element by adding `hidden` and removing `flex`.
   * @param {HTMLElement|null} el
   * @private
   */
  _hide(el) {
    if (!el) return;
    el.classList.add('hidden');
    el.classList.remove('flex');
  }
}

export default Renderer;
