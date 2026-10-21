/* 中文 for TT Lion Dance, loaded after js/keys.js. Kid-friendly words: 舞狮, 狮头, 狮尾, 锣鼓, 梅花桩, 采青.
   The kids' names and the game name stay English (the logo adds 舞狮 under it in 中文). */
Kit.lang.keep(['TEDDY', 'TOMMY', 'FOXY', 'FROGGY', 'TT', 'LION DANCE', 'TT Lion Dance', 'Esc']);
Kit.lang.add({
  // home
  'Drum, dance, leap, and pluck the green!': '敲锣打鼓，舞狮采青！',
  'Pick a song': '选一首曲子',
  'LANTERN WALK': '灯笼步',
  'PLUM BLOSSOM POLES': '梅花桩',
  'RED ENVELOPE RUSH': '红包快跑',
  'Who dances?': '谁来舞狮？',
  'Teddy dances': 'Teddy 来舞狮',
  'Tommy dances': 'Tommy 来舞狮',
  'Teddy and Tommy dance': 'Teddy 和 Tommy 一起舞狮',
  'BOTH': '一起',
  'The story': '舞狮的故事',
  'Dance! (Enter)': '开始！（回车）',
  'Dance!': '开始！',
  // the story
  'THE LION DANCE': '舞狮',
  "Let's dance!": '开始舞狮！',
  // playing
  'READY?': '准备好了吗？',
  'Pause (P)': '暂停（P）',
  'Pause': '暂停',
  'Sound (M)': '声音（M）',
  'Sound on or off': '声音 开 / 关',
  'Call your brother': '叫兄弟来帮忙',
  'High five': '击掌',
  'DRUM': '鼓',
  'GONG': '锣',
  'CYMBAL': '镲',
  'ANY PAD!': '哪个都行！',
  'PERFECT!': '完美！',
  'GREAT!': '很棒！',
  'OK!': '还行！',
  'OOPS': '哎呀',
  '🐣 EASY': '🐣 简单',
  '🔥 NORMAL': '🔥 普通',
  'THE LION WAKES UP!': '狮子醒啦！',
  'UP ONTO THE POLES!': '跳上梅花桩！',
  'THE LAST POLE!': '最后一根桩！',
  'REACH FOR THE GREEN!': '准备采青！',
  'IT PLUCKED THE GREEN!': '采青成功！',
  'LUCKY LEAVES FOR EVERYONE!': '撒生菜，大家都有好运！',
  'HIGH FIVE!': '击掌！',
  'THE LION IS TIRED!': '狮子累了！',
  // pause and results
  'Keep dancing': '继续舞狮',
  'Start the song again': '从头再来',
  'Songs': '选曲子',
  'Play again': '再玩一次',
  'Next song': '下一首',
  'THE LION PLUCKED THE GREEN!': '狮子采青成功！',
  'GREAT TEAM, LION BROTHERS!': '狮子兄弟，配合得真好！',
  'THE LION IS TIRED! TRY AGAIN!': '狮子累了！再试一次！',
  'NEW BEST!': '新纪录！',
  'HEAD': '狮头',
  'TAIL': '狮尾',
  // the ? panel
  '1 player': '单人',
  'Teddy (head) · Tommy (tail)': 'Teddy（狮头）· Tommy（狮尾）',
  'Teddy:': 'Teddy：',
  'Tommy:': 'Tommy：',
  '🥁 drum': '🥁 鼓',
  'gong': '锣',
  'cymbal': '镲',
  '🐣 EASY: any pad hits a gong': '🐣 简单：锣用哪个键都行',
  'pick a song': '选曲子',
  'level 🐣 / 🔥': '难度 🐣 / 🔥',
  'who dances': '谁来舞狮',
  'dance! · again': '开始 · 再来',
  'the story': '舞狮的故事',
  'Hit each drum, gong and cymbal as it lands on its pad: the lion dances, blinks, shakes and leaps over the poles. Playing alone, call your brother to play the big drum: easier timing for 8 seconds.':
    '鼓、锣、镲落到按钮上时就敲：狮子会跳舞、眨眼、摇头，还会跳上梅花桩。一个人玩时，叫兄弟来敲大鼓：8 秒内更容易敲准。',
  "Tap the big pads at the bottom as the notes land on them. Tap your brother's face to call him.": '音符落到下面的大按钮上时就点。点兄弟的脸，叫他来帮忙。',
});
const LD_LEVEL = { EASY: '简单', NORMAL: '普通' };
const LD_COUNT = { PERFECT: '完美', GREAT: '很棒', OK: '还行', MISS: '没敲到' };
const LD_TREAT = { 'ICE CREAM': '冰淇淋', WATER: '水', 'JUICE BOX': '果汁', COOKIE: '饼干', WATERMELON: '西瓜', BANANA: '香蕉' };
Kit.lang.rule(/^(TEDDY|TOMMY) (EASY|NORMAL)$/, (m, who, lv) => `${who} ${LD_LEVEL[lv]}`);
Kit.lang.rule(/^(🐣 EASY|🔥 NORMAL) · (HEAD|TAIL)$/, (m, lv, half) => `${lv.slice(0, 2)} ${LD_LEVEL[lv.slice(3)]} · ${half === 'HEAD' ? '狮头' : '狮尾'}`);
Kit.lang.rule(/^(\d+) COMBO$/, '$1 连击');
Kit.lang.rule(/^(\d+) IN A ROW!$/, '连续 $1 个！');
Kit.lang.rule(/^(PERFECT|GREAT|OK|MISS) (\d+)$/, (m, k, n) => `${LD_COUNT[k]} ${n}`);
Kit.lang.rule(/^BEST ([\d,]+)$/, '最高分 $1');
Kit.lang.rule(/^(\S+) IS HERE!$/, '$1 来啦！');
Kit.lang.rule(/^(\S+) IS TIRED!$/, '$1 累了！');
Kit.lang.rule(/^(\S+) SAYS: I'LL PLAY THE BIG DRUM!$/, '$1 说：我来敲大鼓！');
Kit.lang.rule(/^(\S+) (ICE CREAM|WATER|JUICE BOX|COOKIE|WATERMELON|BANANA) FROM (\S+)!$/, (m, e, item, who) => `${e} ${who} 送来的${LD_TREAT[item]}！`);
