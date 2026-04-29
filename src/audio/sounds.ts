let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function noise(audioCtx: AudioContext, duration: number): AudioBufferSourceNode {
  const length = Math.ceil(audioCtx.sampleRate * duration);
  const buffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  return src;
}

export function playSelect(): void {
  try {
    const audioCtx = getCtx();
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1100, t);
    osc.frequency.exponentialRampToValueAtTime(850, t + 0.06);
    gain.gain.setValueAtTime(0.07, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.09);
  } catch { /* silently ignore if audio is unavailable */ }
}

export function playMove(): void {
  try {
    const audioCtx = getCtx();
    const t = audioCtx.currentTime;
    const src = noise(audioCtx, 0.14);
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 320;
    filter.Q.value = 0.6;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    src.start(t);
    src.stop(t + 0.16);
  } catch { /* silently ignore if audio is unavailable */ }
}

export function playCapture(): void {
  try {
    const audioCtx = getCtx();
    const t = audioCtx.currentTime;
    const src = noise(audioCtx, 0.2);
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 180;
    filter.Q.value = 0.3;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    src.start(t);
    src.stop(t + 0.24);
  } catch { /* silently ignore if audio is unavailable */ }
}
