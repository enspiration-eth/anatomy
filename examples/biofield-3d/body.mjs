// A standing adult body (about 1.75 m) as an implicit surface: round cones and ellipsoids joined by a smooth
// minimum. Units are mm, z up, the body faces -y, the subject's left is +x. Meshed at high resolution by the kit.
export const HEIGHT = 1750;
const S = [];
const cone = (a, b, ra, rb, k) => S.push(k === undefined ? ["cone", a, b, ra, rb] : ["cone", a, b, ra, rb, k]);
const ell = (c, r, k) => S.push(k === undefined ? ["ellipsoid", c, r] : ["ellipsoid", c, r, k]);
// Head, face and neck.
ell([0, 4, 1638], [74, 92, 106], 18);            // cranium
ell([0, -30, 1590], [58, 55, 62], 26);           // face and jaw
ell([0, -18, 1560], [44, 48, 34], 24);           // chin
cone([0, -84, 1640], [0, -98, 1608], 7, 13, 10); // nose
ell([-73, 8, 1622], [9, 18, 28], 6); ell([73, 8, 1622], [9, 18, 28], 6); // ears
ell([0, -66, 1660], [52, 14, 16], 18);           // brow
cone([0, 14, 1545], [0, 8, 1420], 50, 58, 30);   // neck
// Torso.
ell([0, 6, 1290], [158, 100, 150], 40);          // ribcage
for (const s of [-1, 1]) ell([s * 66, -56, 1306], [70, 34, 58], 34); // pectorals
ell([0, -6, 1110], [132, 92, 120], 50);          // abdomen
ell([0, 6, 960], [158, 102, 110], 50);           // pelvis
for (const s of [-1, 1]) ell([s * 72, 52, 905], [84, 62, 92], 40); // gluteals
cone([0, 22, 1400], [0, 26, 1150], 52, 46, 40);  // spine and back muscles
for (const s of [-1, 1]) {
  // Shoulder, arm and hand (arms slightly away from the body).
  cone([s * 70, 4, 1430], [s * 182, 8, 1395], 46, 44, 30);       // trapezius to shoulder
  ell([s * 188, 6, 1378], [56, 54, 62], 30);                      // deltoid
  cone([s * 194, 8, 1360], [s * 262, 18, 1110], 45, 36, 22);      // upper arm
  ell([s * 222, -14, 1240], [30, 30, 72], 20);                     // biceps
  ell([s * 232, 34, 1250], [30, 28, 80], 20);                      // triceps
  cone([s * 262, 18, 1110], [s * 312, -6, 865], 39, 26, 18);      // forearm
  ell([s * 280, 0, 1040], [34, 34, 80], 20);                       // forearm muscles
  cone([s * 312, -6, 862], [s * 326, -12, 800], 26, 24, 12);      // wrist and palm root
  ell([s * 330, -14, 778], [20, 44, 52], 12);                      // palm
  for (const [i, dy] of [-34, -13, 8, 27].entries()) cone([s * 332, -14 + dy, 742], [s * (334 + i), -16 + dy * 1.05, 676 + Math.abs(i - 1.5) * 9], 9.5, 7.5, 6); // fingers
  cone([s * 322, -46, 812], [s * 330, -62, 760], 12, 9, 8);       // thumb
  // Leg and foot.
  cone([s * 96, 6, 900], [s * 92, 0, 488], 86, 56, 40);           // thigh
  ell([s * 98, -26, 700], [60, 50, 150], 30);                      // quadriceps
  ell([s * 92, -26, 480], [44, 40, 44], 20);                       // knee
  cone([s * 92, 0, 470], [s * 90, 6, 92], 52, 34, 26);            // shin
  ell([s * 94, 34, 360], [48, 44, 110], 26);                       // calf
  cone([s * 90, 10, 80], [s * 96, 34, 40], 34, 34, 18);           // ankle and heel
  cone([s * 94, 22, 34], [s * 106, -142, 26], 36, 26, 24);        // foot
  ell([s * 104, -120, 24], [40, 50, 22], 16);                      // toes
}
export const BODY_SHAPES = S;
// Organ positions used by the figure (mm).
export const HEART = [36, -26, 1265];           // just left of the midline behind the sternum
export const OCCIPITAL = [0, 70, 1650];         // visual cortex at the back of the head
export const CHEST_FRONT = [36, -104, 1275];    // skin over the heart
export const ARM_NERVE = [[-70, 20, 1450], [-190, 30, 1370], [-250, 6, 1170], [-292, -10, 990], [-318, -12, 830]]; // right median nerve, schematic
