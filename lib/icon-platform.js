const SEMANTIC_ICONS = Object.freeze({
  'tab.friends': Object.freeze({
    sfDefault: 'person.2',
    sfSelected: 'person.2.fill',
    heroOutline: 'UsersIcon',
    heroSolid: 'UsersIcon',
  }),
  'tab.discover': Object.freeze({
    sfDefault: 'globe.europe.africa',
    sfSelected: 'globe.europe.africa.fill',
    heroOutline: 'GlobeEuropeAfricaIcon',
    heroSolid: 'GlobeEuropeAfricaIcon',
  }),
  'tab.plus': Object.freeze({
    sfDefault: 'plus',
    sfSelected: 'plus',
    heroOutline: 'PlusIcon',
    heroSolid: 'PlusIcon',
  }),
  'tab.list': Object.freeze({
    sfDefault: 'line.3.horizontal',
    sfSelected: 'line.3.horizontal',
    heroOutline: 'Bars3Icon',
    heroSolid: 'Bars3Icon',
  }),
  'tab.profile': Object.freeze({
    sfDefault: 'person.circle',
    sfSelected: 'person.circle.fill',
    heroOutline: 'UserCircleIcon',
    heroSolid: 'UserCircleIcon',
  }),
  'action.add': Object.freeze({ sfDefault: 'plus', sfSelected: 'plus', heroOutline: 'PlusIcon', heroSolid: 'PlusIcon' }),
  'action.compose': Object.freeze({ sfDefault: 'square.and.pencil', sfSelected: 'square.and.pencil', heroOutline: 'PencilSquareIcon', heroSolid: 'PencilSquareIcon' }),
  'action.search': Object.freeze({ sfDefault: 'magnifyingglass', sfSelected: 'magnifyingglass', heroOutline: 'MagnifyingGlassIcon', heroSolid: 'MagnifyingGlassIcon' }),
  'action.filter': Object.freeze({ sfDefault: 'slider.horizontal.3', sfSelected: 'slider.horizontal.3', heroOutline: 'AdjustmentsHorizontalIcon', heroSolid: 'AdjustmentsHorizontalIcon' }),
  'plus.group-chat': Object.freeze({ sfDefault: 'bubble.left.and.bubble.right', sfSelected: 'bubble.left.and.bubble.right.fill', heroOutline: 'ChatBubbleLeftRightIcon', heroSolid: 'ChatBubbleLeftRightIcon' }),
  'plus.rate-venue': Object.freeze({ sfDefault: 'hand.thumbsup', sfSelected: 'hand.thumbsup.fill', heroOutline: 'HandThumbUpIcon', heroSolid: 'HandThumbUpIcon' }),
  'plus.create-post': Object.freeze({ sfDefault: 'megaphone', sfSelected: 'megaphone.fill', heroOutline: 'MegaphoneIcon', heroSolid: 'MegaphoneIcon' }),
  'chat.back': Object.freeze({ sfDefault: 'chevron.left', sfSelected: 'chevron.left', heroOutline: 'ChevronLeftIcon', heroSolid: 'ChevronLeftIcon' }),
  'chat.camera': Object.freeze({ sfDefault: 'camera', sfSelected: 'camera.fill', heroOutline: 'CameraIcon', heroSolid: 'CameraIcon' }),
  'chat.grid': Object.freeze({ sfDefault: 'square.grid.2x2', sfSelected: 'square.grid.2x2.fill', heroOutline: 'Squares2X2Icon', heroSolid: 'Squares2X2Icon' }),
  'chat.mic': Object.freeze({ sfDefault: 'mic', sfSelected: 'mic.fill', heroOutline: 'MicrophoneIcon', heroSolid: 'MicrophoneIcon' }),
  'chat.send': Object.freeze({ sfDefault: 'arrow.up', sfSelected: 'arrow.up', heroOutline: 'ArrowUpIcon', heroSolid: 'ArrowUpIcon' }),
});

const LEGACY_ICON_ALIASES = Object.freeze({
  add: 'PlusIcon',
  attach: 'PaperClipIcon',
  beer: 'BuildingStorefrontIcon',
  bookmark: 'BookmarkIcon',
  'bookmark-outline': 'BookmarkIcon',
  camera: 'CameraIcon',
  'camera-outline': 'CameraIcon',
  chatbubble: 'ChatBubbleLeftIcon',
  'chatbubble-outline': 'ChatBubbleLeftIcon',
  chatbubbles: 'ChatBubbleLeftRightIcon',
  'chatbubbles-outline': 'ChatBubbleLeftRightIcon',
  checkmark: 'CheckIcon',
  'checkmark-circle-outline': 'CheckCircleIcon',
  'chevron-back': 'ChevronLeftIcon',
  'chevron-down': 'ChevronDownIcon',
  'chevron-forward': 'ChevronRightIcon',
  close: 'XMarkIcon',
  'earth-outline': 'GlobeEuropeAfricaIcon',
  filter: 'AdjustmentsHorizontalIcon',
  'filter-outline': 'AdjustmentsHorizontalIcon',
  globe: 'GlobeAltIcon',
  'globe-outline': 'GlobeAltIcon',
  grid: 'Squares2X2Icon',
  'grid-outline': 'Squares2X2Icon',
  heart: 'HeartIcon',
  'heart-outline': 'HeartIcon',
  image: 'PhotoIcon',
  location: 'MapPinIcon',
  lock: 'LockClosedIcon',
  'lock-closed': 'LockClosedIcon',
  'lock-closed-outline': 'LockClosedIcon',
  megaphone: 'MegaphoneIcon',
  'megaphone-outline': 'MegaphoneIcon',
  menu: 'Bars3Icon',
  'menu-outline': 'Bars3Icon',
  mic: 'MicrophoneIcon',
  'mic-outline': 'MicrophoneIcon',
  'musical-notes': 'MusicalNoteIcon',
  navigate: 'MapIcon',
  'navigate-outline': 'MapIcon',
  'paper-plane': 'PaperAirplaneIcon',
  'paper-plane-outline': 'PaperAirplaneIcon',
  pause: 'PauseIcon',
  pencil: 'PencilIcon',
  'pencil-outline': 'PencilIcon',
  people: 'UsersIcon',
  'people-outline': 'UsersIcon',
  person: 'UserIcon',
  'person-add-outline': 'UserPlusIcon',
  'person-circle': 'UserCircleIcon',
  'person-circle-outline': 'UserCircleIcon',
  play: 'PlayIcon',
  ribbon: 'TicketIcon',
  search: 'MagnifyingGlassIcon',
  'search-outline': 'MagnifyingGlassIcon',
  send: 'PaperAirplaneIcon',
  stop: 'StopIcon',
  sync: 'ArrowPathIcon',
  'thumbs-up': 'HandThumbUpIcon',
  'thumbs-up-outline': 'HandThumbUpIcon',
  water: 'SparklesIcon',
  wine: 'SparklesIcon',
  'american-football': 'TrophyIcon',
  'arrow-up': 'ArrowUpIcon',
  'information-circle-outline': 'InformationCircleIcon',
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
  if (icon) return options.focused ? icon.heroSolid : icon.heroOutline;
  return LEGACY_ICON_ALIASES[name] || null;
}

module.exports = {
  LEGACY_ICON_ALIASES,
  SEMANTIC_ICONS,
  getSemanticIcon,
  getSemanticIconName,
};
module.exports.__esModule = true;
