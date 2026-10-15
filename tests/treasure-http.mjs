import assert from "node:assert/strict";
import { treasureRooms } from "../lib/treasure-hunt.ts";
import { waitForLab } from "./http-helpers.mjs";
const origin=process.env.GAME_TEST_URL??"http://localhost:5174";
async function post(op,args={},session,status=200){
  const res=await fetch(origin+"/api/game",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({op,id:crypto.randomUUID(),...session,...args})});
  const data=await res.json();assert.equal(res.status,status,JSON.stringify(data));return data;
}
const host=await post("create",{name:"Treasure Host",fillBots:false,gameDifficulty:"easy",aptitudePuzzles:true,freshPuzzles:true});
const guest=await post("join",{name:"Treasure Guest",code:host.session.code});
assert.equal(host.game.treasureHunt,true);
await Promise.all([host,guest].map(p=>post("ready",{ready:true},p.session)));
let state=(await waitForLab(()=>post("state",{},host.session))).game;
const key=g=>`${g.run}:${g.phase}:${g.roomIndex}:${g.punishment}`;
assert.deepEqual(state.puzzles,(await post("state",{},guest.session)).game.puzzles);
assert.equal(state.puzzles[1].locked,true);
await post("answer",{puzzleId:"h0b",answer:"candle",phaseKey:key(state)},host.session,400);
await post("answer",{puzzleId:"h0a",answer:"26",phaseKey:key(state)},host.session,400);
assert.equal((await post("state",{},host.session)).game.wrongCount,0);
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let rewards=0;
for(const room of treasureRooms("junior")){
 for(const q of room){
  await pause(850);
  state=(await post("state",{},host.session)).game;
  const before=state.score;
  const response=await post("answer",{puzzleId:q.id,answer:`The ${q.answer.toUpperCase()}!`,phaseKey:key(state),id:`solve-${q.id}`},host.session);
  state=response.game;rewards+=q.points;
  assert.equal(state.lastAnswer.points,q.points);
  assert.ok(state.score>=before+q.points);
  assert.equal(state.correctCount,q.rank);
  const replay=await post("answer",{puzzleId:q.id,answer:q.answer,phaseKey:key(state),id:`solve-${q.id}`},host.session);
  assert.equal(replay.game.score,state.score);
  const other=(await post("state",{},guest.session)).game;
  assert.equal(other.review.length,0);
  assert.ok(other.puzzles.every(p=>p.solution===null));
  for(const secret of [host.session.token,guest.session.token,'"aliases"','"answer"','"puzzleRooms"','"progress"']) assert.ok(!JSON.stringify(other).includes(secret));
 }
 if(state.phase!=="won")await pause(3100);
}
assert.equal(rewards,4125);
assert.equal(state.phase,"won");assert.equal(state.solvedCount,15);
assert.equal(state.review.length,15);assert.equal(state.winnerId,host.session.playerId);
await Promise.all([host,guest].map(p=>post("leave",{},p.session)));
console.log("PASS: ordered treasure hunt, old math flags cannot restore math, textual validation, all fifteen escalating rewards, replay safety, finish ordering, and opponent privacy.");
