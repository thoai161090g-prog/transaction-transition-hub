// === Alert Sound System using Web Audio API ===
// Tạo âm thanh cảnh báo không cần file audio bên ngoài

let audioCtx: AudioContext | null = null;
let lastPlayedAt = 0;
const COOLDOWN_MS = 5000; // Không spam âm thanh, tối thiểu 5 giây giữa mỗi lần

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function canPlay(): boolean {
  const now = Date.now();
  if (now - lastPlayedAt < COOLDOWN_MS) return false;
  lastPlayedAt = now;
  return true;
}

// Beep đơn giản
function beep(freq: number, duration: number, type: OscillatorType = "sine", volume = 0.3) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

// 🪤 BẪY CẦU: 3 tiếng beep nhanh tần số cao
export function playTrapAlert() {
  if (!canPlay()) return;
  const ctx = getCtx();
  const t = ctx.currentTime;
  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 1200 + i * 200;
    gain.gain.setValueAtTime(0.25, t + i * 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t + i * 0.15);
    osc.stop(t + i * 0.15 + 0.12);
  }
}

// 🚨 BỆT SIÊU DÀI (extreme): Siren warning - lên xuống liên tục
export function playExtremeAlert() {
  if (!canPlay()) return;
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(400, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.3);
  osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.6);
  osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.9);
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 1.0);
}

// ⚠️ BỆT DÀI (danger): 2 tiếng beep trầm
export function playDangerAlert() {
  if (!canPlay()) return;
  beep(600, 0.2, "triangle", 0.25);
  setTimeout(() => beep(500, 0.3, "triangle", 0.2), 250);
}

// ⚡ CAUTION: 1 tiếng beep nhẹ
export function playCautionAlert() {
  if (!canPlay()) return;
  beep(800, 0.15, "sine", 0.15);
}

// 🔥 Nhịp cầu phát hiện: tiếng "ding" vui
export function playPatternFound() {
  if (!canPlay()) return;
  const ctx = getCtx();
  const t = ctx.currentTime;
  [523, 659, 784].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.2, t + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t + i * 0.1);
    osc.stop(t + i * 0.1 + 0.25);
  });
}

// Master function: phát âm thanh dựa trên risk level và pattern
export function playAlertByRisk(
  riskLevel: "safe" | "caution" | "danger" | "extreme",
  options?: { trapDetected?: boolean; patternFound?: boolean }
) {
  if (options?.trapDetected) {
    playTrapAlert();
    return;
  }
  if (riskLevel === "extreme") {
    playExtremeAlert();
  } else if (riskLevel === "danger") {
    playDangerAlert();
  } else if (options?.patternFound) {
    playPatternFound();
  }
}
