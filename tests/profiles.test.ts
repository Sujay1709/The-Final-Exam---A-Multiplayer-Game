import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PRESETS,
  SKIN,
  HAIR,
  OUTFIT,
  ACCESSORIES,
  validateAvatar,
  anonymousAlias,
} from "../lib/profiles.ts";
test("all 3200 catalog combinations are accepted and no unchecked fields survive", () => {
  let count = 0;
  PRESETS.forEach((_, preset) => {
    for (const skin of SKIN)
      for (const hair of HAIR)
        for (const outfit of OUTFIT)
          for (const accessory of ACCESSORIES) {
            const a = { preset, skin, hair, outfit, accessory };
            assert.deepEqual(validateAvatar({ ...a, token: "secret" }), a);
            count++;
          }
  });
  assert.equal(count, 3200);
  for (const bad of [null, [], { preset: 99 }, { preset: 0, skin: "red" }])
    assert.throws(() => validateAvatar(bad));
});
test("generated aliases fit the existing 20-character limit", () => {
  for (let i = 0; i < 100; i++) {
    const alias = anonymousAlias();
    assert.ok(alias.length > 0 && alias.length <= 20);
  }
});
