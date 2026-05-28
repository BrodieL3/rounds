import { useState, useCallback } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { computeRankings } from '../../lib/ranking';

const MOCK_VENUES = [
  { id: 'v1', name: 'The Nocturne', type: 'cocktail lounge', neighborhood: 'Williamsburg' },
  { id: 'v2', name: 'Velvet Room', type: 'cocktail lounge', neighborhood: 'SoHo' },
  { id: 'v3', name: 'Midnight Orchard', type: 'cocktail lounge', neighborhood: 'East Village' },
  { id: 'v4', name: 'Sable & Stone', type: 'cocktail lounge', neighborhood: 'Lower East Side' },
];

function pickRandomPair(venues, history) {
  const ids = venues.map(v => v.id);
  const compared = new Set(history.map(h => `${h.a}-${h.b}`));
  const pairs = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const key = `${ids[i]}-${ids[j]}`;
      if (!compared.has(key)) pairs.push([ids[i], ids[j]]);
    }
  }
  if (pairs.length === 0) return null;
  return pairs[Math.floor(Math.random() * pairs.length)];
}

export default function RankScreen() {
  const [comparisons, setComparisons] = useState([]);
  const [pair, setPair] = useState(() => pickRandomPair(MOCK_VENUES, []));
  const [showHistory, setShowHistory] = useState(false);

  const submit = useCallback((result) => {
    const [a, b] = pair;
    const next = [...comparisons, { a, b, result, at: Date.now() }];
    setComparisons(next);
    setPair(pickRandomPair(MOCK_VENUES, next));
  }, [pair, comparisons]);

  const ranking = computeRankings(MOCK_VENUES, comparisons);
  const venueA = MOCK_VENUES.find(v => v.id === pair?.[0]);
  const venueB = MOCK_VENUES.find(v => v.id === pair?.[1]);

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.eyebrow}>{venueA?.type}</Text>
      <Text style={styles.title}>Which was better?</Text>
      <Text style={styles.copy}>Compare head-to-head within the same peer cohort.</Text>

      {pair ? (
        <View style={styles.card}>
          <View style={styles.venueBlock}>
            <Text style={styles.venueName}>{venueA.name}</Text>
            <Text style={styles.venueMeta}>{venueA.neighborhood}</Text>
          </View>
          <Text style={styles.vs}>vs</Text>
          <View style={styles.venueBlock}>
            <Text style={styles.venueName}>{venueB.name}</Text>
            <Text style={styles.venueMeta}>{venueB.neighborhood}</Text>
          </View>

          <View style={styles.buttonRow}>
            <Pressable style={styles.button} onPress={() => submit(venueA.id)}>
              <Text style={styles.buttonText}>Pick {venueA.name}</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.buttonSecondary]} onPress={() => submit('too-tough')}>
              <Text style={[styles.buttonText, styles.buttonSecondaryText]}>Too tough</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={() => submit(venueB.id)}>
              <Text style={styles.buttonText}>Pick {venueB.name}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.venueName}>Cohort complete!</Text>
          <Text style={styles.copy}>You compared every pairing in this cohort.</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Provisional ranking ({comparisons.length} comparisons)</Text>
        {ranking.map((v, i) => (
          <View key={v.id} style={styles.rankRow}>
            <Text style={styles.rankNum}>{i + 1}</Text>
            <Text style={styles.rankName}>{v.name}</Text>
            <Text style={styles.rankScore}>{v.wins}W {v.losses}L</Text>
            <Text style={styles.rankScore}>{v.rating}</Text>
          </View>
        ))}
      </View>

      <Pressable onPress={() => setShowHistory(s => !s)}>
        <Text style={styles.link}>{showHistory ? 'Hide history' : 'Show history'}</Text>
      </Pressable>

      {showHistory && (
        <View style={styles.section}>
          {comparisons.map((c, i) => {
            const aName = MOCK_VENUES.find(v => v.id === c.a)?.name;
            const bName = MOCK_VENUES.find(v => v.id === c.b)?.name;
            let label;
            if (c.result === 'too-tough') {
              label = 'Too tough';
            } else {
              const winnerName = MOCK_VENUES.find(v => v.id === c.result)?.name;
              label = `${winnerName} won`;
            }
            return (
              <Text key={i} style={styles.historyLine}>
                {i + 1}. {aName} vs {bName} → {label}
              </Text>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 24, backgroundColor: '#0b1020', flexGrow: 1 },
  eyebrow: { color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 2, fontWeight: '700' },
  title: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 8 },
  copy: { color: '#b6c2d9', fontSize: 16, marginTop: 8, lineHeight: 22 },
  card: { backgroundColor: '#121a33', borderRadius: 20, padding: 24, marginVertical: 20, gap: 16 },
  venueBlock: { alignItems: 'center', gap: 4 },
  venueName: { color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center' },
  venueMeta: { color: '#8892b0', fontSize: 14 },
  vs: { color: '#7dd3fc', textAlign: 'center', fontWeight: '800', fontSize: 16 },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 8, justifyContent: 'center' },
  button: { backgroundColor: '#7dd3fc', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, flex: 1, alignItems: 'center' },
  buttonSecondary: { backgroundColor: '#1e293b' },
  buttonText: { color: '#0b1020', fontWeight: '800', fontSize: 13 },
  buttonSecondaryText: { color: '#7dd3fc' },
  section: { marginTop: 8, gap: 8 },
  sectionTitle: { color: '#fff', fontWeight: '700', fontSize: 16, marginBottom: 4 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomColor: '#1e293b', borderBottomWidth: 1 },
  rankNum: { color: '#7dd3fc', fontWeight: '800', width: 24 },
  rankName: { color: '#fff', flex: 1, fontWeight: '600' },
  rankScore: { color: '#8892b0', fontWeight: '600', width: 55, textAlign: 'right' },
  link: { color: '#7dd3fc', fontSize: 14, fontWeight: '700', marginTop: 12 },
  historyLine: { color: '#8892b0', fontSize: 13 },
});
