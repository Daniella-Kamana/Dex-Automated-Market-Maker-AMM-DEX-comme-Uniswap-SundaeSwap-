
/* app.js - Pro Terminal with simulations, charts, orderbook, depth, wallet mock, theme toggle,
   pool math (constant product), analytics and Plutus endpoint stubs (backend_stub.md).
*/

const TOKENS = ['ADA','TOKA','TOKB'];
let POOLS = [
  {id:'ADA-TOKA', tokenA:'ADA', tokenB:'TOKA', reserveA:100000, reserveB:50000, fee:0.003},
  {id:'ADA-TOKB', tokenA:'ADA', tokenB:'TOKB', reserveA:80000, reserveB:120000, fee:0.003}
];
let HISTORY = [];

// ------------------ Helpers ------------------
function $q(sel){ return document.querySelector(sel); }
function $qa(sel){ return document.querySelectorAll(sel); }
function format(n){ return Number(n).toLocaleString(undefined,{maximumFractionDigits:6}); }

// ------------------ Populate selects & pools ------------------
function populateSelects(){
  ['#swapFrom','#swapTo','#liqA','#liqB'].forEach(id=>{
    const el = $q(id); if(!el) return;
    el.innerHTML = TOKENS.map(t=>`<option value="${t}">${t}</option>`).join('');
  });
}

function renderPools(){
  const list = $q('#poolList'); if(!list) return;
  list.innerHTML = '';
  POOLS.forEach(p=>{
    const el = document.createElement('div'); el.className='pool-card';
    el.innerHTML = `<div style="font-weight:700">${p.id}</div><div class="muted">Reserves: ${format(p.reserveA)} / ${format(p.reserveB)}</div>`;
    list.appendChild(el);
  });
  // pool table page
  const table = $q('#poolsTable'); if(table){
    table.innerHTML = '<table style="width:100%;border-collapse:collapse"><thead><tr style="text-align:left"><th>Pool</th><th>Reserve A</th><th>Reserve B</th><th>TVL est.</th></tr></thead><tbody>'+
    POOLS.map(p=>`<tr><td>${p.id}</td><td>${format(p.reserveA)}</td><td>${format(p.reserveB)}</td><td>$${(p.reserveA*1.0 + p.reserveB*1.0).toLocaleString()}</td></tr>`).join('')+
    '</tbody></table>';
  }
}

// ------------------ AMM math (constant product) ------------------
function getAmountOut(amountIn, reserveIn, reserveOut, fee){
  const amountInWithFee = amountIn * (1 - fee);
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn + amountInWithFee;
  return numerator / denominator;
}

// ------------------ Swap & Liquidity (mock) ------------------
function estimateSwap(){
  const from = $q('#swapFrom').value, to = $q('#swapTo').value, amount = parseFloat($q('#amountFrom').value || 0);
  if(from===to || !amount){ $q('#amountTo').value = ''; return; }
  const pool = POOLS.find(p=> (p.tokenA===from && p.tokenB===to) || (p.tokenA===to && p.tokenB===from) );
  if(!pool){ $q('#amountTo').value = 'No pool'; return; }
  const isAtoB = pool.tokenA === from;
  const out = getAmountOut(amount, isAtoB ? pool.reserveA : pool.reserveB, isAtoB ? pool.reserveB : pool.reserveA, pool.fee);
  $q('#amountTo').value = out ? out.toFixed(6) : '0';
  // price impact simple calc
  const priceBefore = (isAtoB? pool.reserveA/pool.reserveB : pool.reserveB/pool.reserveA);
  const priceAfter = ((isAtoB? pool.reserveA+amount : pool.reserveB+amount) / (isAtoB? pool.reserveB-out : pool.reserveA-out));
  const impact = (Math.abs(priceAfter - priceBefore)/priceBefore)*100;
  $q('#impactVal').textContent = impact.toFixed(3) + '%';
}

function executeSwap(){
  const from = $q('#swapFrom').value, to = $q('#swapTo').value, amount = parseFloat($q('#amountFrom').value || 0);
  if(from===to || !amount) return alert('Invalid swap');
  const pool = POOLS.find(p=> (p.tokenA===from && p.tokenB===to) || (p.tokenA===to && p.tokenB===from) );
  if(!pool) return alert('No pool');
  const isAtoB = pool.tokenA === from;
  const out = getAmountOut(amount, isAtoB ? pool.reserveA : pool.reserveB, isAtoB ? pool.reserveB : pool.reserveA, pool.fee);
  if(isAtoB){ pool.reserveA += amount; pool.reserveB -= out; } else { pool.reserveB += amount; pool.reserveA -= out; }
  HISTORY.unshift({type:'swap', from, to, amount, out, time: new Date().toISOString(), pool: pool.id});
  renderPools(); renderHistory(); addToOrderbook({type:'trade',side:'trade',price:(pool.reserveA/pool.reserveB).toFixed(6),size:out.toFixed(4)});
  alert(`Mock swap executed: ${amount} ${from} → ${out.toFixed(6)} ${to}`);
}

