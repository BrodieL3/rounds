const fs = require('fs');
const path = require('path');

function read(...segments) {
  return fs.readFileSync(path.join(__dirname, '..', '..', ...segments), 'utf8');
}

describe('DM slice UI wiring', () => {
  test('Profile Message CTA navigates to canonical conversation route', () => {
    const source = read('app', 'user', '[username].js');
    expect(source).toContain('buildDirectMessageRouteParams');
    expect(source).toContain('router.push(buildDirectMessageRouteParams');
  });

  test('conversation route supports empty DM and text composer', () => {
    const route = read('app', 'conversation', '[id].js');
    const hook = read('hooks', 'useConversationSurface.js');
    const composer = read('components', 'conversation', 'Composer.js');

    expect(hook).toContain('subscribeConversationMessages');
    expect(hook).toContain('sendDirectTextMessage');
    expect(composer).toContain('Send');
    expect(route).toContain('useConversationSurface');
  });

  test('text composer auto-focuses and uses a circular arrow send button', () => {
    const composer = read('components', 'conversation', 'Composer.js');

    // Keyboard comes up automatically when a conversation opens (autoFocus + ref focus
    // after the navigation transition settles).
    expect(composer).toContain('autoFocus');
    expect(composer).toContain('ref={inputRef}');
    expect(composer).toMatch(/inputRef\.current\?\.focus\(\)/);
    // Send button is a lime circle with the SOLID arrow-up (chat.send) icon, no text label.
    expect(composer).toContain('sendCircle');
    expect(composer).toMatch(/name="chat\.send"\s+focused/);
    expect(composer).toMatch(/sendCircle:\s*{[^}]*borderRadius:\s*22/);
    // Placeholder / text is vertically centered in the field: the input is wrapped in a
    // pill that centers it (iOS ignores textAlignVertical, so the wrapper does the work).
    expect(composer).toContain('messageInputWrap');
    expect(composer).toMatch(/messageInputWrap:\s*{[^}]*justifyContent:\s*'center'/);
    expect(composer).toContain("textAlignVertical: 'center'");
  });

  test('Friends tab subscribes to inbox rows and supports hide', () => {
    const source = read('app', '(tabs)', 'friends.js');

    expect(source).toContain('subscribeUserConversations');
    expect(source).toContain('hideConversationForSelf');
    expect(source).toContain('Hide');
    expect(source).toContain('/conversation/[id]');
  });
});
