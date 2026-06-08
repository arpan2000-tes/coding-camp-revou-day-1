/**
 * FishCatalog.js
 *
 * Defines the full fish catalog for the Fishing Interactive Website and
 * exports a weighted-random selection function.
 *
 * Requirements: 5.1, 5.2, 5.3
 */

/**
 * @typedef {Object} FishType
 * @property {string} id            - Unique identifier
 * @property {string} name          - Display name
 * @property {string} emoji         - Emoji icon
 * @property {'common'|'uncommon'|'rare'} rarity - Rarity tier
 * @property {number} weight        - Selection weight (higher = more frequent)
 * @property {number} points        - Point value when caught
 * @property {string} rarityColor   - Tailwind color class for rarity badge
 */

/**
 * The complete fish catalog.
 * Total weight: 150
 *
 * Probability breakdown:
 *   ikan_mujair  50/150 ≈ 33.3%   (common)
 *   ikan_lele    40/150 ≈ 26.7%   (common)
 *   ikan_nila    25/150 ≈ 16.7%   (uncommon)
 *   ikan_mas     20/150 ≈ 13.3%   (uncommon)
 *   ikan_bawal   10/150 ≈  6.7%   (rare)
 *   ikan_arwana   5/150 ≈  3.3%   (rare)
 *
 * @type {FishType[]}
 */
export const FISH_CATALOG = [
  {
    id: 'ikan_mas',
    name: 'Ikan Mas',
    emoji: '🐡',
    rarity: 'uncommon',
    weight: 20,
    points: 40,
    rarityColor: 'text-yellow-500',
  },
  {
    id: 'ikan_lele',
    name: 'Ikan Lele',
    emoji: '🐠',
    rarity: 'common',
    weight: 40,
    points: 15,
    rarityColor: 'text-green-500',
  },
  {
    id: 'ikan_mujair',
    name: 'Ikan Mujair',
    emoji: '🐟',
    rarity: 'common',
    weight: 50,
    points: 10,
    rarityColor: 'text-green-500',
  },
  {
    id: 'ikan_nila',
    name: 'Ikan Nila',
    emoji: '🎣',
    rarity: 'uncommon',
    weight: 25,
    points: 30,
    rarityColor: 'text-yellow-500',
  },
  {
    id: 'ikan_bawal',
    name: 'Ikan Bawal',
    emoji: '🐙',
    rarity: 'rare',
    weight: 10,
    points: 75,
    rarityColor: 'text-purple-500',
  },
  {
    id: 'ikan_arwana',
    name: 'Ikan Arwana',
    emoji: '⚔️',
    rarity: 'rare',
    weight: 5,
    points: 120,
    rarityColor: 'text-purple-500',
  },
];

/**
 * Selects a fish from the catalog using a weighted random algorithm.
 * Fish with higher weight values are selected more frequently.
 *
 * @param {FishType[]} catalog - Array of fish objects, each with a `weight` property
 * @returns {FishType} The randomly selected fish
 */
export function selectFish(catalog) {
  const totalWeight = catalog.reduce((sum, f) => sum + f.weight, 0);
  let random = Math.random() * totalWeight;
  for (const fish of catalog) {
    random -= fish.weight;
    if (random <= 0) return fish;
  }
  // Fallback: handles floating-point edge cases where random ≈ totalWeight exactly
  return catalog[catalog.length - 1];
}
