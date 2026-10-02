import assert from "node:assert/strict";
const url = process.env.GAME_TEST_URL || "http://localhost:5173";
const avatar = {
  preset: 7,
  skin: "#794a36",
  hair: "#e4e5ed",
  outfit: "#6d93c0",
  accessory: "headphones",
};
async function post(a, status = 200) {
  const r = await fetch(url + "/api/game", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: crypto.randomUUID(), ...a }),
  });
  const d = await r.json();
  assert.equal(r.status, status, JSON.stringify(d));
  return d;
}
const h = await post({
  op: "create",
  name: "Host",
  difficulty: "junior",
  mode: "coop",
  avatar,
});
const b = await post({
  op: "join",
  code: h.session.code,
  name: "Guest",
  avatar: { ...avatar, preset: 2 },
});
await post({
  op: "profile",
  ...h.session,
  name: "NovaAlias",
  avatar,
  playerId: b.session.playerId,
});
const s = await post({ op: "state", ...b.session });
assert.equal(
  s.game.players.find((p) => p.id === h.session.playerId).name,
  "NovaAlias",
);
assert.equal(
  s.game.players.find((p) => p.id === b.session.playerId).name,
  "Guest",
);
assert.deepEqual(s.game.players[0].avatar, avatar);
await post({ op: "profile", ...b.session, name: "novaalias", avatar }, 409);
await post(
  {
    op: "profile",
    ...b.session,
    name: "Guest",
    avatar: { ...avatar, skin: "<script>" },
  },
  400,
);
await post(
  {
    op: "profile",
    code: h.session.code,
    token: "invalid",
    name: "Bad",
    avatar,
  },
  401,
);
await post({ op: "ready", ...h.session, ready: true });
await post({ op: "ready", ...b.session, ready: true });
await post({ op: "start", ...h.session });
await post({ op: "profile", ...b.session, name: "Late", avatar }, 400);
assert.ok(!JSON.stringify(s.game).includes(h.session.token));
console.log(
  "PASS: profile sync, own-session permissions, duplicate aliases, invalid avatars, and lobby-only edits.",
);
