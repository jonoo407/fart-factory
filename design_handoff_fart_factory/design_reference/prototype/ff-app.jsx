/* ============================================================
   FART FACTORY — app logic, scoring, discovery, persistence
   ============================================================ */
const D = window.FF_DATA;
const A = window.FF_AUDIO;
const SAVE_KEY = 'ff_slice_v2';

/* ---- helpers ---- */
function perkOf(food){
  const p = food.perk.toUpperCase();
  if(p.includes('BELLY')) return {type:'belly'};
  if(p.includes('LOUD')) return {type:'ax',ax:'loud'};
  if(p.includes('STINK')) return {type:'ax',ax:'stink'};
  if(p.includes('SPICY')) return {type:'ax',ax:'heat'};
  if(p.includes('TOOTY')) return {type:'ax',ax:'musical'};
  return null;
}
function isMastered(food, reveals, mastery){
  return reveals.length===Object.keys(food.ax).length && (mastery||0)>=5;
}
function bellyCost(food, reveals, mastery){
  const pk = perkOf(food);
  let c = food.belly;
  if(pk && pk.type==='belly' && isMastered(food, reveals[food.id]||[], mastery[food.id])) c=Math.max(1,c-1);
  return c;
}
function findRecipe(plate){
  if(plate.length<2) return null;
  const setIds = plate.slice().sort();
  // exact-set match first, then subset (best rarity)
  let best=null; const rank={c:0,u:1,r:2,e:3,l:4};
  for(const rec of D.RECIPES){
    const need = rec.set.slice().sort();
    const ok = need.every(id=>plate.includes(id)) && plate.length>=need.length
      && need.length===new Set(plate).size; // all plated foods used by recipe (no extras)
    const subset = need.every(id=>plate.includes(id));
    if(ok || subset){ if(!best || rank[rec.r]>rank[best.r]) best=rec; }
  }
  return best;
}

/* ---- core scoring ---- */
function computeLaunch(plate, foods, recipe, reveals, mastery, crowd, quality, treatment){
  // raw axis sums (+ mastery axis perks)
  const raw = {wet:0,dry:0,stink:0,loud:0,musical:0,heat:0};
  let belly=0;
  plate.forEach(id=>{
    const f = foods.find(x=>x.id===id);
    Object.entries(f.ax).forEach(([k,v])=>raw[k]+=v);
    const pk=perkOf(f);
    if(pk && pk.type==='ax' && isMastered(f,(reveals[id]||[]),mastery[id])) raw[pk.ax]+=1;
    belly += f.belly;
  });
  // recipe multiplier on raw axis
  if(recipe && recipe.effect.type==='mult') raw[recipe.effect.ax]*=recipe.effect.x;
  // kitchen treatment
  if(treatment) Object.entries(treatment.d).forEach(([k,v])=>{ raw[k]=Math.max(0,raw[k]+v); });
  // normalize 0..1
  const ax={}; D.AXIS_ORDER.forEach(k=>ax[k]=Math.min(1,raw[k]/D.AXIS_CAP));
  ax.length = Math.min(1, belly/D.BELLY_MAX);

  // base match — steeper curve + you must satisfy EVERY want (weakest link matters),
  // and violating a "hate" axis tanks the score hard.
  let sum=0,tot=0,minClose=1; const axisFeedback=[]; let hatePenalty=0;
  crowd.wants.forEach(w=>{
    const v=ax[w.ax]||0;
    const dist=Math.abs(w.target-v);
    const closeness = Math.max(0, 1 - Math.pow(dist, 0.85)*1.5);
    sum += w.w*closeness; tot += w.w;
    if(closeness<minClose) minClose=closeness;
    if(w.hate) hatePenalty = Math.max(hatePenalty, v); // how badly you broke the "no ___" rule
    const wantHigh = w.target>=0.5;
    const hit = closeness>=0.8, near = closeness>=0.55;
    axisFeedback.push({
      ax:w.ax, hate:!!w.hate, wantHigh, target:w.target,
      got:v, status: hit?'hit':near?'near':'miss', closeness
    });
  });
  // weakest-link blend: average is only 55%, the worst axis is 45% — can't coast by nailing one.
  let base = tot? (0.55*(sum/tot) + 0.45*minClose) : 0;
  // hate violation: up to −65%
  base *= (1 - 0.65*hatePenalty);

  const breakdown=[{base:true, icon:'🎯', label:'Base match', val:Math.round(base*100)+'%'}];
  let bonus=0;
  if(recipe){
    if(recipe.effect.type==='bonus'){ bonus+=recipe.effect.amt;
      breakdown.push({plus:true, icon:'⚡', label:'Recipe · '+recipe.n, val:'+'+Math.round(recipe.effect.amt*100)+'%'}); }
    else breakdown.push({plus:true, icon:'⚡', label:'Recipe · '+recipe.n, val:recipe.blurb.split('·')[0].trim()});
  }
  let final = Math.min(1, base+bonus);
  // charge
  if(quality>1.001){ breakdown.push({plus:true, icon:'💥', label:'Perfect charge', val:'×'+quality.toFixed(2)}); final=Math.min(1,final*quality); }
  else if(quality<0.999){ breakdown.push({icon:'💨', label:'Weak charge', val:'×'+quality.toFixed(2)}); final*=quality; }

  const pct = Math.round(final*100);
  let grade,tier;
  if(pct>=90){grade='S';tier='S';}
  else if(pct>=80){grade='A';tier='A';}
  else if(pct>=68){grade='B';tier='B';}
  else if(pct>=50){grade='C';tier='C';}
  else {grade='F';tier='F';}
  const stars = pct>=80?3:pct>=68?2:pct>=50?1:0;
  const passed = pct>=50;
  return { ax, base, final, pct, grade, tier, stars, breakdown, belly, axisFeedback, passed };
}

