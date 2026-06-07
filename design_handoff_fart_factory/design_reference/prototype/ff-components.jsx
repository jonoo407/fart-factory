/* ============================================================
   FART FACTORY — presentational components
   ============================================================ */
const { useState, useRef, useEffect, useCallback } = React;
const AX = window.FF_DATA.AXES;

/* ---------- crowd ticket ---------- */
function Ticket({ crowd }){
  const rarColor = crowd.rarity==='rare' ? '#f59e0b' : crowd.rarity==='boss' ? '#c2410c' : '#9ca3af';
  return (
    <div className="ticket">
      <div className="tk-head">
        <div className={"avatar"+(crowd.vip||crowd.boss?' rare':'')}>{crowd.e}</div>
        <div style={{flex:1}}>
          <div className="tk-name">{crowd.n}</div>
          <div className="tk-role">
            {crowd.rarity!=='common' && <span className="rar-pill" style={{background:rarColor}}>{crowd.rarity}</span>}
            {crowd.role}
          </div>
        </div>
        <div className="diff-pips">{'●'.repeat(crowd.diff)}{'○'.repeat(4-crowd.diff)}</div>
      </div>
      <div className="bubble">“{crowd.line}”</div>
      <div className="wants">
        <div className="lbl">They're craving</div>
        <div className="chips">
          {crowd.chips.map((c,i)=>(
            <span key={i} className={"chip "+(c.type==='no'?'no':'want')}>
              {c.type==='no' && <span className="x">🚫</span>}
              {AX[c.ax].e} {AX[c.ax].label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- belly ---------- */
function Belly({ used, max }){
  const over = used>max;
  return (
    <div className="belly">
      <span className="lbl">Belly</span>
      <div className="track"><i className={over?'over':''} style={{width:Math.min(100,(used/max)*100)+'%'}}></i></div>
      <span className="num" style={over?{color:'#d6360a'}:null}>{used}/{max}</span>
    </div>
  );
}

/* ---------- plate + live recipe ribbon ---------- */
function Plate({ plate, foods, onRemove, recipe }){
  const slots = [0,1,2,3];
  return (
    <div className="platebox">
      <div className="lbl">Your brew <span>{plate.length} / 4 · tap to remove</span></div>
      <div className="slots">
        {slots.map(i=>{
          const fid = plate[i];
          const f = fid && foods.find(x=>x.id===fid);
          return (
            <div key={i} className={"slot "+(f?'filled':'empty')} onClick={()=>f&&onRemove(i)}>
              {f ? <React.Fragment><span className="em">{f.e}</span><span className="rm">×</span></React.Fragment> : '＋'}
            </div>
          );
        })}
      </div>
      {recipe && (
        <div className="ribbon" key={recipe.id}>
          <span className="spark">⚡</span>
          <div>
            <div className="rb-nm">{recipe.n}</div>
            <div className="rb-ef">{recipe.blurb}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- pantry ---------- */
function Pantry({ foods, counts, reveals, onAdd, canAdd }){
  const AXD = window.FF_DATA.AXES, ORD = window.FF_DATA.AXIS_ORDER;
  return (
    <div className="pantry">
      <div className="lbl">Pantry — tap to add</div>
      <div className="pgrid">
        {foods.map(f=>{
          const used = counts[f.id]||0;
          const rev = reveals[f.id]||[];
          const isNew = rev.length===0;
          const total = Object.keys(f.ax).length;
          const known = ORD.filter(k=>f.ax[k]>0 && rev.includes(k));
          const hiddenCount = total - known.length;
          return (
            <div key={f.id} className={"pcell"+(canAdd(f)?'':' dim')+(used>0?' active':'')} onClick={()=>onAdd(f)}>
              <span className="rar" style={{background:`var(--rar-${f.r})`}}></span>
              {used>0 && <span className="cnt">{used}</span>}
              {isNew && <span className="newdot">✨</span>}
              <span className="em">{f.e}</span>
              <span className="nm">{f.n}</span>
              <span className="pax">
                {known.map(k=>(
                  <span className="pax-i" key={k}>{AXD[k].e}<b>{f.ax[k]}</b></span>
                ))}
                {hiddenCount>0 && <span className="pax-q">{'·'.repeat(hiddenCount)}</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- blast button with hold-to-charge ---------- */
function BlastButton({ disabled, onLaunch }){
  const [charging,setCharging] = useState(false);
  const [val,setVal] = useState(0);
  const raf = useRef(0); const dir = useRef(1); const startT = useRef(0); const live = useRef(0);
  const SWEET_LO=74, SWEET_HI=92;

  const tick = useCallback(()=>{
    live.current += dir.current*2.2;
    if(live.current>=100){ live.current=100; dir.current=-1; }
    if(live.current<=0){ live.current=0; dir.current=1; }
    setVal(live.current);
    window.FF_AUDIO.chargeUpdate(live.current/100);
    raf.current = requestAnimationFrame(tick);
  },[]);

  const begin = (e)=>{
    if(disabled) return; e.preventDefault();
    window.FF_AUDIO.resume();
    setCharging(true); dir.current=1; live.current=0; startT.current=performance.now();
    window.FF_AUDIO.chargeStart();
    raf.current = requestAnimationFrame(tick);
  };
  const end = ()=>{
    if(!charging) return;
    cancelAnimationFrame(raf.current);
    window.FF_AUDIO.chargeStop();
    const held = performance.now()-startT.current;
    const v = live.current;
    let quality, label;
    if(held<200){ quality=1.0; label='tap'; }            // quick tap = no penalty, no bonus
    else if(v>=SWEET_LO && v<=SWEET_HI){ quality=1.25; label='perfect'; window.FF_AUDIO.ui.ding(); }
    else if(v>=SWEET_LO-12 && v<=SWEET_HI+6){ quality=1.1; label='good'; }
    else if(v<28){ quality=0.85; label='weak'; }
    else { quality=1.0; label='ok'; }
    setCharging(false); setVal(0);
    onLaunch(quality, label);
  };

  return (
    <div className="blastwrap">
      <div className={"charge-meter"+(charging?' active':'')}>
        <div className="fill" style={{width:val+'%'}}></div>
        <div className="sweet"></div>
        <div className="lbl">{charging?'release in the dashed zone!':'hold to charge · or just tap'}</div>
      </div>
      <div className={"blast"+(disabled?' disabled':'')+(charging?' charging':'')}
        onPointerDown={begin} onPointerUp={end} onPointerLeave={end} onPointerCancel={end}>
        <div className="big">💨 {charging?'CHARGING…':'BLAST!'}</div>
        <div className="sub">{disabled?'plate a food first':'hold to charge'}</div>
      </div>
    </div>
  );
}

/* ---------- reaction takeover ---------- */
function Reaction({ result, crowd, onContinue, onRetry }){
  const { grade, tier, matchPct, verdict, vo, breakdown, learned, newRecipe, gold, stink, passed, axisFeedback, stars } = result;
  const gradeClass = tier==='S'?'grade-s':(tier==='A'||tier==='A+')?'grade-a':tier==='F'?'grade-f':'grade-b';
  const statusMeta = { hit:{e:'✓',t:'nailed it',c:'hit'}, near:{e:'~',t:'close',c:'near'}, miss:{e:'✗',t:'way off',c:'miss'} };
  const faces = tier==='F'
    ? ['😖','🤬','🙄','😤','💢']
    : tier==='S' ? ['🤣','🤩','😍','🤣','😆']
    : (tier==='A'||tier==='A+') ? ['😂','🤩','😆','😄','😂'] : ['😀','🙂','😯','😀','😬'];
  return (
    <div className={"reaction"+(tier==='F'?' flop':'')}>
      <div className="statusbar"><span>9:41</span><span className="sbicons">📶 🔋</span></div>
      {stink>0.45 && (
        <div className="rxn-stink">
          {[18,42,64,80,30].map((l,i)=>(
            <i key={i} style={{left:l+'%', top:(20+i*4)+'%', width:(70+i*16)+'px', height:(70+i*16)+'px', animationDelay:(i*0.5)+'s'}}></i>
          ))}
        </div>
      )}
      {tier!=='F' && (
        <div className="confetti">
          {Array.from({length:14}).map((_,i)=>(
            <i key={i} style={{left:(7+i*6.5)+'%', background:['#ff7a2f','#231d16','#fff','#8fd11e','#f59e0b'][i%5],
              animationDuration:(2.2+ (i%5)*0.4)+'s', animationDelay:(i*0.12)+'s', transform:`rotate(${i*40}deg)`}}></i>
          ))}
        </div>
      )}
      <div className="rxn-scroll">
        <div className="rxn-crowd">{faces.map((f,i)=><span key={i}>{f}</span>)}</div>
        <div className={"stamp "+gradeClass}>
          <span className="g">{grade}</span>
          <span className="l">{tier==='F'?'Bombed':tier==='S'?'Legendary':tier==='A+'?'Standing O':tier==='A'?'Big Hit':'Not bad'}</span>
        </div>
        <div className="verdict">{verdict}</div>
        <div className="cap-bubble"><span className="who">🔊 {crowd.n}</span>“{vo}”</div>

        {stars>0 && (
          <div className="rxn-stars">
            {[0,1,2].map(i=><span key={i} className={i<stars?'on':''}>★</span>)}
          </div>
        )}

        {axisFeedback && axisFeedback.length>0 && (
          <div className="judge-card">
            <div className="judge-h">How you matched {crowd.n.split(' ')[0]}’s taste</div>
            {axisFeedback.map((a,i)=>{
              const m = statusMeta[a.status];
              const wantLabel = a.hate ? 'wanted NONE' : a.wantHigh ? 'wanted LOTS' : 'wanted a little';
              return (
                <div className={"judge-row "+m.c} key={i}>
                  <span className="je">{AX[a.ax].e}</span>
                  <div className="jmid">
                    <div className="jname">{AX[a.ax].label} <small>· {wantLabel}</small></div>
                    <div className="jbar">
                      {!a.hate && <span className="jtarget" style={{left:(a.target*100)+'%'}}></span>}
                      {a.hate && <span className="jtarget hate" style={{left:'2%'}}></span>}
                      <span className="jgot" style={{width:Math.max(3,a.got*100)+'%'}}></span>
                    </div>
                  </div>
                  <span className={"jstatus "+m.c}>{m.e}</span>
                </div>
              );
            })}
            <div className="judge-foot">{passed ? 'Tune the ✗ and ~ axes to climb to ★★★.' : 'Fix the ✗ axes and try this crowd again.'}</div>
          </div>
        )}

        <div className="bd-card">
          {breakdown.map((b,i)=>(
            <div key={i} className={"bd-line"+(b.base?' base':'')}>
              <span className="l">{b.icon} {b.label}</span>
              <span className={"v"+(b.plus?' plus':'')}>{b.val}</span>
            </div>
          ))}
          <div className="bd-tot">
            <span className="l">Final</span>
            <span className="v">{grade} · {matchPct}% {gold>0 && <span style={{color:'var(--orange)'}}>+{gold}💰</span>}</span>
          </div>
        </div>

        {learned.map((l,i)=>(
          <div className="toast learn" key={'l'+i} style={{animationDelay:(0.15+i*0.1)+'s'}}>
            <span className="em">💡</span>
            <div><div className="t1">You figured something out</div>
            <div className="t2">{l.food} is {l.adj} {AX[l.ax].e}</div></div>
          </div>
        ))}
        {newRecipe && (
          <div className="toast recipe" style={{animationDelay:'0.3s'}}>
            <span className="em">{newRecipe.foodsEmoji}</span>
            <div><div className="t1">New recipe discovered</div><div className="t2">{newRecipe.n}</div></div>
          </div>
        )}
      </div>
      {passed ? (
        <div className="rxn-foot">
          <button className="rxn-cta ghost" onClick={onRetry}>↻ Improve</button>
          <button className="rxn-cta" onClick={onContinue}>{crowd.boss?'Finish Hometown 🏆':'Next show ▶'}</button>
        </div>
      ) : (
        <div className="rxn-foot">
          <button className="rxn-cta wide" onClick={onRetry}>↻ Try this crowd again</button>
        </div>
      )}
    </div>
  );
}

/* ---------- venue ladder overlay ---------- */
function Ladder({ crowds, index, stars, onClose, onPlay }){
  const positions=[[28,87],[64,68],[32,46],[60,15]];
  const next = crowds[index];
  return (
    <div className="overlay">
      <div className="statusbar"><span>9:41</span><span className="sbicons">📶 🔋</span></div>
      <div className="ov-top">
        <h2><span>🏟️</span> Hometown</h2>
        <span className="chip-btn" style={{boxShadow:'none',border:'none',background:'none'}}>⭐ {Object.values(stars).reduce((a,b)=>a+b,0)}</span>
        <button className="chip-btn" onClick={onClose}>✕</button>
      </div>
      <div className="ov-body">
        <div className="venue">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline points={positions.map(p=>p.join(',')).join(' ')} fill="none" stroke="#231d16" strokeWidth="1.4"
              strokeDasharray="2 3" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity="0.5"/>
          </svg>
          {crowds.map((c,i)=>{
            const [x,y]=positions[i];
            let cls='vnode';
            if(i<index) cls+=' done';
            else if(i===index) cls+=' cur';
            else cls+=' lock';
            if(c.vip) cls+=' rare';
            if(c.boss) cls+=' boss';
            const st = stars[c.id]||0;
            return (
              <div key={c.id} className={cls} style={{left:x+'%',top:y+'%'}}>
                {i===index && c.intro && c.intro.t.includes('food') && <span className="newtag">NEW FOOD</span>}
                {c.vip && i>=index && <span className="newtag">VIP</span>}
                <div className="stars">{i<index?'⭐'.repeat(st):''}</div>
                <div className="circle">{i===index?'▶':(i<index?(c.boss?'👑':'🎪'):<span>{c.boss?'👑':c.vip?'🔒':'🔒'}</span>)}</div>
                <div className="lab">{c.boss?'Headliner':c.vip?'VIP':'Show '+(i+1)}</div>
              </div>
            );
          })}
        </div>
        {next && (
          <div className="venue-foot">
            <span className={"av"+(next.vip||next.boss?' rare':'')}>{next.e}</span>
            <div>
              <div className="nm">Up next: {next.n}</div>
              <div className="ds">Wants {next.chips.filter(c=>c.type==='want').map(c=>AX[c.ax].label).join(' & ')} · ⭐⭐⭐ up for grabs</div>
            </div>
          </div>
        )}
      </div>
      <button className="rxn-cta" onClick={onPlay}>{next?('Play '+(next.boss?'the Boss':next.n)+' ▶'):'All cleared! 🎉'}</button>
    </div>
  );
}

/* ---------- field guide overlay ---------- */
function FieldGuide({ foods, reveals, mastery, onClose }){
  const known = foods.filter(f=>reveals[f.id]&&reveals[f.id].length).length;
  const totalAxesKnown = foods.reduce((a,f)=>a+(reveals[f.id]?reveals[f.id].length:0),0);
  const totalAxes = foods.reduce((a,f)=>a+Object.keys(f.ax).length,0);
  return (
    <div className="overlay">
      <div className="statusbar"><span>9:41</span><span className="sbicons">📶 🔋</span></div>
      <div className="ov-top"><h2><span>📖</span> Field Guide</h2><button className="chip-btn" onClick={onClose}>✕</button></div>
      <div className="ov-body">
        <div className="fg-prog">
          <div className="fg-bar"><i style={{width:(totalAxesKnown/totalAxes*100)+'%'}}></i></div>
          <div className="t"><span>Discovered</span><span>{totalAxesKnown} / {totalAxes} properties · {known}/{foods.length} foods</span></div>
        </div>
        {foods.map(f=>{
          const rev = reveals[f.id]||[];
          const mlvl = mastery[f.id]||0;
          const mastered = rev.length===Object.keys(f.ax).length;
          const axisKeys = window.FF_DATA.AXIS_ORDER.filter(k=>f.ax[k]>0);
          return (
            <div className="fg-card" key={f.id}>
              <div className="head">
                <div className="em">{rev.length?f.e:'❔'}</div>
                <div>
                  <div className="nm">{rev.length?f.n:'Unknown food'}</div>
                  <div className="lv">{mastered?'★ Mastered':'Used '+mlvl+'× · Lv.'+(rev.length+1)}</div>
                </div>
                <div className="stars">{'⭐'.repeat(rev.length)}{'✩'.repeat(Object.keys(f.ax).length-rev.length)}</div>
              </div>
              <div className="axset">
                {axisKeys.map(k=>(
                  rev.includes(k)
                    ? <span className="axchip" key={k}>{AX[k].e}<span className="v">{f.ax[k]}</span></span>
                    : <span className="axchip unk" key={k}>❔</span>
                ))}
              </div>
              {mastered && <div style={{fontSize:'10.5px',fontWeight:800,color:'var(--green-d)',marginTop:'8px'}}>🎁 Perk: {f.perk}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- intro / tutorial card ---------- */
function IntroCard({ card, steps, step, onNext, onSkip }){
  return (
    <div className="introcard">
      <div className="bigemoji" key={card.e}>{card.e}</div>
      <h2 dangerouslySetInnerHTML={{__html:card.t}}></h2>
      <p dangerouslySetInnerHTML={{__html:card.b}}></p>
      {steps>1 && <div className="dots">{Array.from({length:steps}).map((_,i)=><i key={i} className={i===step?'on':''}></i>)}</div>}
      <div style={{display:'flex',gap:'10px',marginTop:steps>1?0:'22px'}}>
        {onSkip && <button className="cta-ghost" onClick={onSkip}>Skip</button>}
        <button className="cta-big" onClick={onNext}>{step>=steps-1?'Let\u2019s go! 🚀':'Next →'}</button>
      </div>
    </div>
  );
}

Object.assign(window, { Ticket, Belly, Plate, Pantry, BlastButton, Reaction, Ladder, FieldGuide, IntroCard });
