// Motion helpers shared by three.js figures. Inlined into the page's module
// before the figure's live code (see scripts/inline-three.mjs).

export const still = matchMedia("(prefers-reduced-motion: reduce)");
export const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** Exponential follow toward `target` with time constant `tau` (s); jumps under reduced motion. */
export function follow(value, target, dt, tau) {
  if (still.matches) return target;
  const next = value + (target - value) * (1 - Math.exp(-dt / tau));
  return Math.abs(target - next) < 1e-3 ? target : next;
}

/** A damped spring { at, rate } toward `want`; critically damped under reduced motion. Returns true while moving. */
export function spring(state, want, dt, stiff = 420, drag = 26) {
  const damping = still.matches ? 2 * Math.sqrt(stiff) : drag;
  for (let n = 0; n < 4; n++) {
    state.rate += ((want - state.at) * stiff - state.rate * damping) * (dt / 4);
    state.at += state.rate * (dt / 4);
  }
  if (Math.abs(want - state.at) < 0.002 && Math.abs(state.rate) < 0.002) { state.at = want; state.rate = 0; return false; }
  return true;
}

/**
 * Runs `step(dt, now)` on animation frames while the stage is on screen and
 * step returns true (still busy). Call `kick()` after any input.
 */
export function loop(stage, step) {
  let frame = 0, last = 0, visible = false;
  const tick = (now) => {
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 1 / 60;
    last = now;
    const busy = step(dt, now / 1000);
    frame = visible && busy ? requestAnimationFrame(tick) : 0;
  };
  const kick = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
  new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) kick(); }, { rootMargin: "120px 0px" }).observe(stage);
  return { kick };
}

/** An idle tour: `touring` is true until input, and again `after` ms after the last input (never under reduced motion). */
export function idleTour(after = 3600, onResume = () => {}) {
  const tour = { touring: !still.matches, clock: 0, timer: 0 };
  tour.touch = () => {
    tour.touring = false;
    clearTimeout(tour.timer);
    tour.timer = setTimeout(() => { tour.touring = !still.matches; tour.clock = 0; onResume(); }, after);
  };
  return tour;
}

/** Writes the readout and the stage's accessible value text. */
export function readoutTo(stage, text, value) {
  const readout = stage.closest(".iso-plate")?.querySelector("[data-readout]") ?? document.querySelector("[data-readout]");
  if (readout && readout.textContent !== text) readout.textContent = text;
  if (value !== undefined) stage.setAttribute("aria-valuenow", String(value));
  stage.setAttribute("aria-valuetext", text);
}
