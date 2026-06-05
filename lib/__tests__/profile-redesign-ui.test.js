const fs = require('fs');
const path = require('path');

const profileSourcePath = path.join(__dirname, '../../app/(tabs)/profile.js');
const editProfileSourcePath = path.join(__dirname, '../../app/edit-profile.js');
const { getRootStackScreens } = require('../navigation-shell');

describe('profile redesign UI', () => {
  test('profile has header actions, borderless stats, suggestions, and nav rows', () => {
    const source = fs.readFileSync(profileSourcePath, 'utf8');

    expect(source).toContain('share-outline');
    expect(source).toContain('menu-outline');
    expect(source).toContain('Member since');
    expect(source).toContain('+ Add School');
    expect(source).toContain('Edit profile');
    expect(source).toContain('Share profile');
    expect(source).toContain('Suggested for you');
    expect(source).toContain('See all');
    expect(source).toContain('Follow');
    expect(source).toContain('Been');
    expect(source).toContain('Want to Try');
    expect(source).toContain('Your list');
    expect(source).not.toContain('Recs for You');
  });

  test('profile renders personal list instead of old top spots or review list dumps', () => {
    const source = fs.readFileSync(profileSourcePath, 'utf8');

    expect(source).toContain("import VenueRow from '../../components/VenueRow';");
    expect(source).toContain('personalList');
    expect(source).not.toContain('My Top Spots');
    expect(source).not.toContain('Recent reviews');
  });

  test('profile text sizes stay aligned with the rest of the app', () => {
    const source = fs.readFileSync(profileSourcePath, 'utf8');
    const fontSizes = [...source.matchAll(/fontSize:\s*(\d+)/g)].map((match) => Number(match[1]));
    const oversizedBodyFonts = fontSizes.filter((size) => size > 18 && size !== 28);

    expect(oversizedBodyFonts).toEqual([]);
  });

  test('edit profile text sizes stay aligned with the rest of the app', () => {
    const source = fs.readFileSync(editProfileSourcePath, 'utf8');
    const fontSizes = [...source.matchAll(/fontSize:\s*(\d+)/g)].map((match) => Number(match[1]));
    const oversizedBodyFonts = fontSizes.filter((size) => size > 18 && size !== 28);

    expect(oversizedBodyFonts).toEqual([]);
  });

  test('edit profile route exposes avatar trigger and disclosure fields', () => {
    const source = fs.readFileSync(editProfileSourcePath, 'utf8');

    expect(source).toContain('Edit profile');
    expect(source).toContain('Edit profile photo');
    expect(source).toContain('Name');
    expect(source).toContain('Username');
    expect(source).toContain('Home city');
    expect(source).toContain('Bio');
    expect(source).toContain('Instagram');
    expect(source).toContain('TikTok');
    expect(source).toContain('Account settings');
    expect(source).toContain('lock-closed');
    expect(source).toContain('chevron-forward');
  });

  test('edit profile is registered as a modal route', () => {
    expect(getRootStackScreens()).toContainEqual(
      expect.objectContaining({
        name: 'edit-profile',
        options: expect.objectContaining({ presentation: 'modal' }),
      })
    );
  });
});