/* ---- main app ---- */
function App(){
  const foods = D.FOODS;
  const load = ()=>{ try{ return JSON.parse(localStorage.getItem(SAVE_KEY))||{}; }catch(e){ return {}; } };
  const saved = load();

  const [phase,setPhase] = useState(saved.started?'play':'intro');     // intro|crowdintro|play|reaction|ladder|guide|win
  const [tutStep,setTutStep] = useState(0);
  const [index,setIndex] = useState(saved.index||0);
  const [reveals,setReveals] = useState(saved.reveals||{});
  const [mastery,setMastery] = useState(saved.mastery||{});
  const [discovered,setDiscovered] = useState(saved.discovered||[]);
  const [gold,setGold] = useState(saved.gold!=null?saved.gold:0);
  const [notes,setNotes] = useState(saved.notes||0);
  const [stars,setStars] = useState(saved.stars||{});
  const [plate,setPlate] = useState([]);
  const [result,setResult] = useState(null);
  const [muted,setMuted] = useState(false);
  const [shake,setShake] = useState('');
  const [crowdIntroShown,setCrowdIntroShown] = useState(saved.introShown||{});
  const [guideFrom,setGuideFrom] = useState('play');
  const [ladderMode,setLadderMode] = useState('advance');
  const [owned,setOwned] = useState(saved.owned||D.STARTER.slice());
  const [treatment,setTreatment] = useState(saved.treatment||null);
  const [bookTab,setBookTab] = useState('foods');
  const [overlayFrom,setOverlayFrom] = useState('play');
  const [earnedGold,setEarnedGold] = useState(saved.earnedGold||{});

  const crowd = D.CROWDS[index];
  const recipe = findRecipe(plate);
  const pantryFoods = foods.filter(f=>owned.includes(f.id));
  const activeTreatment = treatment ? D.TREATMENTS.find(t=>t.id===treatment) : null;
  const bellyUsed = plate.reduce((a,id)=>a+bellyCost(foods.find(f=>f.id===id),reveals,mastery),0);

  // persist
  useEffect(()=>{
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      started:phase!=='intro', index, reveals, mastery, discovered, gold, notes, stars, introShown:crowdIntroShown, owned, treatment, earnedGold
    }));
  },[phase,index,reveals,mastery,discovered,gold,notes,stars,crowdIntroShown,owned,treatment,earnedGold]);

  useEffect(()=>{ A.setMuted(muted); },[muted]);

  const canAdd = (f)=> plate.length<4 && (bellyUsed + bellyCost(f,reveals,mastery))<=D.BELLY_MAX;

  const addFood = (f)=>{
    if(!canAdd(f)){ A.ui.error(); return; }
    A.ui.plop(); setPlate(p=>[...p,f.id]);
  };
  const removeFood = (i)=>{ A.ui.pick(); setPlate(p=>p.filter((_,j)=>j!==i)); };

  // counts for pantry badges
  const counts={}; plate.forEach(id=>counts[id]=(counts[id]||0)+1);

  const adjWord = (v)=> v>=5?'SUPER':v>=4?'really':v>=3?'pretty':v>=2?'a little':'barely';

  const launch = (quality)=>{
    if(plate.length===0) return;
    const r = computeLaunch(plate, foods, recipe, reveals, mastery, crowd, quality, activeTreatment);
    if(activeTreatment) r.breakdown.push({icon:activeTreatment.e, label:activeTreatment.n, val:activeTreatment.blurb.split(',')[0]});
    // play the fart (the readout), then crowd reaction
    A.resume();
    const len = A.fart(r.ax, {}) || 1;
    setTimeout(()=>A.crowd(r.tier), Math.min(2200, len*1000));

    // ---- discovery: reveal one new axis per unique food ----
    const newReveals = {...reveals}; const newMastery={...mastery}; const learned=[];
    [...new Set(plate)].forEach(id=>{
      const f=foods.find(x=>x.id===id);
      newMastery[id]=(newMastery[id]||0)+1;
      const cur = newReveals[id] ? [...newReveals[id]] : [];
      const remaining = D.AXIS_ORDER.filter(k=>f.ax[k]>0 && !cur.includes(k))
        .sort((a,b)=>f.ax[b]-f.ax[a]);
      if(remaining.length){
        const k=remaining[0]; cur.push(k); newReveals[id]=cur;
        learned.push({food:f.n, ax:k, adj:adjWord(f.ax[k])+' '+D.AXES[k].label.toUpperCase()});
      } else { newReveals[id]=cur; }
    });

    // ---- recipe discovery ----
    let newRecipe=null;
    if(recipe && !discovered.includes(recipe.id)){
      newRecipe={...recipe, foodsEmoji:recipe.set.map(id=>foods.find(f=>f.id===id).e).join('')};
      setDiscovered(d=>[...d,recipe.id]); A.ui.unlock();
    }

    // ---- rewards (gold only pays the IMPROVEMENT over your best on this crowd — no farming) ----
    const passed = r.passed;
    let goldGain=0, noteGain=0;
    if(passed){
      const full=Math.round(crowd.gold*r.final);
      const prev=earnedGold[crowd.id]||0;
      goldGain=Math.max(0, full-prev);
      if(goldGain>0){ setGold(g=>g+goldGain); setEarnedGold(e=>({...e,[crowd.id]:full})); A.ui.coins(); }
    }
    const novel = !(saved._seen||[]).includes(plate.slice().sort().join('+'));
    noteGain = (passed?1:2) + (newRecipe?2:0) + (learned.length?1:0);
    setNotes(n=>n+noteGain);
    if(learned.length) r.breakdown.push({plus:true, icon:'✨', label:'Discovery bonus', val:'+'+noteGain+' 📝'});

    setReveals(newReveals); setMastery(newMastery);
    setStars(s=>({...s,[crowd.id]:Math.max(s[crowd.id]||0, r.stars)}));

    const tierText={
      S:'They lost their MINDS! 🤯', 'A+':'Standing ovation! 🥹', A:'Big hit! 😄',
      B:'Pretty good! 🙂', C:'Eh… they\u2019ll take it. 😬', F:'Total flop. 💀'
    };
    const voText={
      S:'I have NEVER smelled anything like that. ENCORE!', 'A+':'Bravo! Simply magnificent!',
      A:'Now THAT is what I came for!', B:'Not bad at all, scientist.',
      C:'…it will do, I suppose.', F:'Get this fraud off my stage!'
    };
    setResult({
      grade:r.grade, tier:r.tier, matchPct:r.pct, verdict:tierText[r.tier], vo:voText[r.tier],
      breakdown:r.breakdown, learned, newRecipe, gold:goldGain, stink:r.ax.stink,
      passed:r.passed, axisFeedback:r.axisFeedback, stars:r.stars
    });
    setPhase('reaction');
  };

  const retryShow = ()=>{
    A.ui.thunk(); setPlate([]); setResult(null); setPhase('play');
  };
  const continueAfter = ()=>{
    // a flop (F / under 50%) cannot advance — must retry the crowd.
    if(result && !result.passed){ retryShow(); return; }
    A.ui.thunk();
    setPlate([]); setResult(null);
    if(crowd.boss){ setPhase('win'); return; }
    setLadderMode('advance'); setPhase('ladder');
  };

  const playNext = ()=>{
    const ni = index+1;
    if(ni>=D.CROWDS.length){ setPhase('win'); return; }
    setIndex(ni);
    const c=D.CROWDS[ni];
    if(c.intro && !crowdIntroShown[c.id]){ setPhase('crowdintro'); }
    else setPhase('play');
  };

  const grantFood = (id)=>{ if(id) setOwned(o=>o.includes(id)?o:[...o,id]); };

  const dismissCrowdIntro = ()=>{
    A.ui.page(); if(crowd.grant) grantFood(crowd.grant);
    setCrowdIntroShown(s=>({...s,[crowd.id]:true})); setPhase('play');
  };

  const resetGame = ()=>{
    localStorage.removeItem(SAVE_KEY);
    setIndex(0);setReveals({});setMastery({});setDiscovered([]);setGold(0);setNotes(0);setStars({});
    setPlate([]);setResult(null);setCrowdIntroShown({});setTutStep(0);
    setOwned(D.STARTER.slice());setTreatment(null);setEarnedGold({});setPhase('intro');
  };

  const lockedTap = (name)=>{ A.ui.error(); setShake(name); setTimeout(()=>setShake(''),400); };
  const openOverlay = (ph)=>{ A.ui.page(); setOverlayFrom(phase==='reaction'?'play':phase); setPhase(ph); };
  const openGuide = ()=>{ setBookTab('foods'); openOverlay('book'); };
  const openLadder = ()=>{ A.ui.page(); setLadderMode('view'); setPhase('ladder'); };
  const buyFood = (s)=>{
    if(gold<s.cost || owned.includes(s.food)) { A.ui.error(); return; }
    setGold(g=>g-s.cost); grantFood(s.food); A.ui.coins();
  };
  const toggleTreatment = (id)=>{ A.ui.pick(); setTreatment(t=>t===id?null:id); };

  // ----- intro tutorial -----
  if(phase==='intro'){
    const card=D.TUTORIAL[tutStep];
    return (
      <Phone>
        <IntroCard card={card} steps={D.TUTORIAL.length} step={tutStep}
          onSkip={()=>{ const c=D.CROWDS[0]; setCrowdIntroShown(s=>({...s,[c.id]:true})); setPhase('play'); }}
          onNext={()=>{
            if(tutStep<D.TUTORIAL.length-1){ A.ui.page(); setTutStep(s=>s+1); }
            else { A.resume(); const c=D.CROWDS[0]; if(c.intro){ setPhase('crowdintro'); } else setPhase('play'); }
          }}/>
      </Phone>
    );
  }
  if(phase==='crowdintro'){
    return (
      <Phone>
        <IntroCard card={crowd.intro} steps={1} step={0} onNext={dismissCrowdIntro} onSkip={null}/>
      </Phone>
    );
  }
  if(phase==='win'){
    const totalStars=Object.values(stars).reduce((a,b)=>a+b,0);
    return (
      <Phone>
        <div className="introcard">
          <div className="bigemoji">🏆</div>
          <h2>Hometown<br/>conquered!</h2>
          <p>You beat the Mayor and cleared every show. You banked <b>{totalStars}⭐</b>, <b>{gold}💰</b> and discovered <b>{discovered.length}</b> recipes.</p>
          <p style={{marginTop:'10px',color:'var(--muted)',fontSize:'12px'}}>This is the end of the prototype slice — the real game keeps unlocking new regions, foods &amp; axes from here.</p>
          <div style={{display:'flex',gap:'10px',marginTop:'22px'}}>
            <button className="cta-ghost" onClick={openGuide}>📖 Field guide</button>
            <button className="cta-big" onClick={resetGame}>Play again ↻</button>
          </div>
        </div>
      </Phone>
    );
  }

  // ----- overlays -----
  if(phase==='ladder'){
    const current = ladderMode==='advance' ? index+1 : index;
    return (
      <Phone>
        <Ladder crowds={D.CROWDS} index={current} stars={stars}
          onClose={()=>setPhase('play')}
          onPlay={ladderMode==='advance' ? playNext : ()=>setPhase('play')}/>
      </Phone>
    );
  }
  if(phase==='book'){
    return (
      <Phone>
        <Book tab={bookTab} setTab={setBookTab} foods={foods} owned={owned}
          reveals={reveals} mastery={mastery} recipes={D.RECIPES} discovered={discovered}
          onClose={()=>setPhase(overlayFrom)}/>
      </Phone>
    );
  }
  if(phase==='shop'){
    return (
      <Phone>
        <Shop stock={D.SHOP} owned={owned} gold={gold} onBuy={buyFood} onClose={()=>setPhase(overlayFrom)}/>
      </Phone>
    );
  }
  if(phase==='kitchen'){
    return (
      <Phone>
        <Kitchen treatments={D.TREATMENTS} active={treatment} onToggle={toggleTreatment} onClose={()=>setPhase(overlayFrom)}/>
      </Phone>
    );
  }

  // ----- play / reaction -----
  return (
    <Phone>
      <div className="statusbar"><span>9:41</span><span className="sbicons">📶 🔋</span></div>
      <div className="top">
        <button className="chip-btn" onClick={()=>setMuted(m=>!m)}>{muted?'🔇':'🔊'}</button>
        <div className="day">Hometown<small>Show {index+1} of {D.CROWDS.length}</small></div>
        <button className="chip-btn">💰 {gold}</button>
      </div>
      <div className="body">
        <Ticket crowd={crowd}/>
        <Belly used={bellyUsed} max={D.BELLY_MAX}/>
        <Plate plate={plate} foods={foods} onRemove={removeFood} recipe={recipe}/>
        <Pantry foods={pantryFoods} counts={counts} reveals={reveals} onAdd={addFood} canAdd={canAdd}/>
      </div>
      <BlastButton disabled={plate.length===0} onLaunch={launch}/>
      <div className="dock">
        <button className="di on"><span className="e">🎭</span>Stage</button>
        <button className="di" onClick={()=>openOverlay('shop')}><span className="e">🛒</span>Shop</button>
        <button className={"di"+(activeTreatment?' hot':'')} onClick={()=>openOverlay('kitchen')}><span className="e">🍳</span>Kitchen</button>
        <button className="di" onClick={openGuide}><span className="e">📖</span>Book</button>
        <button className="di" onClick={openLadder}><span className="e">🗺️</span>Venue</button>
      </div>
      {phase==='reaction' && result && (
        <Reaction result={result} crowd={crowd} onContinue={continueAfter} onRetry={retryShow}/>
      )}
    </Phone>
  );
}

function Phone({children}){
  return (
    <div className="stage-wrap">
      <div className="phone"><div className="screen">{children}</div><div className="notch"></div></div>
      <div className="hint">The Fart Factory · playable slice — tap food, hold BLAST</div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
