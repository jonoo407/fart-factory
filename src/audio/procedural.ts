let audioCtx: AudioContext | null = null;

function ensureAudio(): AudioContext | null {
  if (audioCtx) return audioCtx;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
    return audioCtx;
  } catch {
    return null;
  }
}

export function playFart(
  length: number,
  wetness: number,
  volume: number,
  stinkiness: number,
  temp: number,
  musical: number,
): number {
  const ctx = ensureAudio();
  if (!ctx) return 0;
  const dur = 0.3 + length * 0.25;
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = 0.15 + volume * 0.07;
  master.connect(ctx.destination);

  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  const baseFreq = 40 + temp * 8 - wetness * 3;
  osc.frequency.setValueAtTime(baseFreq, now);
  const bends = 2 + Math.floor(musical * 1.5);
  for (let i = 0; i < bends; i++) {
    const t = now + dur * (i / bends);
    const f = baseFreq + Math.random() * 60 - 30 + (musical > 5 ? Math.sin(i * 2) * 30 : 0);
    osc.frequency.linearRampToValueAtTime(Math.max(20, f), t);
  }
  osc.frequency.linearRampToValueAtTime(baseFreq - 20, now + dur);

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 200 + volume * 80 + temp * 30;
  lp.Q.value = 2 + wetness * 0.8;
  osc.connect(lp);
  lp.connect(master);
  osc.start(now);
  osc.stop(now + dur);

  if (wetness > 3 || stinkiness > 5) {
    const bufSize = ctx.sampleRate * dur;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (wetness / 15);
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 150 + stinkiness * 40;
    bp.Q.value = 1 + wetness * 0.3;
    const nGain = ctx.createGain();
    nGain.gain.value = 0.1 + wetness * 0.04;
    noise.connect(bp);
    bp.connect(nGain);
    nGain.connect(master);
    noise.start(now);
    noise.stop(now + dur);
  }

  if (musical > 4) {
    for (let h = 0; h < Math.min(musical - 3, 4); h++) {
      const ho = ctx.createOscillator();
      ho.type = h % 2 === 0 ? 'sine' : 'triangle';
      ho.frequency.value = baseFreq * (h + 2) + (musical > 7 ? Math.sin(h) * 50 : 0);
      const hg = ctx.createGain();
      hg.gain.value = 0.02 + musical * 0.005;
      ho.connect(hg);
      hg.connect(master);
      ho.start(now + h * 0.08);
      ho.stop(now + dur - 0.1);
    }
  }

  if (length > 6) {
    for (let i = 0; i < 3; i++) {
      const sp = ctx.createOscillator();
      sp.type = 'square';
      sp.frequency.value = 60 + Math.random() * 40;
      const sg = ctx.createGain();
      sg.gain.value = 0.05;
      sp.connect(sg);
      sg.connect(master);
      sp.start(now + dur + i * 0.12);
      sp.stop(now + dur + i * 0.12 + 0.08);
    }
  }

  master.gain.linearRampToValueAtTime(0, now + dur + 0.5);
  return dur;
}
