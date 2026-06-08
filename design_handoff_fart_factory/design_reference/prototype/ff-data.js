/* ============================================================
   FART FACTORY — slice data
   Axes are 0–5. Foods hide their axes until discovered by use.
   ============================================================ */
(function(){
  // axis display metadata
  const AXES = {
    wet:    { e:'💦', label:'Wet' },
    dry:    { e:'🍂', label:'Dry' },
    stink:  { e:'🤢', label:'Stink' },
    loud:   { e:'🔊', label:'Loud' },
    musical:{ e:'🎺', label:'Tooty' },
    heat:   { e:'🌶️', label:'Spicy' },
  };
  const AXIS_ORDER = ['wet','dry','stink','loud','musical','heat'];

  // FOODS — ax holds the TRUE hidden profile. perk unlocks at mastery.
  const FOODS = [
    { id:'beans',    e:'🫘', n:'Beans',     r:'c', belly:3, ax:{stink:3,loud:3,dry:2},          perk:'+1 LOUD when mastered' },
    { id:'egg',      e:'🥚', n:'Egg',       r:'c', belly:2, ax:{stink:5,dry:1},                 perk:'−1 belly when mastered' },
    { id:'cheese',   e:'🧀', n:'Cheese',    r:'c', belly:3, ax:{stink:4,wet:1},                 perk:'+1 STINK when mastered' },
    { id:'garlic',   e:'🧄', n:'Garlic',    r:'c', belly:2, ax:{stink:4,heat:1},                perk:'+1 SPICY when mastered' },
    { id:'onion',    e:'🧅', n:'Onion',     r:'c', belly:2, ax:{stink:3,wet:2},                 perk:'−1 belly when mastered' },
    { id:'broccoli', e:'🥦', n:'Broccoli',  r:'u', belly:3, ax:{musical:3,loud:1,stink:2},      perk:'+1 TOOTY when mastered' },
    { id:'kombucha', e:'🫖', n:'Kombucha',  r:'r', belly:2, ax:{wet:4,musical:2},               perk:'+1 TOOTY when mastered' },
    { id:'pepper',   e:'🌶️', n:'Pepper',    r:'u', belly:2, ax:{loud:3,heat:4},                 perk:'+1 LOUD when mastered' },
    { id:'cabbage',  e:'🥬', n:'Cabbage',   r:'u', belly:3, ax:{stink:3,wet:2,musical:2},       perk:'+1 STINK when mastered' },
    { id:'pickle',   e:'🥒', n:'Pickle',    r:'u', belly:2, ax:{wet:3,stink:2},                 perk:'−1 belly when mastered' },
  ];

  // RECIPES — emergent combos. effect types: mult(ax,x) / bonus(amt) / transform / crowd
  const RECIPES = [
    { id:'classic', set:['beans','egg'],            n:'The Classic',    r:'c',
      effect:{type:'mult', ax:'stink', x:1.5}, blurb:'+50% STINK · deep rumble' },
    { id:'lullaby', set:['kombucha','broccoli'],    n:'The Lullaby Toot', r:'u',
      effect:{type:'mult', ax:'musical', x:1.7}, blurb:'+70% TOOTY · sings a little tune' },
    { id:'fizz',    set:['kombucha','pickle'],      n:'Fizz Bomb',      r:'u',
      effect:{type:'mult', ax:'wet', x:1.6}, blurb:'+60% WET · fizzy & loud' },
    { id:'kraut',   set:['cabbage','pepper'],       n:'Spicy Kraut',    r:'u',
      effect:{type:'bonus', amt:0.12}, blurb:'+12% match · pure chaos' },
    { id:'royal',   set:['cheese','garlic','egg'],  n:'Royal Rumbler',  r:'r',
      effect:{type:'bonus', amt:0.16}, blurb:'Refined funk · +16% match' },
    { id:'inferno', set:['pepper','garlic','beans'],n:'The Inferno',    r:'r',
      effect:{type:'mult', ax:'heat', x:1.8}, blurb:'+80% SPICY · the kettle screams' },
  ];

  // CROWDS — wants = judged axes (target 0..1, weight). hates handled as target 0.
  // Venue ladder order. rarity: common | rare. boss flag for headliner.
  const CROWDS = [
    { id:'granny', e:'👵', n:'Granny Edna', rarity:'common', diff:1,
      role:"Today's crowd",
      line:'A polite little tune, dear. Nothing too loud!',
      wants:[ {ax:'musical',target:0.85,w:2.2}, {ax:'loud',target:0.1,w:1.6,hate:true} ],
      chips:[ {ax:'musical',type:'want'}, {ax:'loud',type:'no'} ],
      gold:24, grant:'broccoli', intro:{e:'🥦', t:'A new food appeared!', b:'<b>Broccoli</b> joined your pantry. Some foods are secretly <b>musical</b> 🎺 — Granny will love that.'} },

    { id:'frat', e:'😎', n:'The Frat Pack', rarity:'common', diff:2,
      role:'Show 2 · rowdy',
      line:'BRO. Make it RIP and make it STANK. Go BIG!!',
      wants:[ {ax:'loud',target:0.9,w:2.2}, {ax:'stink',target:0.8,w:1.7} ],
      chips:[ {ax:'loud',type:'want'}, {ax:'stink',type:'want'} ],
      gold:34, grant:'pepper', intro:{e:'🌶️', t:'Heads up: it gets harder', b:'These two judge <b>TWO</b> things at once — LOUD <b>and</b> STINK. Stack foods that bring both. <b>Pepper</b> joined your pantry.'} },

    { id:'critic', e:'🤖', n:'The Critic-Bot', rarity:'rare', diff:3,
      role:'★ Rare VIP',
      line:'Requesting maximum offense. Moisture will not be tolerated.',
      wants:[ {ax:'stink',target:0.92,w:2.2}, {ax:'loud',target:0.7,w:1.2}, {ax:'wet',target:0.0,w:1.6,hate:true} ],
      chips:[ {ax:'stink',type:'want'}, {ax:'loud',type:'want'}, {ax:'wet',type:'no'} ],
      gold:80, vip:true, intro:{e:'🤖', t:'A Rare VIP showed up!', b:'The Critic-Bot wants it <b>rotten &amp; loud</b> but <b>HATES wet</b> 💦. Nail it for a guaranteed rare unlock + big gold.'} },

    { id:'mayor', e:'👑', n:'The Mayor', rarity:'boss', diff:4,
      role:'⚔ Headliner · Boss',
      line:'Impress me with something LOUD and DIGNIFIED. And absolutely nothing… wet.',
      wants:[ {ax:'loud',target:0.85,w:2}, {ax:'stink',target:0.75,w:1.5}, {ax:'wet',target:0.0,w:1.4,hate:true} ],
      chips:[ {ax:'loud',type:'want'}, {ax:'stink',type:'want'}, {ax:'wet',type:'no'} ],
      gold:150, boss:true, intro:{e:'👑', t:'BOSS: The Mayor', b:'The headliner of Hometown. Bring your best <b>recipe</b> — a named combo bonus is how you tip a boss over the edge.'} },
  ];

  // tutorial cards shown before the very first show
  const TUTORIAL = [
    { e:'🧪', t:'Welcome, Fart Scientist!', b:'An audience just sat down. Tap foods to <b>plate</b> them, then hold the big green button to <b>BLAST</b>.' },
    { e:'👀', t:'Read what they crave', b:'Every crowd wants something different. Match their craving to win — but you don\u2019t know what each food does yet…' },
    { e:'🔍', t:'Discover by doing', b:'Launch a food and you\u2019ll <b>learn what it does</b> 💦🤢🔊🎺. Your field guide fills in by itself as you play!' },
  ];

  window.FF_DATA = {
    AXES, AXIS_ORDER, FOODS, RECIPES, CROWDS, TUTORIAL, BELLY_MAX:10, AXIS_CAP:8,
    STARTER:['beans','egg','cheese','garlic','onion'],
    SHOP:[
      { food:'kombucha', cost:90, tag:'★ Rare' },
      { food:'cabbage',  cost:55 },
      { food:'pickle',   cost:45 },
    ],
    TREATMENTS:[
      { id:'ferment', e:'🫧', n:'Ferment', d:{stink:2}, blurb:'+2 stink, slower' },
      { id:'spice',   e:'🌶️', n:'Spice',   d:{heat:2,loud:1}, blurb:'+2 spicy, +1 loud' },
      { id:'chill',   e:'❄️', n:'Chill',   d:{wet:-2,stink:-1}, blurb:'−2 wet, −1 stink' },
    ],
  };
})();
