// The walk: two-bone inverse kinematics and a lateral-sequence gait. Pure; the page inlines these, the tests import them.
import { L1, L2, GAIT } from "./scene.mjs";

/** Two-bone IK in the leg's plane: hip to ankle offset (dx, dz) -> thigh, knee and foot angles (radians, about y). Knee forward. */
export function legAngles(dx, dz) {
  const D = Math.min(L1 + L2 - 1e-3, Math.max(Math.abs(L1 - L2) + 1e-3, Math.hypot(dx, dz)));
  const phi = Math.atan2(dx, -dz);
  const a = Math.acos((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D)), b = Math.acos((L2 * L2 + D * D - L1 * L1) / (2 * L2 * D));
  const thigh = phi + a, shin = phi - b;
  return [-thigh, -(shin - thigh), shin];
}
/** Gait: where a leg's ankle is, in the body frame, at time t. Returns [x, lift, stance]. */
export function footAt(hx, phase, t) {
  const u = ((t / GAIT.period + phase) % 1 + 1) % 1, S = GAIT.stride;
  if (u < GAIT.duty) return [hx + S / 2 - (S * u) / GAIT.duty, 0, true];
  const s = (u - GAIT.duty) / (1 - GAIT.duty), e = s * s * (3 - 2 * s);
  return [hx - S / 2 + S * e, GAIT.lift * Math.sin(Math.PI * s), false];
}

