import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = join(__dirname, "..", "public", "exercises");

const exercises = [
  ["leg-press", "machine", "press"],
  ["hamstring-curl", "machine", "curl"],
  ["cable-crunch", "cable", "kneel"],
  ["chest-press", "machine", "press"],
  ["lat-pulldown", "cable", "pull"],
  ["seated-cable-row", "cable", "row"],
  ["dumbbell-romanian-deadlift", "dumbbell", "hinge"],
  ["goblet-squat-to-box", "dumbbell", "squat"],
  ["dumbbell-floor-press", "dumbbell", "floor"],
  ["pallof-press", "cable", "anti-rotate"],
  ["side-plank", "bodyweight", "plank"],
  ["bike-intervals", "cardio", "bike"],
  ["crosstrainer-intervals", "cardio", "stride"],
  ["dumbbell-shoulder-press", "dumbbell", "overhead"],
  ["dumbbell-lateral-raise", "dumbbell", "raise"],
  ["cable-face-pull", "cable", "face-pull"],
  ["dumbbell-split-squat", "dumbbell", "split-squat"],
  ["glute-bridge", "bodyweight", "bridge"],
  ["dumbbell-bench-row", "dumbbell", "row"],
  ["triceps-pressdown", "cable", "pressdown"],
  ["dumbbell-curl", "dumbbell", "curl"]
];

mkdirSync(outputDir, { recursive: true });

for (const [slug, equipment, pose] of exercises) {
  writeFileSync(join(outputDir, `${slug}.svg`), renderExerciseSvg(equipment, pose));
}

function renderExerciseSvg(equipment, pose) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 900" role="img" aria-label="Exercise demo">
  <defs>
    <radialGradient id="bg" cx="50%" cy="32%" r="70%">
      <stop offset="0%" stop-color="#2b2b2e"/>
      <stop offset="54%" stop-color="#101113"/>
      <stop offset="100%" stop-color="#050505"/>
    </radialGradient>
    <linearGradient id="metal" x1="0" x2="1">
      <stop offset="0%" stop-color="#3d3d42"/>
      <stop offset="100%" stop-color="#7d7d84"/>
    </linearGradient>
  </defs>
  <rect width="900" height="900" rx="72" fill="url(#bg)"/>
  <path d="M112 720 C244 650 336 652 450 720 C554 782 668 784 792 718" fill="none" stroke="#1f2023" stroke-width="48" stroke-linecap="round"/>
  ${renderEquipment(equipment)}
  ${renderFigure(pose)}
