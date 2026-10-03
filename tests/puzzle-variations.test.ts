import { test } from "node:test";
import assert from "node:assert/strict";
import { generatePuzzleRooms, validatedVariation } from "../lib/puzzle-variations.ts";
import { PUZZLES } from "../lib/puzzles.ts";
import { createGame, joinGame, mutateGame, snapshot, currentPuzzles, phaseKey, advanceClock } from "../lib/game.ts";
import { defaultAvatar } from "../lib/profiles.ts";

test("generated prompts satisfy their mathematics across 500 seeds and both levels", () => {
  let negative=false, fractional=false;
  for (const difficulty of ["junior","senior"] as const) for(let seed=1;seed<=500;seed++) {
    const bank=generatePuzzleRooms(difficulty,seed);
    assert.equal(bank.length,5);
    assert.equal(bank.flat().length,15);
    assert.deepEqual(bank,generatePuzzleRooms(difficulty,seed));
    for(const q of bank.flat()) {
      assert.ok(Number.isFinite(q.answer));
      const numbers=(q.prompt.match(/[−-]?\d+/g)??[]).map(n=>Number(n.replace("−","-")));
      const [a,b,c,d]=numbers;
      switch(q.id) {
        case "j0a": assert.equal(q.answer,a+b*c); break;
        case "j0b": assert.equal(q.answer,numbers[3]+(b-a)); break;
        case "j0c": assert.equal(q.answer,a*b-c); break;
        case "j1a": assert.equal(q.answer,a*b/c); break;
        case "j1b": assert.equal(q.answer,a*(1-b/100)); break;
        case "j2a": assert.equal(q.answer+a,b); break;
        case "j2c": assert.equal(a*q.answer-b,c); break;
        case "s0a": assert.equal(q.answer,a-b*(c+d)); break;
        case "s0c": assert.equal(q.answer,a+b-c); break;
        case "s1a": assert.ok(Math.abs(q.answer-(a/b+c/d))<1e-12); break;
        case "s2a": {
          const match=q.prompt.match(/Solve (\d+)\(x − (\d+)\) = (\d+)x ([+−]) (\d+)/)!;
          const [,left,offset,right,sign,constant]=match;
          assert.equal(Number(left)*(q.answer-Number(offset)),Number(right)*q.answer+(sign==="−"?-1:1)*Number(constant)); break;
        }
        case "s2b": assert.equal(q.answer,a**b*numbers[2]**numbers[3]/numbers[4]**numbers[5]); break;
        case "s2c": assert.equal(q.answer*q.answer,numbers[0]); assert.ok(q.answer>0); break;
        case "s4c": { const [,sum,product]=q.prompt.match(/x² − (\d+)x \+ (\d+)/)!; assert.equal(q.answer*q.answer-Number(sum)*q.answer+Number(product),0); assert.ok(q.answer>=Number(sum)/2); break; }
      }
      negative ||= q.answer<0; fractional ||= !Number.isInteger(q.answer);
      assert.ok(q.hint && q.solution);
    }
  }
  assert.ok(negative && fractional);
  assert.notDeepEqual(generatePuzzleRooms("junior",1),generatePuzzleRooms("junior",2));
});
test("invalid generated questions fall back to the authored bank without mutating it",()=>{
  const q=PUZZLES.junior[0][0], before=structuredClone(q);
  for(const replacement of [{...q,answer:NaN},{...q,prompt:""},{...q,id:"bad"}])
    assert.deepEqual(validatedVariation(q,()=>replacement),q);
  assert.deepEqual(validatedVariation(q,()=>{throw new Error("template unavailable");}),q);
  assert.deepEqual(q,before);
});
test("fresh Race questions persist through JSON reconnect, stay private, and change on rematch",()=>{
  const T=1000000;
  let g=createGame("ABCDEF","Host","senior","h-token","h",T,defaultAvatar(),{mode:"race",fillBots:false,freshPuzzles:true});
  joinGame(g,"Guest",defaultAvatar(),"b-token","b",T);
  g.players.forEach(p=>p.ready=true);
  mutateGame(g,{op:"start",token:"h-token"},T);
  const first=structuredClone(g.puzzleRooms!);
  const h=snapshot(g,1,T,"h"),b=snapshot(g,1,T,"b");
  assert.deepEqual(h.puzzles,b.puzzles);
  const raw=JSON.stringify(h);
  for(const secret of ['"puzzleRooms"','"seed"','"answer"','h-token','b-token']) assert.ok(!raw.includes(secret));
  g=JSON.parse(JSON.stringify(g));
  assert.deepEqual(g.puzzleRooms,first);
  const q=currentPuzzles(g,g.players[0].progress!)[0];
  mutateGame(g,{op:"answer",token:"h-token",puzzleId:q.id,answer:String(q.answer),phaseKey:phaseKey(g,"h")},T+1000);
  assert.equal(snapshot(g,2,T+1000,"b").puzzles[0].solution,null);
  assert.equal(snapshot(g,2,T+1000,"h").puzzles[0].solution,q.solution);
  advanceClock(g,T+1000000);
  mutateGame(g,{op:"restart",token:"h-token"},T+1000000);
  g.players.forEach(p=>{p.ready=true;p.lastSeen=T+1000000;});
  mutateGame(g,{op:"start",token:"h-token"},T+1000000);
  assert.notDeepEqual(g.puzzleRooms,first);
});
