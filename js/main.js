/**
 * main.js — Entry point for the Fishing Interactive Website.
 *
 * Wires together State_Manager, Renderer, Audio_Manager, EventBus,
 * and FishCatalog. Attaches all button click listeners and kicks off
 * the initial UI state.
 *
 * Requirements: 1.4, 2.1, 2.2, 3.2, 4.1, 4.2, 9.5
 */

import EventBus from './EventBus.js';
import State_Manager from './State_Manager.js';
import Renderer from './Renderer.js';
import Audio_Manager from './Audio_Manager.js';
import { FISH_CATALOG, selectFish } from './FishCatalog.js';

document.addEventListener('DOMContentLoaded', () => {
  // ---------------------------------------------------------------------------
  // Instantiate modules
  // ---------------------------------------------------------------------------
  const stateManager = new State_Manager();
  const renderer     = new Renderer();
  const audioManager = new Audio_Manager();

  // Initialise Renderer (caches DOM refs, subscribes to EventBus).
  renderer.init();

  // Initialise AudioManager asynchronously (loads sound assets).
  // Wrapped in an async IIFE so the rest of the setup is not blocked.
  (async () => {
    await audioManager.init();
  })();

  // Start background water ripples and show the start screen.
  renderer.startWaterRipples();
  renderer.showStartScreen();

  // ---------------------------------------------------------------------------
  // EventBus subscriptions — keep inventory panel in sync with score changes
  // (score:updated fires on every addToInventory call)
  // ---------------------------------------------------------------------------
  EventBus.on('score:updated', () => {
    renderer.updateInventoryPanel(stateManager.inventory);
  });

  // ---------------------------------------------------------------------------
  // Button: Start game
  // ---------------------------------------------------------------------------
  const btnStart = document.querySelector('#btn-start');
  if (btnStart) {
    btnStart.addEventListener('click', () => {
      stateManager.startSession();
      renderer.hideStartScreen();
    });
  }

  // ---------------------------------------------------------------------------
  // Button: Cast
  //
  // Rather than calling stateManager.cast() (which has a stub 700ms timeout),
  // we drive the cast flow directly so Renderer.animateCast() controls the
  // actual timing. Requirements 2.1, 2.2, 2.4.
  // ---------------------------------------------------------------------------
  const btnCast = document.querySelector('#btn-cast');
  if (btnCast) {
    btnCast.addEventListener('click', () => {
      if (stateManager.gameState !== 'idle') return; // guard (Requirement 2.5)

      stateManager.transitionTo('casting');
      EventBus.emit('cast:initiated');

      renderer.animateCast().then(() => {
        stateManager.transitionTo('waiting');
        stateManager.scheduleBite();
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Button: Reel
  //
  // Similarly, we drive the reel flow directly so Renderer.animateReel()
  // controls the actual timing. Requirements 4.1, 4.2, 4.7.
  // ---------------------------------------------------------------------------
  const btnReel = document.querySelector('#btn-reel');
  if (btnReel) {
    btnReel.addEventListener('click', () => {
      if (stateManager.gameState !== 'biting') return; // guard (Requirement 4.8)

      // Cancel the pending miss-event reaction window.
      clearTimeout(stateManager.reactionTimeoutId);
      stateManager.reactionTimeoutId = null;

      stateManager.transitionTo('reeling');

      // Select a fish and update inventory + score.
      const caughtFish = selectFish(FISH_CATALOG);
      stateManager.addToInventory(caughtFish);

      // Emit fish:caught so Renderer shows the notification and
      // Audio_Manager plays the catch sound.
      EventBus.emit('fish:caught', {
        fish: caughtFish,
        score: stateManager.score,
        inventory: stateManager.inventory,
      });

      // Run the reel animation; return to idle when it completes.
      renderer.animateReel().then(() => {
        stateManager.transitionTo('idle');
        renderer.updateInventoryPanel(stateManager.inventory);
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Button: Restart (Main Lagi)
  // ---------------------------------------------------------------------------
  const btnRestart = document.querySelector('#btn-restart');
  if (btnRestart) {
    btnRestart.addEventListener('click', () => {
      stateManager.restartSession();
      renderer.hideResultScreen();
    });
  }

  // ---------------------------------------------------------------------------
  // Button: Mute toggle
  // ---------------------------------------------------------------------------
  const btnMute = document.querySelector('#btn-mute');
  if (btnMute) {
    btnMute.addEventListener('click', () => {
      stateManager.toggleMute();
      audioManager.toggle();
      renderer.toggleMuteIcon(stateManager.isMuted);
    });
  }
});
