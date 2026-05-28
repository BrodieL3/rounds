const DEFAULT_RATING = 1500;
const K = 16;
const EPOCHS = 10;

function expectedScore(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

function computeRankings(venues, comparisons) {
  const ratings = {};
  const wins = {};
  const losses = {};

  venues.forEach(v => {
    ratings[v.id] = DEFAULT_RATING;
    wins[v.id] = 0;
    losses[v.id] = 0;
  });

  const decisive = comparisons.filter(c => c.result !== 'too-tough');

  decisive.forEach(c => {
    if (c.result === c.a) {
      wins[c.a]++;
      losses[c.b]++;
    } else if (c.result === c.b) {
      wins[c.b]++;
      losses[c.a]++;
    }
  });

  for (let e = 0; e < EPOCHS; e++) {
    decisive.forEach(c => {
      const ra = ratings[c.a];
      const rb = ratings[c.b];
      const ea = expectedScore(ra, rb);
      const eb = expectedScore(rb, ra);

      if (c.result === c.a) {
        ratings[c.a] = ra + K * (1 - ea);
        ratings[c.b] = rb + K * (0 - eb);
      } else if (c.result === c.b) {
        ratings[c.a] = ra + K * (0 - ea);
        ratings[c.b] = rb + K * (1 - eb);
      }
    });
  }

  return venues
    .map(v => ({
      ...v,
      rating: Math.round(ratings[v.id]),
      wins: wins[v.id],
      losses: losses[v.id],
    }))
    .sort((x, y) => y.rating - x.rating);
}

module.exports = { computeRankings };
