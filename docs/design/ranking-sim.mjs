// Ranking-algorithm Monte Carlo — backs ADR 009.
// Compares global-ranking estimators on synthetic bar data with KNOWN true quality,
// so we can measure which actually recovers "the best bar in the world" and how it
// behaves under sparsity, disconnected cities, cold-start, and gaming.
//
// Run:  bun docs/design/ranking-sim.mjs   (or: node docs/design/ranking-sim.mjs)
// Pure JS, no deps, seeded → reproducible.

// ---------- seeded RNG ----------
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let RND = mulberry32(42);
const rand = () => RND();
function gauss() { // Box-Muller
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function sample(arr) { return arr[Math.floor(rand() * arr.length)]; }
const sigmoid = (x) => 1 / (1 + Math.exp(-x));

// ---------- correlation metrics ----------
function rankOf(values) {
  const idx = values.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const ranks = new Array(values.length);
  idx.forEach(([, i], r) => { ranks[i] = r; });
  return ranks;
}
function pearson(a, b) {
  const n = a.length;
  const ma = a.reduce((s, x) => s + x, 0) / n;
  const mb = b.reduce((s, x) => s + x, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; num += x * y; da += x * x; db += y * y; }
  return num / Math.sqrt(da * db || 1e-12);
}
function spearman(a, b) { return pearson(rankOf(a), rankOf(b)); }
function kendallTau(a, b) {
  let c = 0, d = 0;
  for (let i = 0; i < a.length; i++)
    for (let j = i + 1; j < a.length; j++) {
      const s = Math.sign(a[i] - a[j]) * Math.sign(b[i] - b[j]);
      if (s > 0) c++; else if (s < 0) d++;
    }
  return (c - d) / (c + d || 1e-12);
}

// ---------- world generation ----------
function makeWorld({ nVenues, nCities, nUsers, visitsPerUser, localityBias, noiseScale, drawEps }) {
  const theta = Array.from({ length: nVenues }, () => gauss());          // true latent quality
  const city = Array.from({ length: nVenues }, () => Math.floor(rand() * nCities));
  // popularity ∝ quality (selection bias: better bars get visited more)
  const pop = theta.map((t) => Math.exp(0.8 * t));

  const comparisons = [];           // global pooled {i,j,winner: 'i'|'j'|'draw', user}
  const perUser = [];               // each user's own comparison list (for Beli-average)

  for (let u = 0; u < nUsers; u++) {
    const home = Math.floor(rand() * nCities);
    // sample a visited set, biased by popularity and home-city locality
    const weights = theta.map((_, v) => pop[v] * (city[v] === home ? localityBias : 1));
    const visited = weightedSampleWithoutReplacement(weights, Math.min(visitsPerUser, nVenues));
    const my = [];
    for (let a = 0; a < visited.length; a++)
      for (let b = a + 1; b < visited.length; b++) {
        const i = visited[a], j = visited[b];
        const diff = (theta[i] - theta[j]);
        let winner;
        if (Math.abs(diff) < drawEps) winner = 'draw';
        else winner = rand() < sigmoid(diff / noiseScale) ? 'i' : 'j';
        const rec = { i, j, winner, user: u };
        comparisons.push(rec); my.push(rec);
      }
    perUser.push({ visited, my });
  }
  return { theta, city, comparisons, perUser, nVenues };
}
function weightedSampleWithoutReplacement(weights, k) {
  const idx = weights.map((w, i) => [w * (0.0001 + rand()), i]).sort((a, b) => b[0] - a[0]);
  return idx.slice(0, k).map(([, i]) => i);
}

// ---------- estimators ----------
// 1) Online Elo (matches the app: K, epochs, draw=0.5)
function elo(comparisons, n, { K = 24, epochs = 8 } = {}) {
  const r = new Array(n).fill(1500);
  const games = new Array(n).fill(0);
  for (const c of comparisons) { games[c.i]++; games[c.j]++; }
  for (let e = 0; e < epochs; e++) {
    const order = comparisons.slice().sort(() => rand() - 0.5);
    for (const c of order) {
      const ea = 1 / (1 + Math.pow(10, (r[c.j] - r[c.i]) / 400));
      const sa = c.winner === 'i' ? 1 : c.winner === 'j' ? 0 : 0.5;
      r[c.i] += K * (sa - ea);
      r[c.j] += K * ((1 - sa) - (1 - ea));
    }
  }
  return { rating: r, games };
}
// 2) Bradley-Terry MLE via Hunter (2004) MM, with Bayesian anchor prior (shrinkage)
function bradleyTerry(comparisons, n, { priorStrength = 1.0, iters = 200 } = {}) {
  const W = new Array(n).fill(0);                 // wins (draws = 0.5)
  const pairN = new Map();                         // "i,j" -> count
  const key = (i, j) => i < j ? `${i},${j}` : `${j},${i}`;
  for (const c of comparisons) {
    if (c.winner === 'i') W[c.i] += 1; else if (c.winner === 'j') W[c.j] += 1;
    else { W[c.i] += 0.5; W[c.j] += 0.5; }
    pairN.set(key(c.i, c.j), (pairN.get(key(c.i, c.j)) || 0) + 1);
  }
  let p = new Array(n).fill(1);
  for (let it = 0; it < iters; it++) {
    const np = new Array(n).fill(0);
    const denom = new Array(n).fill(priorStrength / (1 + 1)); // anchor: virtual matches vs strength-1
    for (const [k, cnt] of pairN) {
      const [i, j] = k.split(',').map(Number);
      denom[i] += cnt / (p[i] + p[j]);
      denom[j] += cnt / (p[i] + p[j]);
    }
    for (let i = 0; i < n; i++) np[i] = (W[i] + priorStrength * 0.5) / denom[i]; // prior adds half a win
    // normalize geometric mean to 1
    const gm = Math.exp(np.reduce((s, x) => s + Math.log(x), 0) / n);
    p = np.map((x) => x / gm);
  }
  return p.map((x) => Math.log(x)); // theta_hat
}
// 3) Beli-style: per-user normalized rank (0..1), global = mean across raters
function beliAverage(perUser, n) {
  const sum = new Array(n).fill(0), cnt = new Array(n).fill(0);
  for (const { visited, my } of perUser) {
    if (visited.length < 2) continue;
    // tiny per-user Elo over the user's own comparisons → personal order
    const local = {}; visited.forEach((v) => (local[v] = 1500));
    for (let e = 0; e < 6; e++) for (const c of my) {
      const ea = 1 / (1 + Math.pow(10, (local[c.j] - local[c.i]) / 400));
      const sa = c.winner === 'i' ? 1 : c.winner === 'j' ? 0 : 0.5;
      local[c.i] += 24 * (sa - ea); local[c.j] += 24 * ((1 - sa) - (1 - ea));
    }
    const ordered = visited.slice().sort((a, b) => local[a] - local[b]);
    ordered.forEach((v, idx) => {
      const pct = ordered.length === 1 ? 0.5 : idx / (ordered.length - 1); // 0..1 normalized rank
      sum[v] += pct; cnt[v] += 1;
    });
  }
  return sum.map((s, i) => (cnt[i] ? s / cnt[i] : 0.5));
}
// 4) Glicko-ish conservative: Elo rating minus z * sd, sd ∝ 1/sqrt(games)
function eloConservative(eloOut, { z = 1.5, sdBase = 350 } = {}) {
  return eloOut.rating.map((r, i) => r - z * (sdBase / Math.sqrt(eloOut.games[i] + 1)));
}

// ---------- scenario runner ----------
function evaluate(theta, est, minGames = null, games = null) {
  let idx = theta.map((_, i) => i);
  if (minGames != null && games) idx = idx.filter((i) => games[i] >= minGames);
  const t = idx.map((i) => theta[i]);
  const e = idx.map((i) => est[i]);
  return { sp: spearman(t, e), tau: kendallTau(t, e), nn: idx.length };
}
function pad(s, w) { return String(s).padEnd(w); }
function f(x) { return (x >= 0 ? ' ' : '') + x.toFixed(3); }

function runScenario(name, cfg) {
  RND = mulberry32(cfg.seed ?? 42);
  const world = makeWorld(cfg);
  const { theta, comparisons, perUser, nVenues } = world;
  const eloOut = elo(comparisons, nVenues, { K: cfg.K ?? 24, epochs: 8 });
  const bt = bradleyTerry(comparisons, nVenues, { priorStrength: cfg.prior ?? 1.0 });
  const beli = beliAverage(perUser, nVenues);
  const cons = eloConservative(eloOut, { z: 1.5 });

  const totalComp = comparisons.length;
  const minG = cfg.minGames ?? 3;
  console.log(`\n=== ${name} ===`);
  console.log(`venues=${nVenues} cities=${cfg.nCities} users=${cfg.nUsers} visits/user=${cfg.visitsPerUser} ` +
    `locality=${cfg.localityBias} noise=${cfg.noiseScale} → ${totalComp} comparisons`);
  console.log(`method              Spearman   Kendall   (venues≥${minG} cmp: Spearman)`);
  for (const [label, est] of [
    ['Elo (online)', eloOut.rating],
    ['Bradley-Terry+prior', bt],
    ['Beli avg-personal', beli],
    ['Elo conservative LB', cons],
  ]) {
    const all = evaluate(theta, est);
    const well = evaluate(theta, est, minG, eloOut.games);
    console.log(`${pad(label, 20)}${f(all.sp)}   ${f(all.tau)}      ${f(well.sp)}  (n=${well.nn})`);
  }
  return world;
}

// ---------- gaming + cold-start probes ----------
function gamingProbe(cfg) {
  RND = mulberry32(7);
  const world = makeWorld(cfg);
  const { theta, comparisons, nVenues } = world;
  // pick a genuinely-bad target (bottom 20%) and inject sybil wins
  const order = theta.map((t, i) => [t, i]).sort((a, b) => a[0] - b[0]);
  const target = order[Math.floor(nVenues * 0.15)][1];
  const trueRankPct = 0.15;
  const fake = cfg.fakeWins ?? 60;
  for (let k = 0; k < fake; k++) {
    const opp = Math.floor(rand() * nVenues);
    if (opp === target) continue;
    comparisons.push({ i: target, j: opp, winner: 'i', user: 10000 + k }); // sybil ring
  }
  const eloOut = elo(comparisons, nVenues, { K: 24, epochs: 8 });
  const bt = bradleyTerry(comparisons, nVenues, { priorStrength: 4.0 }); // stronger prior = more shrinkage
  const cons = eloConservative(eloOut, { z: 1.5 });
  const pctRank = (est) => {
    const r = rankOf(est); // 0=worst
    return r[target] / (nVenues - 1);
  };
  console.log(`\n=== GAMING PROBE (inject ${fake} fake wins for a true-bottom-15% venue) ===`);
  console.log(`true quality percentile of target: ${(trueRankPct * 100).toFixed(0)}% (should stay low)`);
  console.log(`Elo (online)         → ranks at ${(pctRank(eloOut.rating) * 100).toFixed(0)}% percentile`);
  console.log(`Bradley-Terry+prior  → ranks at ${(pctRank(bt) * 100).toFixed(0)}% percentile`);
  console.log(`Elo conservative LB  → ranks at ${(pctRank(cons) * 100).toFixed(0)}% percentile`);
}

function coldStartProbe(cfg) {
  RND = mulberry32(11);
  const world = makeWorld(cfg);
  const { theta, comparisons, nVenues } = world;
  // a genuinely great venue (top 5%) that only got 2 lucky comparisons
  const order = theta.map((t, i) => [t, i]).sort((a, b) => b[0] - a[0]);
  const gem = order[Math.floor(nVenues * 0.05)][1];
  const filtered = comparisons.filter((c) => c.i !== gem && c.j !== gem);
  filtered.push({ i: gem, j: order[nVenues - 1][1], winner: 'i', user: 1 });
  filtered.push({ i: gem, j: order[nVenues - 2][1], winner: 'i', user: 2 });
  const eloOut = elo(filtered, nVenues, { K: 24, epochs: 8 });
  const cons = eloConservative(eloOut, { z: 1.5 });
  const pr = (est) => (rankOf(est)[gem] / (nVenues - 1) * 100).toFixed(0);
  console.log(`\n=== COLD-START PROBE (true top-5% venue with only 2 comparisons) ===`);
  console.log(`naive Elo rating     → ${pr(eloOut.rating)}% percentile (2 lucky wins → inflated/unstable)`);
  console.log(`conservative LB      → ${pr(cons)}% percentile (held back until it earns confidence)`);
}

// ---------- run ----------
const base = { nVenues: 120, nCities: 6, nUsers: 400, visitsPerUser: 8, noiseScale: 0.9, drawEps: 0.15 };
runScenario('S1  DENSE + CONNECTED (low locality, many cross-city raters)', { ...base, localityBias: 1.2, seed: 1 });
runScenario('S2  SPARSE + CLUSTERED (high locality → near-disconnected cities)', { ...base, visitsPerUser: 5, localityBias: 25, seed: 2 });
runScenario('S3  REALISTIC MIDDLE (moderate locality + selection bias)', { ...base, localityBias: 6, seed: 3 });
gamingProbe({ ...base, localityBias: 6, seed: 5 });
coldStartProbe({ ...base, localityBias: 6, seed: 6 });

// Robustness: average the realistic-middle regime over many seeds so the ranking of
// methods doesn't rest on a lucky draw. Reports mean Spearman ± sd and how often each
// method wins the all-venue metric.
function robustness(nSeeds = 40) {
  const cfg = { ...base, localityBias: 6 };
  const labels = ['Elo (online)', 'Bradley-Terry+prior', 'Beli avg-personal', 'Elo conservative LB'];
  const allAcc = labels.map(() => []);
  const wellAcc = labels.map(() => []);
  const wins = labels.map(() => 0);
  for (let s = 0; s < nSeeds; s++) {
    RND = mulberry32(1000 + s);
    const world = makeWorld(cfg);
    const eloOut = elo(world.comparisons, world.nVenues, { K: 24, epochs: 8 });
    const ests = [
      eloOut.rating,
      bradleyTerry(world.comparisons, world.nVenues, { priorStrength: 1.0 }),
      beliAverage(world.perUser, world.nVenues),
      eloConservative(eloOut, { z: 1.5 }),
    ];
    let bestAll = -2, bestIdx = 0;
    ests.forEach((e, k) => {
      const a = evaluate(world.theta, e).sp;
      const w = evaluate(world.theta, e, 3, eloOut.games).sp;
      allAcc[k].push(a); wellAcc[k].push(w);
      if (a > bestAll) { bestAll = a; bestIdx = k; }
    });
    wins[bestIdx]++;
  }
  const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const sd = (xs) => { const m = mean(xs); return Math.sqrt(mean(xs.map((x) => (x - m) ** 2))); };
  console.log(`\n=== ROBUSTNESS over ${nSeeds} seeds (realistic regime) ===`);
  console.log(`method              mean Spearman(all)   mean Spearman(≥3)   #1 on all-venue`);
  labels.forEach((l, k) => {
    console.log(`${pad(l, 20)}${f(mean(allAcc[k]))} ±${sd(allAcc[k]).toFixed(3)}      ` +
      `${f(mean(wellAcc[k]))} ±${sd(wellAcc[k]).toFixed(3)}     ${wins[k]}/${nSeeds}`);
  });
}
robustness();
console.log('\n(higher Spearman/Kendall = better recovery of the true "best in the world" order)');
