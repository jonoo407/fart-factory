/* ============================================================
   FART FACTORY — Shop · Kitchen · Book overlays
   ============================================================ */
const AXX = window.FF_DATA.AXES, ORDX = window.FF_DATA.AXIS_ORDER;

/* ---------- SHOP ---------- */
function Shop({ stock, owned, gold, onBuy, onClose }){
  const foods = window.FF_DATA.FOODS;
  return (
    <div className="overlay">
      <div className="statusbar"><span>9:41</span><span className="sbicons">📶 🔋</span></div>
      <div className="ov-top"><h2><span>🛒</span> Pantry Shop</h2><button className="chip-btn" onClick={onClose}>✕</button></div>
      <div className="ov-balance">💰 {gold} gold<span>buy new foods to grow your pantry</span></div>
      <div className="ov-body">
        <div className="shop-grid">
          {stock.map(s=>{
            const f = foods.find(x=>x.id===s.food);
            const have = owned.includes(s.food);
            const afford = gold>=s.cost;
            return (
              <div key={s.food} className={"shop-card"+(have?' owned':'')}>
                {s.tag && !have && <span className="shop-tag">{s.tag}</span>}
                <span className="rar" style={{background:`var(--rar-${f.r})`}}></span>
                <div className="em">{f.e}</div>
                <div className="snm">{f.n}</div>
                <div className="props">{ORDX.filter(k=>f.ax[k]>=3).map(k=>AXX[k].e).join(' ')||'mild'}</div>
                <button className={"shop-buy"+(have?' done':afford?'':' cant')}
                  onClick={()=>!have&&afford&&onBuy(s)} disabled={have||!afford}>
                  {have?'✓ Owned':afford?('BUY '+s.cost+'💰'):('Need '+s.cost+'💰')}
                </button>
              </div>
            );
          })}
        </div>
        <div className="ov-foot">Common foods come free with your pantry. Win shows to afford the rare stuff — or earn the rest through crowds &amp; bosses.</div>
      </div>
    </div>
  );
}

/* ---------- KITCHEN ---------- */
function Kitchen({ treatments, active, onToggle, onClose }){
  return (
    <div className="overlay">
      <div className="statusbar"><span>9:41</span><span className="sbicons">📶 🔋</span></div>
      <div className="ov-top"><h2><span>🍳</span> Kitchen</h2><button className="chip-btn" onClick={onClose}>✕</button></div>
      <div className="ov-body">
        <div className="kit-hint">Equip <b>one</b> treatment. It tweaks every brew you launch until you swap it — the secret to hitting picky crowds.</div>
        <div className="kit-list">
          {treatments.map(t=>{
            const on = active===t.id;
            return (
              <button key={t.id} className={"kit-treat"+(on?' on':'')} onClick={()=>onToggle(t.id)}>
                <span className="kem">{t.e}</span>
                <div className="ktx"><div className="knm">{t.n}</div><div className="kef">{t.blurb}</div></div>
                <span className="kchk">{on?'✓':''}</span>
              </button>
            );
          })}
          <button className={"kit-treat"+(active===null?' on':'')} onClick={()=>onToggle(null)}>
            <span className="kem">🚫</span>
            <div className="ktx"><div className="knm">None</div><div className="kef">launch the brew as-is</div></div>
            <span className="kchk">{active===null?'✓':''}</span>
          </button>
        </div>
        <div className="ov-foot">More treatments &amp; a fermentation rack unlock in later regions.</div>
      </div>
    </div>
  );
}

