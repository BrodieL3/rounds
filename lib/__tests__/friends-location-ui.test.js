const fs = require('fs');
const path = require('path');

describe('Location attachment UI wiring', () => {
  test('conversation screen imports location service', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'conversation', '[id].js'), 'utf8');

    expect(source).toContain("require('../../lib/friends/location-service')");
    expect(source).toContain('sendDirectLocationMessage');
    expect(source).toContain('sendGroupLocationMessage');
  });

  test('conversation screen renders location messages', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'conversation', '[id].js'), 'utf8');

    expect(source).toContain("item.type === 'location'");
    expect(source).toContain('locationCard');
    expect(source).toContain('locationLabel');
    expect(source).toContain('Linking.openURL');
  });
});
