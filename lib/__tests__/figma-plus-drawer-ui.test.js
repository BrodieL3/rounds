const fs = require('fs');
const path = require('path');

function read(...segments) {
  return fs.readFileSync(path.join(__dirname, '..', '..', ...segments), 'utf8');
}

describe('Figma Plus menu formSheet', () => {
  test('plus-menu screen centers action group vertically inside the sheet', () => {
    const source = read('app', 'plus-menu.js');

    expect(source).toContain('justifyContent: \'center\'');
    expect(source).toContain('gap: 40');
    expect(source).not.toContain('space-evenly');
    expect(source).toContain("actionRow: {\n    flexDirection: 'row',\n    alignItems: 'center',\n  }");
  });

  test('plus-menu screen renders three actions with tiles, labels and subtext', () => {
    const source = read('app', 'plus-menu.js');
    const shell = read('lib', 'navigation-shell.js');

    expect(shell).toContain('Rate a venue');
    expect(shell).toContain('Create group chat');
    expect(shell).toContain('Create a post');
    expect(source).toContain('action.subtext');
  });
});