// Liquidity (naive)
function addLiquidity(){
  const a = $q('#liqA').value, b = $q('#liqB').value, amtA = parseFloat($q('#liqAamount').value||0), amtB = parseFloat($q('#liqBamount').value||0);
  if(a===b || !amtA || !amtB) return alert('Invalid liquidity');
  let pool = POOLS.find(p=> (p.tokenA===a && p.tokenB===b) || (p.tokenA===b && p.tokenB===a) );
  if(!pool){ pool = {id: a+'-'+b, tokenA: a, tokenB: b, reserveA:amtA, reserveB:amtB, fee:0.003}; POOLS.push(pool); }
  else { if(pool.tokenA===a){ pool.reserveA += amtA; pool.reserveB += amtB; } else { pool.reserveA += amtB; pool.reserveB += amtA; } }
  HISTORY.unshift({type:'add_liquidity', pool: pool.id, amtA, amtB, time:new Date().toISOString()});
  renderPools(); renderHistory();
  alert('Mock liquidity added');
}

function removeLiquidity10(){
  const pool = POOLS[0]; if(!pool) return;
  const remA = pool.reserveA * 0.1, remB = pool.reserveB * 0.1; pool.reserveA -= remA; pool.reserveB -= remB;
  HISTORY.unshift({type:'remove_liq', pool:pool.id, remA, remB, time:new Date().toISOString()});
  renderPools(); renderHistory();
}

// ------------------ History ------------------
function renderHistory(){
  const el = $q('#historyFull') || $q('#historyList') || $q('#history'); if(!el) return;
  el.innerHTML = HISTORY.map(h=>`<div style="padding:8px;border-bottom:1px solid #12243a"><strong>${h.type||h[0]||'tx'}</strong> ${h.pool?('• '+h.pool):''} ${h.amount?('- '+h.amount):''} ${h.out?('→ '+Number(h.out).toFixed(6)):''} <div class="muted">${new Date(h.time).toLocaleString()}</div></div>`).join('');
}

// ------------------ Orderbook & Depth (simulated) ------------------
let ORDERBOOK = {bids:[], asks:[]};
function seedOrderbook(){
  ORDERBOOK.bids = []; ORDERBOOK.asks = [];
  let mid = 1.0;
  for(let i=0;i<12;i++){ ORDERBOOK.bids.push({price:(mid - Math.random()*0.01).toFixed(6), size:(Math.random()*50+10).toFixed(2)}); ORDERBOOK.asks.push({price:(mid + Math.random()*0.01).toFixed(6), size:(Math.random()*50+10).toFixed(2)}); }
}
function renderOrderbook(){
  const ob = $q('#orderbook'); if(!ob) return;
  ob.innerHTML = '<div style="display:flex;gap:8px"><div style="flex:1"><b>Bids</b></div><div style="flex:1"><b>Asks</b></div></div>';
  for(let i=0;i<Math.max(ORDERBOOK.bids.length, ORDERBOOK.asks.length); i++){
    const b = ORDERBOOK.bids[i] || {}, a = ORDERBOOK.asks[i] || {};
    ob.innerHTML += `<div style="display:flex;gap:8px;padding:4px 0"><div style="flex:1;color:#7ef0c9">${b.price||''} <span class="muted">(${b.size||''})</span></div><div style="flex:1;color:#ff9da6">${a.price||''} <span class="muted">(${a.size||''})</span></div></div>`;
  }
}
function addToOrderbook(evt){
  // simple push to simulate trade influence
  if(evt.type==='trade'){ seedOrderbook(); renderOrderbook(); renderDepth(); }
}

// depth chart (canvas simple)
function renderDepth(){
  const c = $q('#depthChart'); if(!c) return; const ctx = c.getContext('2d'); ctx.clearRect(0,0,c.width,c.height);
  const bids = ORDERBOOK.bids.map(b=>parseFloat(b.price)), asks = ORDERBOOK.asks.map(a=>parseFloat(a.price));
  const prices = bids.concat(asks).sort((a,b)=>a-b);
  if(prices.length<2) return;
  const min = prices[0], max = prices[prices.length-1];
  // build cumulative sizes for demonstration
  const points = prices.map(p=>{ const bsum = ORDERBOOK.bids.filter(x=>parseFloat(x.price)<=p).reduce((s,x)=>s+parseFloat(x.size),0); const asum = ORDERBOOK.asks.filter(x=>parseFloat(x.price)>=p).reduce((s,x)=>s+parseFloat(x.size),0); return {p,depth:bsum+asum}; });
  const maxDepth = Math.max(...points.map(x=>x.depth));
  ctx.fillStyle = '#163142'; ctx.strokeStyle='#58f9c4'; ctx.lineWidth=2;
  ctx.beginPath();
  points.forEach((pt,i)=>{ const x = (i/(points.length-1))*c.width; const y = c.height - (pt.depth/maxDepth)*c.height; if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); ctx.lineTo(x,c.height); });
  ctx.closePath(); ctx.fill(); ctx.stroke();
}

