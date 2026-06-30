const fs = require('fs');
const path = require('path');

function read(...segments) {
  return fs.readFileSync(path.join(__dirname, '..', '..', ...segments), 'utf8');
}

// Regression: a viewed profile was set from `snap.docs[0].data()` with no doc id.
// The Firestore doc id IS the uid, so without carrying it every `data.uid` use —
// follow, friend request, DM route params, the ratings query — operated on
// `undefined` for any user whose profile doc lacks an explicit uid field.
describe('Viewed profile carries its document id as uid', () => {
  test('user/[username] spreads the Firestore doc id into the profile', () => {
    const source = read('app', 'user', '[username].js');
    expect(source).toMatch(/uid:\s*snap\.docs\[0\]\.id/);
  });
});