/* ---------- BOOK (Foods + Recipes tabs) ---------- */
function Book({ tab, setTab, foods, owned, reveals, mastery, recipes, discovered, onClose }){
  return (
    <div className="overlay">
      <div className="statusbar"><span>9:41</span><span className="sbicons">📶 🔋</span></div>
      <div className="ov-top"><h2><span>📖</span> Lab Book</h2><button className="chip-btn" onClick={onClose}>✕</button></div>
      <div className="book-tabs">
        <button className={"book-tab"+(tab==='foods'?' on':'')} onClick={()=>setTab('foods')}>🥦 Foods</button>
        <button className={"book-tab"+(tab==='recipes'?' on':'')} onClick={()=>setTab('recipes')}>⚡ Recipes</button>
      </div>
      <div className="ov-body">
        {tab==='foods' ? <FoodsTab foods={foods} owned={owned} reveals={reveals} mastery={mastery}/>
                       : <RecipesTab recipes={recipes} discovered={discovered} foods={foods} owned={owned}/>}
      </div>
    </div>
  );
}

function FoodsTab({ foods, owned, reveals, mastery }){
  const totalKnown = foods.reduce((a,f)=>a+((reveals[f.id]||[]).length),0);
  const totalAx = foods.reduce((a,f)=>a+Object.keys(f.ax).length,0);
  return (
    <React.Fragment>
      <div className="fg-prog">
        <div className="fg-bar"><i style={{width:(totalAx?totalKnown/totalAx*100:0)+'%'}}></i></div>
        <div className="t"><span>Discovered</span><span>{totalKnown} / {totalAx} properties</span></div>
      </div>
      {foods.map(f=>{
        const have = owned.includes(f.id);
        if(!have){
          return (
            <div className="fg-card locked" key={f.id}>
              <div className="head"><div className="em">🔒</div>
                <div><div className="nm">Not in pantry yet</div><div className="lv">find it in the shop or a crowd</div></div>
              </div>
            </div>
          );
        }
        const rev = reveals[f.id]||[];
        const axisKeys = ORDX.filter(k=>f.ax[k]>0);
        const mastered = rev.length===axisKeys.length;
        return (
          <div className="fg-card" key={f.id}>
            <div className="head">
              <div className="em">{f.e}</div>
              <div><div className="nm">{f.n}</div>
                <div className="lv">{mastered?'★ Mastered':'Used '+(mastery[f.id]||0)+'×'}</div></div>
              <div className="stars">{'⭐'.repeat(rev.length)}{'✩'.repeat(axisKeys.length-rev.length)}</div>
            </div>
            <div className="axset">
              {axisKeys.map(k=> rev.includes(k)
                ? <span className="axchip" key={k}>{AXX[k].e}<span className="v">{f.ax[k]}</span></span>
                : <span className="axchip unk" key={k}>❔</span>)}
            </div>
            {mastered && <div className="fg-perk">🎁 {f.perk}</div>}
          </div>
        );
      })}
    </React.Fragment>
  );
}

function RecipesTab({ recipes, discovered, foods, owned }){
  return (
    <React.Fragment>
      <div className="fg-prog">
        <div className="fg-bar"><i style={{width:(discovered.length/recipes.length*100)+'%'}}></i></div>
        <div className="t"><span>Recipes found</span><span>{discovered.length} / {recipes.length}</span></div>
      </div>
      {recipes.map(r=>{
        const found = discovered.includes(r.id);
        if(!found){
          const hintCount = r.set.length;
          return (
            <div className="rcard locked" key={r.id}>
              <div className="rc-q">？？</div>
              <div className="rc-hint">Undiscovered · combine {hintCount} foods</div>
            </div>
          );
        }
        const emojis = r.set.map(id=>foods.find(f=>f.id===id).e).join('');
        const cookable = r.set.every(id=>owned.includes(id));
        return (
          <div className="rcard" key={r.id}>
            <div className="rc-top">
              <span className="rc-foods">{emojis}</span>
              <div><div className="rc-nm">{r.n}</div>
                <div className="rc-rar" style={{color:`var(--rar-${r.r})`}}>{({c:'Common',u:'Uncommon',r:'Rare'})[r.r]} recipe</div></div>
            </div>
            <div className="rc-eff"><span className="e">⚡</span>{r.blurb}</div>
            {!cookable && <div className="rc-need">missing an ingredient — get it first</div>}
          </div>
        );
      })}
    </React.Fragment>
  );
}

Object.assign(window, { Shop, Kitchen, Book });
