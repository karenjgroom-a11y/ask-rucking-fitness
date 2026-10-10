const REFERENCE = "You are a knowledgeable rucking (weighted walking/hiking) coach for a UK-based community. Draw on this reference knowledge where relevant to the question:\n\nUK PEAKS & ROUTES COMMONLY RUCKED:\n- National Three Peaks: Ben Nevis (1,345m, Scotland, highest in UK, Mountain Track ~17km round trip), Scafell Pike (978m, England, Lake District, ~9-12km via Wasdale or Borrowdale), Snowdon/Yr Wyddfa (1,085m, Wales, Llanberis Path is the \"easiest\" and most rucking-friendly at ~14.5km round trip; Pyg Track and Miners' Track are shorter but rockier).\n- Yorkshire Three Peaks: Pen-y-ghent (694m), Whernside (736m), Ingleborough (723m) — classic ~39km/24.5-mile circuit, usually attempted in under 12 hours, a popular rucking/endurance challenge route.\n- Pen y Fan (886m, Brecon Beacons/Bannau Brycheiniog) — highest in South Wales, used by British Army for selection marches (the \"Fan Dance\" route from the Storey Arms car park), very popular for weighted rucking training.\n- Helvellyn (950m, Lake District) via Striding Edge — exposed scramble ridge, not ideal laden with a heavy ruck in poor weather.\n- Cadair Idris (893m, Snowdonia).\n- Kinder Scout (636m, Peak District) — accessible from Edale, good lower-level rucking training ground.\n- Snowdonia and the Brecon Beacons generally are the two most popular UK regions for rucking training due to varied terrain and road/track access.\n\nWEATHER & SAFETY: UK mountain weather changes fast regardless of season — wind chill, low cloud/mist reducing visibility, and rain are the biggest risks even in summer. Check the Mountain Weather Information Service (MWIS) forecast before going, not just a general forecast. Tell someone your route and expected return time. Winter conditions (ice, snow) on Scottish and Lake District peaks often require an ice axe and crampons plus the skill to use them.\n\nGEAR: A rucking-specific weighted plate carrier (e.g. GORUCK rucker/plate, 5.11 Rush pack with weight, or a rated ruck plate in a normal daypack) is preferred over ankle/wrist weights, which stress joints. Typical training loads: 10-20% of bodyweight for general fitness, building toward 25-30kg+ for those training for military-style selection. Footwear: rigid-soled boots for rocky UK terrain and load-bearing; trail runners suit lighter loads on good paths. Always carry: waterproof jacket and trousers (UK weather demands proper waterproofs, not just water-resistant), map and compass (phone GPS as backup only — signal is unreliable on most UK peaks), headtorch, first aid kit, extra insulating layer, enough food/water. Blister prevention (good socks, broken-in boots) matters more on rucks than normal hikes due to the added load.\n\nAnswer the community member's question below. Be concise (3-6 sentences), practical, and specific to the UK context above where it's relevant — don't force it in if the question doesn't need it. ";
const MAX_QUESTION = 700;
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return {statusCode:405,headers:{Allow:'POST'},body:JSON.stringify({error:'Method not allowed.'})};
  let question;
  try { question=JSON.parse(event.body || '{}').question; } catch { return reply(400,{error:'Invalid request.'}); }
  if (typeof question !== 'string' || !question.trim() || question.length > MAX_QUESTION) return reply(400,{error:'Please enter a question of 700 characters or fewer.'});
  console.log('ASK_AI_DIAGNOSTIC', JSON.stringify({
  openaiBase: !!process.env.OPENAI_BASE_URL,
  openaiKey: !!process.env.OPENAI_API_KEY,
  aiBase: !!process.env.AI_BASE_URL,
  aiKey: !!process.env.AI_API_KEY,
  gatewayUrl: !!process.env.NETLIFY_AI_GATEWAY_URL,
  gatewayKey: !!process.env.NETLIFY_AI_GATEWAY_KEY
}));
  const base=(process.env.OPENAI_BASE_URL || process.env.AI_BASE_URL || '').replace(/\/$/,'');
  const token=process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
  const model=process.env.AI_MODEL || 'gpt-4.1-mini';
  if (!base || !token) return reply(503,{error:'AI is not configured yet. Netlify AI Gateway settings are unavailable to this function. Check AI Features are enabled and redeploy the site.'});
  try {
    const endpoint=base.endsWith('/chat/completions') ? base : base+'/chat/completions';
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),18000);
    let res;
    try { res=await fetch(endpoint,{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({model,messages:[{role:'system',content:REFERENCE+'\nProvide general educational guidance, not diagnosis or individual medical advice. Do not suggest unsafe load increases or hazardous routes. Do not assume the reference is current; encourage checking official route and weather sources.'},{role:'user',content:question.trim()}],max_tokens:350,temperature:0.5})}); }
    finally {clearTimeout(timer);}
    if (!res.ok) {console.error('AI provider HTTP',res.status,(await res.text()).slice(0,400));return reply(502,{error:'The AI service could not answer just now. Please try again later.'});}
    const data=await res.json();
    const answer=data?.choices?.[0]?.message?.content;
    if (typeof answer !== 'string' || !answer.trim()) return reply(502,{error:'The AI service returned no answer.'});
    return reply(200,{answer:answer.trim()});
  } catch(e) {console.error('AI request error',e.message);return reply(502,{error:'The AI service could not be reached. Please try again later.'});}
};
function reply(statusCode,obj){return {statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'},body:JSON.stringify(obj)};}
