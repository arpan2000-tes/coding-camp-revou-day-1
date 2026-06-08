/**
 * EventBus — minimal publish-subscribe singleton.
 *
 * Used as the cross-component communication backbone.
 * All modules import this same instance via ES module caching,
 * so it acts as a true singleton without a class constructor.
 *
 * Events used in this project:
 *   state:changed   — { from, to }
 *   score:updated   — { score, fishCount }
 *   timer:tick      — { remaining }
 *   session:ended   — { score, inventory, highScore }
 *   fish:caught     — { fish, score, inventory }
 *   bite:occurred   — {}
 *   miss:occurred   — {}
 *   cast:initiated  — {}
 */

/** @type {Object.<string, Function[]>} */
const _listeners = {};

const EventBus = {
  /**
   * Register a handler for an event.
   * Multiple handlers per event are supported.
   *
   * @param {string} eventName
   * @param {Function} handler
   */
  on(eventName, handler) {
    if (!_listeners[eventName]) {
      _listeners[eventName] = [];
    }
    _listeners[eventName].push(handler);
  },

  /**
   * Remove a previously registered handler by exact reference.
   * If the handler is not found, this is a no-op.
   *
   * @param {string} eventName
   * @param {Function} handler
   */
  off(eventName, handler) {
    if (!_listeners[eventName]) return;
    _listeners[eventName] = _listeners[eventName].filter(
      (h) => h !== handler
    );
  },

  /**
   * Call every registered handler for the event with the given payload.
   * Individual handler errors are caught and logged with console.error
   * so one bad subscriber never breaks the others.
   *
   * @param {string} eventName
   * @param {*} [payload]
   */
  emit(eventName, payload) {
    if (!_listeners[eventName]) return;
    // Snapshot the array so that handlers added/removed during emit
    // don't affect the current dispatch cycle.
    const handlers = _listeners[eventName].slice();
    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (err) {
        console.error(
          `[EventBus] Error in handler for "${eventName}":`,
          err
        );
      }
    }
  },
};

export default EventBus;
