import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const outputDir = fileURLToPath(new URL("../public/exercises/", import.meta.url));
const apiKey = process.env.OPENAI_API_KEY;
const modelCandidates = (process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5,gpt-image-1")
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean);

if (!apiKey) {
  console.error("OPENAI_API_KEY is required.");
  process.exit(1);
}

const stylePrompt = [
  "Create a single square 1:1 exercise demo image for [EXERCISE_NAME] in the exact same style as the Setline generated workout assets:",
  "dark charcoal/black premium gym, minimalist Gymshark-inspired, grayscale photography-like render, high contrast, athlete in black training clothes, no text, no logos, no watermark, no bright colors, no decorative glow, rounded-corner composition safe for mobile app cropping.",
  "",
  "Show the exercise accurately: [EXERCISE_SPECIFIC_BODY_POSITION_AND_MACHINE_DETAILS]. Keep the full machine, cable, bench, or implement visible enough to identify the movement. Center the athlete, make the key joint positions clear, and keep the image readable as both a circular thumbnail and a full-width workout image."
].join(" ");

const exercises = [
  {
    slug: "leg-press",
    name: "Leg Press",
    form: "athlete seated in a 45-degree leg press machine, feet shoulder-width on the platform, knees bent around 90 degrees, hands on side handles, sled and rails clearly visible."
  },
  {
    slug: "hamstring-curl",
    name: "Hamstring Curl",
    form: "athlete using a seated hamstring curl machine, knees aligned with the pivot, lower legs tucked behind the roller pad, torso upright against the back pad."
  },
  {
    slug: "cable-crunch",
    name: "Cable Crunch",
    form: "athlete kneeling in front of a cable stack with rope attachment held near the temples, spine flexing downward under control, cable tower visible."
  },
  {
    slug: "chest-press",
    name: "Chest Press",
    form: "athlete seated in a chest press machine, back flat against pad, hands on handles at chest height, elbows bent and pressing forward, machine arms visible."
  },
  {
    slug: "lat-pulldown",
    name: "Lat Pulldown",
    form: "athlete seated at a lat pulldown station, wide bar pulled toward upper chest, elbows driving down, thigh pads and cable tower visible."
  },
  {
    slug: "seated-cable-row",
    name: "Seated Cable Row",
    form: "athlete seated at a cable row station, feet braced, torso upright, handle pulled toward lower ribs, cable line and weight stack visible."
  },
  {
    slug: "dumbbell-romanian-deadlift",
    name: "Dumbbell Romanian Deadlift",
    form: "athlete standing in a hip hinge with two dumbbells held close to the thighs, slight knee bend, flat back, hips pushed back, dumbbells visible."
  },
  {
    slug: "goblet-squat-to-box",
    name: "Goblet Squat To Box",
    form: "athlete holding one dumbbell vertically at chest height while squatting back to a box or bench, hips near the box, knees tracking forward."
  },
  {
    slug: "dumbbell-floor-press",
    name: "Dumbbell Floor Press",
    form: "athlete lying on the floor with knees bent, pressing two dumbbells above chest, upper arms close to the floor, dumbbells clearly visible."
  },
  {
    slug: "pallof-press",
    name: "Pallof Press",
    form: "athlete standing side-on to a cable station, cable handle pressed straight out from the chest, arms extended resisting rotation, cable line visible."
  },
  {
    slug: "side-plank",
    name: "Side Plank",
    form: "athlete holding a side plank on one forearm, body in a straight line from shoulder to ankle, hips lifted, free arm resting on hip."
  },
  {
    slug: "bike-intervals",
    name: "Bike Intervals",
    form: "athlete on a stationary exercise bike, hands on handlebars, one knee high and one leg extended, flywheel and bike frame visible."
  },
  {
    slug: "crosstrainer-intervals",
    name: "Crosstrainer Intervals",
    form: "athlete using an elliptical crosstrainer, both hands on moving handles, one foot forward and one foot back on pedals, machine rails visible."
  },
  {
    slug: "dumbbell-shoulder-press",
    name: "Dumbbell Shoulder Press",
    form: "athlete seated or standing with two dumbbells pressed overhead, elbows slightly forward, ribs stacked, dumbbells visible above shoulders."
  },
  {
    slug: "dumbbell-lateral-raise",
    name: "Dumbbell Lateral Raise",
    form: "athlete standing with two light dumbbells raised out to shoulder height, elbows soft, palms facing down, torso still."
  },
  {
    slug: "cable-face-pull",
    name: "Cable Face Pull",
    form: "athlete standing at cable station pulling a rope attachment toward eye level, elbows high and wide, cable stack and rope visible."
  },
  {
    slug: "dumbbell-split-squat",
    name: "Dumbbell Split Squat",
    form: "athlete in split squat stance holding two dumbbells by the sides, front knee bent, back knee lowered, upright torso, dumbbells visible."
  },
  {
    slug: "glute-bridge",
    name: "Glute Bridge",
    form: "athlete lying on back with knees bent and feet planted, hips lifted into a bridge, optional dumbbell across hips, floor setup visible."
  },
  {
    slug: "dumbbell-bench-row",
    name: "Dumbbell Bench Row",
    form: "athlete bracing one hand and one knee on a flat bench, rowing a dumbbell toward the hip with the other hand, bench and dumbbell visible."
  },
  {
    slug: "triceps-pressdown",
    name: "Standing Cable Triceps Pressdown",
    form: "athlete standing at cable station with rope or straight bar attachment, elbows pinned near ribs, forearms pressing down, cable tower visible."
  },
  {
    slug: "dumbbell-curl",
    name: "Dumbbell Curl",
    form: "athlete standing with two dumbbells curling upward, elbows close to sides, neutral posture, dumbbells clearly visible."
  }
];

mkdirSync(outputDir, { recursive: true });

for (const [index, exercise] of exercises.entries()) {
  const outPath = join(outputDir, `${exercise.slug}.png`);
  const prompt = stylePrompt
    .replace("[EXERCISE_NAME]", exercise.name)
    .replace("[EXERCISE_SPECIFIC_BODY_POSITION_AND_MACHINE_DETAILS]", exercise.form);
  console.log(`[${index + 1}/${exercises.length}] Generating ${exercise.name}`);
  const image = await generateImage(prompt);
  writeFileSync(outPath, Buffer.from(image, "base64"));
  console.log(`Saved ${outPath}`);
}

async function generateImage(prompt) {
  let lastError;
  for (const model of modelCandidates) {
    try {
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          prompt,
          size: "1024x1024",
          quality: process.env.OPENAI_IMAGE_QUALITY || "medium",
          output_format: "png"
        })
      });
      const body = await response.json();
      if (!response.ok) {
        lastError = new Error(`${model}: ${body?.error?.message || response.statusText}`);
        console.warn(lastError.message);
        continue;
      }
      const b64 = body?.data?.[0]?.b64_json;
      if (!b64) throw new Error(`${model}: image response missing b64_json`);
      return b64;
    } catch (error) {
      lastError = error;
      console.warn(error instanceof Error ? error.message : String(error));
    }
  }
  throw lastError || new Error("Image generation failed.");
}