</svg>
`;
}

function renderEquipment(type) {
  if (type === "machine") {
    return `<g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M205 188 H330 V690 H205 Z" stroke="url(#metal)" stroke-width="24"/>
      <path d="M650 188 H520 V690 H650 Z" stroke="url(#metal)" stroke-width="24"/>
      <path d="M330 232 H520 M330 645 H520" stroke="#55565c" stroke-width="20"/>
      <rect x="262" y="470" width="120" height="60" rx="18" fill="#25262a" stroke="#696a70" stroke-width="12"/>
    </g>`;
  }
  if (type === "cable") {
    return `<g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M210 150 V720 M690 150 V720 M210 150 H690" stroke="url(#metal)" stroke-width="22"/>
      <path d="M676 188 C610 300 548 400 492 510" stroke="#b9b9bd" stroke-width="7"/>
      <circle cx="676" cy="188" r="22" fill="#1f2023" stroke="#86878e" stroke-width="10"/>
    </g>`;
  }
  if (type === "dumbbell") {
    return `<g stroke="#86878e" stroke-width="18" stroke-linecap="round">
      <path d="M180 708 H320 M580 708 H720"/>
      <path d="M205 674 V742 M295 674 V742 M605 674 V742 M695 674 V742"/>
      <rect x="352" y="520" width="196" height="52" rx="18" fill="#1b1c1f" stroke="#55565c" stroke-width="12"/>
    </g>`;
  }
  if (type === "cardio") {
    return `<g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="305" cy="650" r="92" stroke="#55565c" stroke-width="28"/>
      <circle cx="595" cy="650" r="92" stroke="#55565c" stroke-width="28"/>
      <path d="M305 650 L430 506 L595 650 M430 506 H545 M545 506 L634 362" stroke="#8d8e94" stroke-width="18"/>
    </g>`;
  }
  return `<g fill="none" stroke="#55565c" stroke-width="22" stroke-linecap="round"><path d="M190 710 H710"/></g>`;
}

function renderFigure(pose) {
  const poses = {
    press: { head: [456, 312], torso: "M452 360 L420 488", arms: "M438 396 L575 386 M438 396 L330 458", legs: "M420 488 L536 596 M420 488 L306 604" },
    curl: { head: [456, 300], torso: "M450 350 L450 500", arms: "M446 390 L350 472 M446 390 L548 456", legs: "M450 500 L548 610 M450 500 L354 610" },
    kneel: { head: [510, 326], torso: "M500 374 L430 500", arms: "M478 410 L585 492 M478 410 L388 470", legs: "M430 500 L386 642 M430 500 L542 642" },
    pull: { head: [456, 328], torso: "M455 376 L455 520", arms: "M455 410 L350 285 M455 410 L560 285", legs: "M455 520 L340 648 M455 520 L574 648" },
    row: { head: [500, 344], torso: "M484 390 L390 500", arms: "M442 430 L566 470 M442 430 L330 475", legs: "M390 500 L292 620 M390 500 L550 626" },
    hinge: { head: [506, 348], torso: "M486 390 L368 486", arms: "M430 438 L330 574 M430 438 L568 574", legs: "M368 486 L312 656 M368 486 L552 650" },
    squat: { head: [465, 306], torso: "M455 354 L420 488", arms: "M438 388 L522 438 M438 388 L360 438", legs: "M420 488 L316 620 M420 488 L558 620" },
    floor: { head: [360, 600], torso: "M405 600 L570 600", arms: "M490 594 L490 448 M530 594 L530 448", legs: "M560 600 L680 690 M560 600 L675 535" },
    "anti-rotate": { head: [430, 340], torso: "M428 390 L428 540", arms: "M428 430 L592 430 M428 462 L592 462", legs: "M428 540 L352 682 M428 540 L520 682" },
    plank: { head: [260, 585], torso: "M305 604 L610 640", arms: "M345 608 L280 700 M345 608 L404 700", legs: "M610 640 L750 690 M610 640 L742 582" },
    bike: { head: [448, 312], torso: "M442 360 L500 500", arms: "M468 410 L610 430 M468 410 L340 430", legs: "M500 500 L594 642 M500 500 L340 642" },
    stride: { head: [450, 300], torso: "M445 350 L460 500", arms: "M452 398 L560 312 M452 398 L340 482", legs: "M460 500 L350 668 M460 500 L604 644" },
    overhead: { head: [452, 328], torso: "M452 376 L452 530", arms: "M452 398 L360 236 M452 398 L545 236", legs: "M452 530 L352 676 M452 530 L558 676" },
    raise: { head: [452, 330], torso: "M452 378 L452 530", arms: "M452 410 L286 405 M452 410 L620 405", legs: "M452 530 L350 674 M452 530 L558 674" },
    "face-pull": { head: [456, 330], torso: "M456 378 L456 530", arms: "M456 420 L330 344 M456 420 L582 344", legs: "M456 530 L350 674 M456 530 L562 674" },
    "split-squat": { head: [462, 306], torso: "M455 354 L430 500", arms: "M438 395 L340 520 M438 395 L548 520", legs: "M430 500 L320 672 M430 500 L610 610" },
    bridge: { head: [290, 610], torso: "M340 612 L520 538", arms: "M388 592 L308 706 M388 592 L474 704", legs: "M520 538 L682 640 M520 538 L632 480" },
    pressdown: { head: [456, 315], torso: "M456 365 L456 525", arms: "M456 416 L358 538 M456 416 L560 538", legs: "M456 525 L356 676 M456 525 L558 676" }
  };
  const p = poses[pose] || poses.press;
  return `<g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="${p.head[0]}" cy="${p.head[1]}" r="40" fill="#d5d5d8"/>
    <path d="${p.torso}" stroke="#d5d5d8" stroke-width="38"/>
    <path d="${p.arms}" stroke="#d5d5d8" stroke-width="30"/>
    <path d="${p.legs}" stroke="#d5d5d8" stroke-width="34"/>
    <path d="M160 760 H740" stroke="#303136" stroke-width="20"/>
  </g>`;
}
