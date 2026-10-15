import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame, joinGame, mutateGame, phaseKey, snapshot, advanceClock, normalizeGame, currentPuzzles } from "../lib/game.ts";
import { treasureRooms,treasureDetention,normalizeRiddleAnswer,matchesRiddle } from "../lib/treasure-hunt.ts";
import { defaultAvatar } from "../lib/profiles.ts";
const T=1000000;
function setup(mode:"race"|"coop"="race"){
 const g=createGame("ABCDEF","Host","junior","host-token","host",T,defaultAvatar(),{mode,fillBots:false});
 joinGame(g,"Guest",defaultAvatar(),"guest-token","guest",T);
 g.players.forEach(p=>p.ready=true);mutateGame(g,{op:"start",token:"host-token"},T-10000);advanceClock(g,T);return g;
}
function act(g:ReturnType<typeof setup>,id:string,answer:unknown,at:number,receipt=crypto.randomUUID()){
 return mutateGame(g,{op:"answer",token:"host-token",puzzleId:id,answer:answer as string,phaseKey:phaseKey(g,"host"),id:receipt},at);
}
test("both riddle trails have fifteen ordered, increasingly valuable textual clues and six recovery clues",()=>{
 for(const d of ["junior","senior"] as const){
  const rooms=treasureRooms(d),all=rooms.flat();assert.equal(all.length,15);
  assert.equal(new Set(all.map(q=>q.answer)).size,15);
  all.forEach((q,i)=>{assert.equal(q.rank,i+1);assert.equal(q.points,100+25*i);assert.ok(matchesRiddle(q,q.answer));assert.ok(!q.prompt.includes(q.answer));});
  rooms.forEach(room=>room.forEach((q,i)=>assert.deepEqual(q.requires??[],i?[room[i-1].id]:[])));
 }
 assert.equal(treasureRooms("junior").flat().reduce((s,q)=>s+q.points,0),4125);
 for(let level=1;level<=3;level++){const qs=treasureDetention(level);assert.equal(qs.length,level);qs.forEach(q=>assert.equal(q.points,50*level));}
});
test("text normalization accepts curated aliases, articles and case, but refuses malformed or fuzzy answers",()=>{
 const q=treasureRooms("junior")[0][0];
 for(const answer of ["key"," THE KEY! ","a brass key","door key"])assert.ok(matchesRiddle(q,answer));
 for(const answer of ["keyboard","keychain","I think it is a key","candle"])assert.ok(!matchesRiddle(q,answer));
 for(const answer of ["",null,12,{},"26","<script>","a".repeat(81)])assert.equal(normalizeRiddleAnswer(answer),null);
});
test("ordered validation, incremental scoring, replay protection and private views work in Race and Co-op",()=>{
 for(const mode of ["race","coop"] as const){const g=setup(mode),p=mode==="race"?g.players[0].progress!:g;
  assert.throws(()=>act(g,"h0c","echo",T+1000),/previous clue/);
  assert.throws(()=>act(g,"h0a","26",T+1000),/1–80 letters/);
  assert.equal(p.wrongCount,0);const original=p.deadline!;
  act(g,"h0a","wrong guess",T+1000);assert.equal(p.wrongCount,1);assert.equal(p.deadline,original-10000);
  act(g,"h0a","THE KEY!",T+2000,"same");assert.equal(p.score,100);assert.equal(p.lastAnswerFeedback?.points,100);
  act(g,"h0a","key",T+3000,"same");assert.equal(p.score,100);
  act(g,"h0b","a candle",T+4000);assert.equal(p.score,225);
  const other=snapshot(g,1,T+4000,"guest");assert.equal(other.score,mode==="race"?0:225);
  assert.equal(other.puzzles[0].solution===null,mode==="race");
  const raw=JSON.stringify(other);for(const secret of ['"answer"','"aliases"','"puzzleRooms"','host-token','guest-token'])assert.ok(!raw.includes(secret));
 }
});
test("every successful escape traverses fifteen ranked clues; bots cannot skip and polling cannot accelerate them",()=>{
 const g=setup();let at=T+1000;
 for(const room of treasureRooms("junior")){for(const q of room){act(g,q.id,q.answer,at);at+=1000;}advanceClock(g,at+3000);at+=4000;}
 const p=g.players[0].progress!;assert.equal(p.phase,"won");assert.equal(p.correctCount,15);assert.ok(p.score>4125);
 const bot=createGame("BCDEFG","Solo","senior","token","solo",T,defaultAvatar(),{mode:"race",fillBots:true});bot.seed=42;
 mutateGame(bot,{op:"ready",token:"token",ready:true},T);
 const frequent=JSON.parse(JSON.stringify(bot)),delayed=JSON.parse(JSON.stringify(bot));
 for(let at=T;at<=T+1200000;at+=250)advanceClock(frequent,at);advanceClock(delayed,T+1200000);
 const digest=(g:typeof bot)=>g.players.map(p=>({rng:p.rng,next:p.nextAttemptAt,progress:{...p.progress,events:[]}}));
 assert.deepEqual(digest(frequent),digest(delayed));
});
test("detention uses textual recovery riddles with rewards, preserves main locks, and reconnect keeps the trail",()=>{
 let g=setup();act(g,"h0a","key",T+1000);const p=g.players[0].progress!;advanceClock(g,p.deadline!);
 assert.equal(p.phase,"detention");const q=currentPuzzles(g,p)[0];assert.equal(typeof q.answer,"string");
 act(g,q.id,q.answer,p.deadline!-1000);assert.equal(p.phase,"main");assert.equal(p.score,50);assert.equal(p.solved.h0a,"host");
 g=normalizeGame(JSON.parse(JSON.stringify(g)));assert.equal(g.puzzleKind,"treasure");assert.equal(snapshot(g,1,T+300000,"host").puzzles[1].locked,false);
});
