// FR-H4: short tone + haptic per scan; a lower double tone for errors.
let ctx: AudioContext | null = null;

function tone(freq: number, startAt: number, duration: number) {
  ctx ??= new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = freq;
  osc.type = "sine";
  gain.gain.setValueAtTime(0.08, ctx.currentTime + startAt);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startAt + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime + startAt);
  osc.stop(ctx.currentTime + startAt + duration);
}

export function scanFeedback(kind: "ok" | "error") {
  try {
    if (kind === "ok") {
      tone(1320, 0, 0.08);
      navigator.vibrate?.(30);
    } else {
      tone(330, 0, 0.12);
      tone(260, 0.15, 0.16);
      navigator.vibrate?.([60, 40, 60]);
    }
  } catch {
    // Audio blocked (no user gesture yet) — the visual state still shows the result.
  }
}
