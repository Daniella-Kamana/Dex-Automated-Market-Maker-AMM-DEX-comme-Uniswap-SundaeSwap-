// ----------------------
// CONFIG
// ----------------------
const API_BASE = "http://localhost/Dex_Amm/api"; 
// Change si ton projet est ailleurs

// Short helper to POST
async function apiPost(url, data) {
    const fd = new FormData();
    for (let k in data) fd.append(k, data[k]);

    const res = await fetch(url, { method: "POST", body: fd });
    return res.json();
}

// Short helper to GET
async function apiGet(url) {
    const res = await fetch(url);
    return res.json();
}

// ----------------------
// 1. LOAD TOKENS
// ----------------------
async function loadTokens() {
    const tokens = await apiGet(`${API_BASE}/tokens.php`);
    const swapFrom = document.getElementById("swapFrom");
    const swapTo = document.getElementById("swapTo");

    tokens.forEach(t => {
        swapFrom.innerHTML += `<option value="${t.id}">${t.symbol}</option>`;
        swapTo.innerHTML += `<option value="${t.id}">${t.symbol}</option>`;
    });
}

// ----------------------
// 2. LOAD POOLS
// ----------------------
async function loadPools() {
    const pools = await apiGet(`${API_BASE}/pairs.php`);
    const poolList = document.getElementById("poolList");

    pools.forEach(p => {
        poolList.innerHTML += `
            <div class="pool-card">
                <h4>${p.tokenA_symbol} / ${p.tokenB_symbol}</h4>
                <div>Reserve A: ${p.reserveA}</div>
                <div>Reserve B: ${p.reserveB}</div>
                <div>LP Total: ${p.lp_total}</div>
            </div>
        `;
    });
}

// ----------------------
// 4. EXECUTE SWAP
// ----------------------
async function doSwap() {
    const from = document.getElementById("swapFrom").value;
    const to = document.getElementById("swapTo").value;
    const amountIn = document.getElementById("amountFrom").value;

    const pairList = await apiGet(`${API_BASE}/pairs.php`);
    const pair = pairList.find(
        p => (p.tokenA_id == from && p.tokenB_id == to) ||
             (p.tokenA_id == to && p.tokenB_id == from)
    );

    const resp = await apiPost(`${API_BASE}/swap.php`, {
        pair_id: pair.id,
        user_address: "user_demo",
        amount_in: amountIn,
        token_in: pair.tokenA_id == from ? "A" : "B"
    });

    alert("Swap success! You received " + resp.amount_out);
}

// ----------------------
// 5. EVENT LISTENERS
// ----------------------

document.getElementById("swapBtn").onclick = doSwap;

// ----------------------
// INIT
// ----------------------
loadTokens();
loadPools();