// ------------------ Price Chart (simulated) ------------------
let PRICE_HISTORY = [];
function seedPrice(){ PRICE_HISTORY = []; let p = 1.0; for(let i=0;i<120;i++){ p = p*(1 + (Math.random()-0.48)*0.01); PRICE_HISTORY.push(p); } renderPriceChart(); updateMiniStats(); }
function tickPrice(){ const last = PRICE_HISTORY[PRICE_HISTORY.length-1]; const next = last*(1 + (Math.random()-0.5)*0.006); PRICE_HISTORY.push(next); if(PRICE_HISTORY.length>240) PRICE_HISTORY.shift(); renderPriceChart(); updateMiniStats(); }
function renderPriceChart(){ const c=$q('#priceChart'); if(!c) return; const ctx=c.getContext('2d'); ctx.clearRect(0,0,c.width,c.height); ctx.lineWidth=2; ctx.strokeStyle='#58f9c4'; ctx.beginPath(); const max=Math.max(...PRICE_HISTORY), min=Math.min(...PRICE_HISTORY); PRICE_HISTORY.forEach((p,i)=>{ const x=(i/(PRICE_HISTORY.length-1))*c.width; const y=c.height - ((p-min)/(max-min))*c.height; if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); }); ctx.stroke(); }
function updateMiniStats(){ const last = PRICE_HISTORY[PRICE_HISTORY.length-1]; const old = PRICE_HISTORY[0]; $q('#lastPrice').textContent = last.toFixed(6); $q('#change24').textContent = (((last-old)/old)*100).toFixed(2)+'%'; }

// ------------------ Theme toggle & Wallet mock ------------------
function toggleTheme(){ document.body.classList.toggle('light'); }
function mockConnect(){ alert('Mock wallet connect — replace with CIP-30 (Nami/Lace) integration. See backend_stub.md for integration tips.'); HISTORY.unshift({type:'connect', time:new Date().toISOString()}); renderHistory(); }

// ------------------ Pool analytics ------------------
function computeAnalytics(){
  const el = $q('#analytics'); if(!el) return;
  el.innerHTML = POOLS.map(p=>{ const tvl = p.reserveA + p.reserveB; const apr = ((p.reserveA + p.reserveB)/1000000)*20; return `<div class="card small"><div style="font-weight:700">${p.id}</div><div class="muted">TVL est. $${format(tvl)}</div><div>Est. APR: ${apr.toFixed(2)}%</div></div>`; }).join('');
}

// ------------------ Pool create (mock) ------------------
function createPool(){
  const a = $q('#newPoolA').value.trim(), b = $q('#newPoolB').value.trim(), aamt = parseFloat($q('#newAamt').value||0), bamt = parseFloat($q('#newBamt').value||0);
  if(!a || !b || !aamt || !bamt) return alert('Invalid input');
  POOLS.push({id:`${a}-${b}`, tokenA:a, tokenB:b, reserveA:aamt, reserveB:bamt, fee:0.003});
  computeAnalytics(); renderPools(); alert('Mock pool created');
}

// ------------------ Plutus/backend integration notes (stubs) ------------------
// See backend_stub.md in the project root for recommended endpoints and how to wire up.
// The frontend should call a middleware (Node/Express) that constructs and submits Cardano transactions
// using Lucid/cardano-serialization-lib and your Plutus off-chain code. Always implement server-side 
// signing & fee estimations carefully and ask users to sign via CIP-30 wallet.

// ------------------ Init ------------------
document.addEventListener('DOMContentLoaded', ()=>{
  populateSelects();
  renderPools();
  computeAnalytics();
  renderHistory();
  seedOrderbook();
  renderOrderbook();
  renderDepth();
  seedPrice();
  // wire buttons
  $q('#estimateBtn') && $q('#estimateBtn').addEventListener('click', estimateSwap);
  $q('#swapBtn') && $q('#swapBtn').addEventListener('click', executeSwap);
  $q('#addLiqBtn') && $q('#addLiqBtn').addEventListener('click', addLiquidity);
  $q('#removeLiqBtn') && $q('#removeLiqBtn').addEventListener('click', removeLiquidity10);
  $q('#createPoolBtn') && $q('#createPoolBtn').addEventListener('click', createPool);
  $q('#connectBtn') && $q('#connectBtn').addEventListener('click', mockConnect);
  $q('#connectBtn2') && $q('#connectBtn2').addEventListener('click', mockConnect);
  $q('#connectBtn3') && $q('#connectBtn3').addEventListener('click', mockConnect);
  $q('#connectBtn4') && $q('#connectBtn4').addEventListener('click', mockConnect);
  $qa('#themeToggle, #themeToggle2, #themeToggle3, #themeToggle4').forEach(b=>b.addEventListener('click', toggleTheme));
  // live ticks
  setInterval(()=>{ tickPrice(); seedOrderbook(); renderOrderbook(); renderDepth(); }, 2500);
  setInterval(()=>{ tickPrice(); }, 1500);
});
