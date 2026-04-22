// Generates the two scene PNGs for the game via OpenAI image API.
// Run: `npm run gen:scenes`  (loads .env via `node --env-file=.env`)
// Requires VITE_OPENAI_API_KEY set in .env. Optional IMAGE_MODEL (default dall-e-3).

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "..", "public", "scenes");

const apiKey = process.env.VITE_OPENAI_API_KEY;
const model = process.env.IMAGE_MODEL || "dall-e-3";

if (!apiKey || apiKey.startsWith("sk-your-key")) {
  console.error("[error] VITE_OPENAI_API_KEY not set in .env");
  process.exit(1);
}

const STYLE =
  "soft watercolor storybook illustration, warm friendly palette, gentle outlines, children's picture-book aesthetic, no text, no watermarks";

const scenes = [
  {
    file: "scene1.png",
    prompt: `${STYLE}. A single unified scene (NOT split panels): a Korean child around six years old stands in the foreground-center of their messy bedroom, crying with teardrops on their cheeks, sad worried face, wearing simple pajamas, looking around for something lost. A wooden desk sits against the LEFT wall with its chair pulled out.
IMPORTANT hat placement — read carefully: a small knitted beanie hat is tucked in the FAR LEFT corner of the floor, half-hidden behind the desk chair's legs (peeking out slightly from behind the chair). The hat is SMALL and OFF-CENTER — positioned in the left-edge background area, NOT at the child's feet, NOT in the middle of the floor, NOT in front of the child. Do not draw the hat anywhere near the center of the image.
Also: scattered toys, books, clothes on the floor and bed for a messy feel. The crying child is the main subject; the hat is a small side detail.`,
  },
  {
    file: "scene2.png",
    prompt: `${STYLE}. A happy Korean child around six years old, smiling broadly and wearing the same small knitted hat on their head. Same bedroom as before visible softly in the background (desk, toys). The child is slightly center-frame, joyful expression, relieved and cheerful mood. Square composition.`,
  },
];

const filter = process.argv.slice(2);
const targets = filter.length
  ? scenes.filter((s) => filter.some((f) => s.file === f || s.file === `${f}.png`))
  : scenes;

if (targets.length === 0) {
  console.error(`[error] no matching scenes for: ${filter.join(", ")}`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

for (const scene of targets) {
  console.log(`[generate] ${scene.file} (model=${model})...`);
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt: scene.prompt,
      size: "1024x1024",
      n: 1,
      ...(model === "dall-e-3"
        ? { quality: "standard", response_format: "b64_json" }
        : {}),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error(`[error] ${scene.file}: ${response.status} ${detail}`);
    process.exit(1);
  }

  const data = await response.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) {
    console.error(`[error] ${scene.file}: no b64_json in response`);
    process.exit(1);
  }

  const outPath = resolve(outDir, scene.file);
  writeFileSync(outPath, Buffer.from(b64, "base64"));
  console.log(`[write]  ${outPath}`);
}

console.log("[done]");
