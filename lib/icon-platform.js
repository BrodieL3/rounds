const SEMANTIC_ICONS = Object.freeze({
  'tab.friends': Object.freeze({
    sfDefault: 'bubble.left.and.bubble.right',
    sfSelected: 'bubble.left.and.bubble.right.fill',
    fallbackDefault: 'chatbubbles-outline',
    fallbackSelected: 'chatbubbles',
  }),
  'tab.feed': Object.freeze({
    sfDefault: 'newspaper',
    sfSelected: 'newspaper.fill',
    fallbackDefault: 'newspaper-outline',
    fallbackSelected: 'newspaper',
  }),
  'tab.add': Object.freeze({
    sfDefault: 'plus.circle',
    sfSelected: 'plus.circle.fill',
    fallbackDefault: 'add',
    fallbackSelected: 'add',
  }),
  'tab.list': Object.freeze({
    sfDefault: 'list.bullet',
    sfSelected: 'list.bullet',
    fallbackDefault: 'list-outline',
    fallbackSelected: 'list',
  }),
  'tab.profile': Object.freeze({
    sfDefault: 'person.crop.circle',
    sfSelected: 'person.crop.circle.fill',
    fallbackDefault: 'person-outline',
    fallbackSelected: 'person',
  }),
  'action.add': Object.freeze({ sfDefault: 'plus', sfSelected: 'plus', fallbackDefault: 'add', fallbackSelected: 'add' }),
});

function cloneIcon(icon) {
  return icon ? { ...icon } : null;
}

function getSemanticIcon(name) {
  if (!name) return null;
  return cloneIcon(SEMANTIC_ICONS[name]);
}

function getSemanticIconName(name, options = {}) {
  if (!name) return null;
  const icon = getSemanticIcon(name);
  if (!icon) return name;
  return options.focused ? icon.fallbackSelected : icon.fallbackDefault;
}

module.exports = {
  SEMANTIC_ICONS,
  getSemanticIcon,
  getSemanticIconName,
};
module.exports.__esModule = true;
