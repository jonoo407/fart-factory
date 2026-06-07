/* ============================================================
   FART FACTORY — procedural audio engine (prototype)
   Stands in for the pre-baked ElevenLabs bank: synthesizes the
   fart from the recipe's 6 axes so you can HEAR the readout.
   ============================================================ */
(function(){
  let ctx = null, master = null;
  let vol = { master:0.9, sfx:1, music:0.4, voice:0.8 };
  let muted = false;

  function ensure(){
    if(ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = vol.master; master.connect(ctx.destination);
    return ctx;
  }
  function resume(){ if(ctx && ctx.state==='suspended') ctx.resume(); }
  const now = ()=> ctx.currentTime;

  function noiseBuffer(dur){
    const len = Math.max(1, Math.floor(ctx.sampleRate*dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i] = Math.random()*2-1;
    return buf;
  }
  function env(g, t, a, peak, dur, rel){
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001,peak), t+a);
    g.gain.setValueAtTime(Math.max(0.001,peak), t+dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t+dur+rel);
  }

  // ---- the star: a fart built from axes (each 0..1) ----
  function fart(ax, opts){
    if(muted) return 0;
    ensure(); resume();
    const t = now()+0.02;
    const wet=ax.wet||0, dry=ax.dry||0, stink=ax.stink||0, loud=ax.loud||0, musical=ax.musical||0, heat=ax.heat||0;
    const len = 0.45 + (ax.length!=null?ax.length:0.45)*1.9;          // total duration
    const g = vol.sfx * (0.18 + loud*0.7);
    const bus = ctx.createGain(); bus.gain.value = g; bus.connect(master);

    // base "braap": sawtooth whose pitch flutters via an LFO. dry = faster, crisper flutter.
    const fund = 78 + (1-wet)*48 - musical*8;                          // wetter/musical = lower base
    const osc = ctx.createOscillator(); osc.type = wet>0.5?'sine':'sawtooth';
    osc.frequency.setValueAtTime(fund, t);
    if(heat>0.25) osc.frequency.linearRampToValueAtTime(fund*(1+heat*1.4), t+len); // kettle rise
    const lfo = ctx.createOscillator(); lfo.type='square';
    lfo.frequency.setValueAtTime(14 + dry*46 + Math.random()*6, t);
    const lfoG = ctx.createGain(); lfoG.gain.value = 22 + dry*40;
    lfo.connect(lfoG); lfoG.connect(osc.frequency);
    const lp = ctx.createBiquadFilter(); lp.type='lowpass';
    lp.frequency.value = 600 + dry*2600 + loud*900;
    const og = ctx.createGain();
    osc.connect(lp); lp.connect(og); og.connect(bus);
    env(og, t, 0.02, 0.9, len*0.85, len*0.4);
    osc.start(t); lfo.start(t); osc.stop(t+len+0.6); lfo.stop(t+len+0.6);

    // wet gurgle: amplitude-warbled lowpassed noise
    if(wet>0.2){
      const ns = ctx.createBufferSource(); ns.buffer = noiseBuffer(len+0.3);
      const nlp = ctx.createBiquadFilter(); nlp.type='lowpass'; nlp.frequency.value=260+wet*220;
      const ng = ctx.createGain();
      const warble = ctx.createOscillator(); warble.type='sine'; warble.frequency.value=8+wet*14;
      const wg = ctx.createGain(); wg.gain.value=0.5; warble.connect(wg); wg.connect(ng.gain);
      ns.connect(nlp); nlp.connect(ng); ng.connect(bus);
      env(ng, t, 0.03, 0.5*wet, len*0.7, len*0.5);
      ns.start(t); warble.start(t); ns.stop(t+len+0.3); warble.stop(t+len+0.3);
    }
    // heat sizzle: hi bandpassed noise
    if(heat>0.3){
      const ns = ctx.createBufferSource(); ns.buffer = noiseBuffer(len);
      const bp = ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=3200+heat*2600; bp.Q.value=0.8;
      const ng = ctx.createGain(); ns.connect(bp); bp.connect(ng); ng.connect(bus);
      env(ng, t, 0.05, 0.16*heat, len*0.9, 0.2);
      ns.start(t); ns.stop(t+len+0.2);
    }
    // stink: detuned sour overtone + long haze tail (you "feel" the lingering)
    if(stink>0.3){
      const o2 = ctx.createOscillator(); o2.type='sawtooth';
      o2.frequency.setValueAtTime(fund*1.49, t);
      const o2g = ctx.createGain(); o2.connect(o2g); o2g.connect(bus);
      env(o2g, t, 0.04, 0.12*stink, len, len*0.9 + stink*0.8);
      o2.start(t); o2.stop(t+len+1.4);
    }
    // musical: play a little pitched arpeggio on top (the signature hook)
    if(musical>0.45){
      const scale=[0,2,4,7,9,12,14];
      const n = 3 + Math.round(musical*3);
      const stepDur = len/n;
      for(let i=0;i<n;i++){
        const semi = scale[i%scale.length];
        const f = 196*Math.pow(2,semi/12); // ~G3 root
        const mt = t + i*stepDur;
        const mo = ctx.createOscillator(); mo.type='triangle'; mo.frequency.value=f;
        const mg = ctx.createGain(); mo.connect(mg); mg.connect(bus);
        env(mg, mt, 0.015, 0.32*musical, stepDur*0.7, stepDur*0.5);
        mo.start(mt); mo.stop(mt+stepDur+0.2);
      }
    }
    return len;
  }

  // ---- UI / foley ----
  function blip(freq, dur, type, gain){
    if(muted) return; ensure(); resume();
    const t=now()+0.005;
    const o=ctx.createOscillator(); o.type=type||'sine'; o.frequency.setValueAtTime(freq,t);
    const g=ctx.createGain(); o.connect(g); g.connect(master);
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime((gain||0.3)*vol.sfx,t+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.start(t); o.stop(t+dur+0.02);
  }
  const ui = {
    plop(){ if(muted)return; ensure(); const t=now(); blip(420,0.09,'sine',0.34);
            const o=ctx.createOscillator();o.type='sine';o.frequency.setValueAtTime(520,t);o.frequency.exponentialRampToValueAtTime(160,t+0.09);
            const g=ctx.createGain();o.connect(g);g.connect(master);g.gain.setValueAtTime(0.28*vol.sfx,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.12);o.start(t);o.stop(t+0.14); },
    pick(){ blip(680,0.05,'triangle',0.18); },
    thunk(){ blip(150,0.08,'square',0.3); },
    ding(){ blip(1320,0.12,'sine',0.3); setTimeout(()=>blip(1760,0.16,'sine',0.26),60); },
    error(){ blip(120,0.16,'sawtooth',0.22); },
    coins(){ if(muted)return; [0,70,140].forEach((d,i)=>setTimeout(()=>blip(880+i*220,0.1,'square',0.16),d)); },
    unlock(){ if(muted)return; [523,659,784,1047].forEach((f,i)=>setTimeout(()=>blip(f,0.18,'triangle',0.22),i*90)); },
    page(){ blip(300,0.05,'sine',0.12); },
  };

  // charge whoosh — rising filtered noise while holding
  let chargeNodes=null;
  function chargeStart(){
    if(muted) return; ensure(); resume();
    const t=now();
    const ns=ctx.createBufferSource(); ns.buffer=noiseBuffer(3); ns.loop=true;
    const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.setValueAtTime(220,t); bp.Q.value=1.1;
    const g=ctx.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.16*vol.sfx,t+0.2);
    ns.connect(bp); bp.connect(g); g.connect(master); ns.start(t);
    chargeNodes={ns,bp,g};
  }
  function chargeUpdate(p){ // p 0..1
    if(!chargeNodes) return;
    chargeNodes.bp.frequency.setTargetAtTime(220+p*1600, now(), 0.05);
    chargeNodes.g.gain.setTargetAtTime((0.10+p*0.18)*vol.sfx, now(), 0.05);
  }
  function chargeStop(){
    if(!chargeNodes) return;
    const t=now(); chargeNodes.g.gain.setTargetAtTime(0.0001,t,0.05);
    const n=chargeNodes; setTimeout(()=>{try{n.ns.stop();}catch(e){}},120); chargeNodes=null;
  }

  // crowd reaction keyed to grade tier
  function crowd(tier){ // 'S','A','B','C','F'
    if(muted) return; ensure(); resume();
    const t=now();
    if(tier==='F'){ // boo / groan
      const o=ctx.createOscillator(); o.type='sawtooth'; o.frequency.setValueAtTime(180,t); o.frequency.exponentialRampToValueAtTime(80,t+0.6);
      const g=ctx.createGain(); o.connect(g); g.connect(master); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.22*vol.sfx,t+0.1); g.gain.exponentialRampToValueAtTime(0.0001,t+0.7);
      o.start(t); o.stop(t+0.8); return;
    }
    // cheer: noise swell + a few happy tones
    const ns=ctx.createBufferSource(); ns.buffer=noiseBuffer(1.2);
    const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1400; bp.Q.value=0.6;
    const g=ctx.createGain(); ns.connect(bp); bp.connect(g); g.connect(master);
    const peak = tier==='S'?0.3:tier==='A'?0.24:0.16;
    g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(peak*vol.sfx,t+0.18); g.gain.exponentialRampToValueAtTime(0.0001,t+1.1);
    ns.start(t); ns.stop(t+1.2);
    const notes = tier==='S'?[523,659,784,1047,1319]:tier==='A'?[523,659,784]:[440,554];
    notes.forEach((f,i)=>setTimeout(()=>blip(f,0.25,'triangle',0.14),120+i*70));
  }

  function setVol(k,v){ vol[k]=v; if(k==='master'&&master) master.gain.setTargetAtTime(v, ctx?now():0, 0.05); }
  function setMuted(m){ muted=m; if(m) chargeStop(); }

  window.FF_AUDIO = { fart, ui, chargeStart, chargeUpdate, chargeStop, crowd, setVol, setMuted, resume, ensure };
})();
