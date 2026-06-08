/**
 * utils.js — Shared helper functions for the Fishing Interactive Website.
 * All exports are named ES module exports; no build tools required.
 */

/**
 * Returns a random integer n where min ≤ n ≤ max (inclusive on both ends).
 * @param {number} min - Lower bound (inclusive)
 * @param {number} max - Upper bound (inclusive)
 * @returns {number}
 */
export function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Clamps a number to the [min, max] range.
 * @param {number} value - The value to clamp
 * @param {number} min   - Lower bound
 * @param {number} max   - Upper bound
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between a and b by factor t.
 * t = 0 returns a; t = 1 returns b.
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor
 * @returns {number}
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Schedules `callback` to be called after approximately `ms` milliseconds.
 * Uses a requestAnimationFrame loop when available; falls back to setTimeout
 * when requestAnimationFrame is not defined (e.g. Node.js / older environments).
 * @param {Function} callback - Function to invoke after the delay
 * @param {number}   ms       - Delay in milliseconds
 */
export function rafOrTimeout(callback, ms) {
  if (typeof requestAnimationFrame === 'undefined') {
    setTimeout(callback, ms);
    return;
  }

  const start = performance.now();

  function tick(now) {
    if (now - start >= ms) {
      callback();
    } else {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);
}
