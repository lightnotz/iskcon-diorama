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

    // ── PASTE THIS as the FIRST entry inside PASTIME_REGISTRY = [ ... ]
// i.e. before the vasudeva entry. Vasudeva becomes card 02 automatically.

  {
    id:          'avirbhav',
    title:       'Krishna Avirbhav',
    description: 'The Supreme Lord appears in the Mathura prison at the auspicious midnight hour of Ashtami',
    image:       'images/avirbhav.jpg',
    file:        'avirbhav.html',
    chatCtx:     'Krishna Avirbhav — the divine appearance of Lord Krishna as the eighth child of Devaki and Vasudeva in the prison of King Kamsa in Mathura, on the auspicious Ashtami midnight. He first revealed His four-armed Vishnu form to His parents, then transformed into a newborn infant.',
  },


  {
    id:          'vasudeva',
    title:       'Vasudeva Carries Krishna',
    description: 'On the night of Krishna\'s appearance, Vasudeva crosses the Yamuna guarded by Ananta Shesha',
    image:       'images/vasudeva.jpg',
    file:        'vasudeva.html',
    chatCtx:     'Vasudeva carries baby Krishna across the Yamuna river on the night of Krishna\'s appearance in Mathura prison, protected by Ananta Shesha, to reach Gokul safely',
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
  id:          'trinavarta',
  title:       'Trinavarta Vadha',
  description: 'Baby Krishna slays the demon Trinavarta who attacked as a ferocious whirlwind',
  image:       'images/trinavarta.jpg',
  file:        'trinavarta.html',
  chatCtx:     'Trinavarta Vadha — baby Krishna killing the demon Trinavarta who came disguised as a whirlwind, becoming inconceivably heavy and seizing the demon by the throat',
},

{
  id:          'fruitseller',
  title:       'The Fruit Seller\'s Fortune',
  description: 'A fruit seller offers fruits with pure love and the Lord fills her basket with jewels',
  image:       'images/fruitseller.jpg',
  file:        'fruitseller.html',
  chatCtx:     'The Fruit Seller\'s Fortune — young Krishna exchanges grains for fruits with an old fruit seller woman, and the Lord transforms her remaining fruits into precious jewels as a reward for her pure unconditional love',
},

{
  id:          'universalform',
  title:       'Brahmananda Darshana',
  description: 'Mother Yashoda opens Krishna\'s mouth to find mud — and beholds the entire universe within',
  image:       'images/universalform.jpg',
  file:        'universalform.html',
  chatCtx:     'Brahmananda Darshana — Mother Yashoda looks into Krishna\'s mouth after complaints He ate mud, only to behold the entire universe all planets, creation, past and future within Him, before Krishna withdraws His yogamaya and she forgets everything',
},

// ─────────────────────────────────────────────────────────────────────────────

  {
    id:          'butterthief',
    title:       'The Butter Thief',
    description: 'Krishna and Balarama steal butter across Gokula while the gopis lovingly complain to Mother Yashoda',
    image:       'images/butterthief.jpg',
    file:        'butterthief.html',
    chatCtx:     'The Butter Thief lila — Krishna and Balarama stealing butter in Gokula and the neighbors\' homes, the gopis bringing loving complaints to Mother Yashoda, Krishna blaming his own reflection, and the deeper meaning that He was not stealing butter but stealing hearts and turning the gopis into the greatest devotees',
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