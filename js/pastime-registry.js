// js/pastime-registry.js
// ─── SINGLE SOURCE OF TRUTH ───────────────────────────────────────────────────
//
// To add a new pastime:
//   1. Append an entry object here (copy the template at the bottom)
//   2. Create {id}.html  (copy vasudeva.html, change PASTIME_ID)
//   3. Add {id} block in js/pastime-data.js  (translations)
//   4. Add image: images/{id}.jpg
//   5. Add audio: audio/{id}-en.mp3, audio/{id}-hi.mp3, etc.
//   That's it. index.html and api/chat.js update automatically.
//
// To reorder cards later: drag the objects into the order you want.
// The card numbers on the homepage are assigned by array position,
// so position 0 = card 01, position 1 = card 02, and so on.
// ─────────────────────────────────────────────────────────────────────────────

const PASTIME_REGISTRY = [

  {
    id:          'vasudeva',
    title:       'Vasudeva Carries Krishna',
    description: 'On the night of Krishna\'s birth, Vasudeva crosses the Yamuna guarded by Ananta Shesha',
    image:       'images/vasudeva.jpg',
    file:        'vasudeva.html',
    chatCtx:     'Vasudeva carries baby Krishna across the Yamuna river on the night of Krishna\'s birth in Mathura prison, protected by Ananta Shesha, to reach Gokul safely',
  },

  {
  id:          'nandotsava',
  title:       'Nandotsava',
  description: 'The joyful celebration of Lord Krishna\'s divine appearance in Nanda\'s Gokula',
  image:       'images/nandotsava.jpg',
  file:        'nandotsava.html',
  chatCtx:     'Nandotsava — the grand celebration of Krishna\'s birth organised by Nanda Maharaja in Gokula, where the entire village rejoiced with gifts, music, and dancing',
},


  {
    id:          'kaliya',
    title:       'Kaliya Daman',
    description: 'Krishna subdues the serpent Kaliya in the Yamuna river',
    image:       'images/kaliya.jpg',
    file:        'pastime.html',
    chatCtx:     'Kaliya Daman — Krishna subduing the serpent Kaliya in the Yamuna river',
  },

  // ── Template — copy this block for each new pastime ───────────────────────
  // {
  //   id:          'govardhan',
  //   title:       'Govardhan Puja',
  //   description: 'Krishna lifts Govardhan hill to protect the villagers from Indra\'s wrath',
  //   image:       'images/govardhan.jpg',
  //   file:        'govardhan.html',
  //   chatCtx:     'Govardhan Puja — Krishna lifting Govardhan hill to protect the villagers',
  // },

];

// Array order = card display order. No sorting needed.
const PASTIME_REGISTRY_SORTED = PASTIME_REGISTRY;

// Keyed by id — for O(1) lookup (used by api/chat.js and translate.js)
const PASTIME_REGISTRY_MAP = Object.fromEntries(
  PASTIME_REGISTRY.map(p => [p.id, p])
);

// ── For Node.js (api/chat.js) ─────────────────────────────────────────────────
if (typeof module !== 'undefined') {
  module.exports = { PASTIME_REGISTRY, PASTIME_REGISTRY_SORTED, PASTIME_REGISTRY_MAP };
}