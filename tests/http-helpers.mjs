import assert from "node:assert/strict";
export async function waitForLab(state) {
  const until = Date.now() + 16000;
  while (Date.now() < until) {
    const result = await state();
    assert.ok(result.game, JSON.stringify(result));
    if (result.game.phase === "main") return result;
    assert.equal(result.game.phase, "loading", JSON.stringify(result));
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  assert.fail("The laboratory did not open after the server countdown.");
}
