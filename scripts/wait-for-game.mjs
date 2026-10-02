const url=process.env.GAME_TEST_URL||'http://localhost:5173';
const until=Date.now()+60000;
while(Date.now()<until){try{const r=await fetch(url);if(r.ok){console.log('Local game server ready.');process.exit(0);}}catch{}await new Promise(r=>setTimeout(r,500));}
throw new Error('Local game server did not become ready in 60 seconds.');
