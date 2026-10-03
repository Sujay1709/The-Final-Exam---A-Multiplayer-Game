import assert from "node:assert/strict";
const origin=process.env.GAME_TEST_URL??"http://localhost:5173";
async function post(a,status=200) {
  const r=await fetch(origin+"/api/game",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({id:crypto.randomUUID(),...a})});
  const data=await r.json(); assert.equal(r.status,status,JSON.stringify(data)); return data;
}
const h=await post({op:"create",name:"Fresh Host",fillBots:false});
assert.equal(h.game.freshPuzzles,true);
const b=await post({op:"join",code:h.session.code,name:"Fresh Guest"});
await post({op:"settings",...b.session,freshPuzzles:false},403);
await Promise.all([h,b].map(p=>post({op:"ready",...p.session,ready:true})));
const start=await post({op:"start",...h.session});
const other=await post({op:"state",...b.session});
assert.deepEqual(start.game.puzzles,other.game.puzzles);
const q=start.game.puzzles.find(q=>q.id==="j0a");
const [,a,c,d]=q.prompt.match(/reads (\d+) \+ (\d+) × (\d+)/);
const answer=String(Number(a)+Number(c)*Number(d));
const phaseKey=`${start.game.run}:main:0:0`;
const solved=await Promise.all([h,b].map(p=>post({op:"answer",...p.session,puzzleId:q.id,answer,phaseKey})));
assert.ok(solved.every(d=>d.game.score===100 && d.game.correctCount===1));
for(const d of solved) for(const secret of ['"seed"','"puzzleRooms"','"answer"',h.session.token,b.session.token]) assert.ok(!JSON.stringify(d.game).includes(secret));
await Promise.all([h,b].map(p=>post({op:"leave",...p.session})));
console.log("PASS: fresh-puzzle defaults, identical generated questions, settings permissions, independent validation, and private answers.");
