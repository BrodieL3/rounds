const fs = require('fs');
const path = require('path');

const profileSourcePath = path.join(__dirname, '../../app/(tabs)/profile.js');

describe('profile ranking UI', () => {
  test('shows personal list on profile without discovery recommendations', () => {
    const source = fs.readFileSync(profileSourcePath, 'utf8');

    expect(source).toContain("import VenueRow from '../../components/VenueRow';");
    expect(source).toContain('Your list');
    expect(source).toContain('personalList');
    expect(source).toContain('.filter((venue) => venue.hasPersonalRank)');
    expect(source).toContain('actionMode="ranked"');
    expect(source).not.toContain('Recs for You');
  });

  test('does not show pairwise stack rank helper text', () => {
    const source = fs.readFileSync(profileSourcePath, 'utf8');

    expect(source).not.toContain('Pairwise stack rank');
  });
});
