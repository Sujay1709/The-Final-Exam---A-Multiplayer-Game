import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
assert.ok(
  existsSync(".next/routes-manifest.json"),
  "Native Next.js routes manifest is missing.",
);
const routes = JSON.parse(
  readFileSync(".next/server/app-paths-manifest.json", "utf8"),
);
assert.ok(
  routes["/api/game/route"],
  "Game API must be packaged as a server route.",
);
assert.ok(
  existsSync(".next/BUILD_ID"),
  "Next.js production build is incomplete.",
);
console.log(
  "PASS: native Next.js build includes the Vercel routes manifest and game API.",
);
