/* The keys the ? panel shows. Press ? (Shift + /) in the game, or tap the round ? button (top left).
   The panel and the freeze live in the shared kit: kit/help.js (Kit.help). */
Kit.help.setup({
  title: window.LD_TITLE,
  cols: ['1 player', 'Teddy (head) · Tommy (tail)'],
  keys: [
    ['🥁 drum', 'A or J or ←', 'Teddy: A'],
    ['gong', 'S or K or ↓ or Space', 'Teddy: D · Tommy: ←'],
    ['cymbal', 'D or L or →', 'Tommy: →'],
    ['🐣 EASY: any pad hits a gong', 'A D ← →', 'A D · ← →'],
    ['call your brother · high five', 'T or Enter', 'T or Enter'],
    ['pick a song', 'A D or ← →', 'A D or ← →'],
    ['level 🐣 / 🔥', 'W S or ↑ ↓', 'Teddy: W S · Tommy: ↑ ↓'],
    ['who dances', '1 2 3', '1 2 3'],
    ['dance! · again', 'Enter or Space', 'Enter or Space'],
    ['the story', 'B', 'B'],
    ['pause', 'P or Esc', 'P or Esc'],
    ['sound on / off', 'M', 'M'],
  ],
  note: 'Hit each drum, gong and cymbal as it lands on its pad: the lion dances, blinks, shakes and leaps over the poles. Playing alone, call your brother to play the big drum: easier timing for 8 seconds.',
  touch: "Tap the big pads at the bottom as the notes land on them. Tap your brother's face to call him.",
  button: { top: 'calc(env(safe-area-inset-top, 0px) + 10px)', left: 'max(10px, env(safe-area-inset-left, 0px))' },
});
