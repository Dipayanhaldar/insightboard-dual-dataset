// Lightweight Web Audio API sound design for InsightBoard VDB & insi.ai
// Muted-safe, respects browser autoplay policies and global sound preferences, never loops annoyingly.

let audioCtx = null;
let lastSoundAt = 0;

export function isSoundMuted() {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('insightboard-sound-muted') === 'true';
  } catch {
    return false;
  }
}

export function setSoundMuted(muted) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('insightboard-sound-muted', muted ? 'true' : 'false');
  } catch {}
}

function getAudioContext() {
  if (typeof window === 'undefined' || isSoundMuted()) return null;
  const nowMs = Date.now();
  if (nowMs - lastSoundAt < 65) return null; // Prevent rapid overlapping audio
  lastSoundAt = nowMs;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    if (audioCtx.state !== 'running') return null;
    return audioCtx;
  } catch {
    return null;
  }
}

// 1. Interaction: Gentle mechanical tap / button click
export function playButtonClick() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(560, now);
    osc.frequency.exponentialRampToValueAtTime(840, now + 0.045);
    gain.gain.setValueAtTime(0.028, now);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
  } catch {}
}

// 2. Appearance: Soft pop/click
export function playInsiAppear() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(720, now + 0.065);
    gain.gain.setValueAtTime(0.024, now);
    gain.gain.exponentialRampToValueAtTime(0.0007, now + 0.075);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  } catch {}
}

// 3. Disappearance: Subtle click
export function playInsiDisappear() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(310, now + 0.05);
    gain.gain.setValueAtTime(0.018, now);
    gain.gain.exponentialRampToValueAtTime(0.0006, now + 0.055);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  } catch {}
}

// 4. Celebration / Chime: Short cheerful harmonic sound
export function playInsiChime(kind = 'appear') {
  if (kind === 'appear') {
    playInsiAppear();
    return;
  }
  if (kind === 'disappear') {
    playInsiDisappear();
    return;
  }
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const notes =
      kind === 'celebrate' || kind === 'signin'
        ? [523.25, 659.25, 783.99, 1046.5]
        : kind === 'error'
        ? [392.0, 329.63]
        : [523.25, 659.25, 880];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const start = now + idx * 0.06;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.024, start);
      gain.gain.exponentialRampToValueAtTime(0.0006, start + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.23);
    });
  } catch {}
}

// 5. Sleeping: Optional subtle breath/snore
export function playInsiSnore() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.linearRampToValueAtTime(118, now + 0.28);
    gain.gain.setValueAtTime(0.009, now);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.32);
  } catch {}
}

// Backward-compatible helper used across dashboard modules to trigger insi.ai events
export function summonInsi(action = 'observe', detail = '') {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(
      new CustomEvent('insi:summon', {
        detail: { action, detail, timestamp: Date.now() }
      })
    );
  } catch {}
}
