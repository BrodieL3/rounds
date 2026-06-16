import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { getSemanticIconName } from '../../lib/icon-platform';

const OUTLINE_ICONS = {
  AdjustmentsHorizontalIcon: require('@heroicons/react/24/outline/AdjustmentsHorizontalIcon'),
  ArrowPathIcon: require('@heroicons/react/24/outline/ArrowPathIcon'),
  ArrowUpIcon: require('@heroicons/react/24/outline/ArrowUpIcon'),
  Bars3Icon: require('@heroicons/react/24/outline/Bars3Icon'),
  BookmarkIcon: require('@heroicons/react/24/outline/BookmarkIcon'),
  BuildingStorefrontIcon: require('@heroicons/react/24/outline/BuildingStorefrontIcon'),
  CameraIcon: require('@heroicons/react/24/outline/CameraIcon'),
  ChatBubbleLeftIcon: require('@heroicons/react/24/outline/ChatBubbleLeftIcon'),
  ChatBubbleLeftRightIcon: require('@heroicons/react/24/outline/ChatBubbleLeftRightIcon'),
  CheckCircleIcon: require('@heroicons/react/24/outline/CheckCircleIcon'),
  CheckIcon: require('@heroicons/react/24/outline/CheckIcon'),
  ChevronDownIcon: require('@heroicons/react/24/outline/ChevronDownIcon'),
  ChevronLeftIcon: require('@heroicons/react/24/outline/ChevronLeftIcon'),
  ChevronRightIcon: require('@heroicons/react/24/outline/ChevronRightIcon'),
  GlobeAltIcon: require('@heroicons/react/24/outline/GlobeAltIcon'),
  GlobeEuropeAfricaIcon: require('@heroicons/react/24/outline/GlobeEuropeAfricaIcon'),
  HandThumbUpIcon: require('@heroicons/react/24/outline/HandThumbUpIcon'),
  HeartIcon: require('@heroicons/react/24/outline/HeartIcon'),
  InformationCircleIcon: require('@heroicons/react/24/outline/InformationCircleIcon'),
  LockClosedIcon: require('@heroicons/react/24/outline/LockClosedIcon'),
  MagnifyingGlassIcon: require('@heroicons/react/24/outline/MagnifyingGlassIcon'),
  MapIcon: require('@heroicons/react/24/outline/MapIcon'),
  MapPinIcon: require('@heroicons/react/24/outline/MapPinIcon'),
  MegaphoneIcon: require('@heroicons/react/24/outline/MegaphoneIcon'),
  MicrophoneIcon: require('@heroicons/react/24/outline/MicrophoneIcon'),
  MusicalNoteIcon: require('@heroicons/react/24/outline/MusicalNoteIcon'),
  PaperAirplaneIcon: require('@heroicons/react/24/outline/PaperAirplaneIcon'),
  PaperClipIcon: require('@heroicons/react/24/outline/PaperClipIcon'),
  PauseIcon: require('@heroicons/react/24/outline/PauseIcon'),
  PencilIcon: require('@heroicons/react/24/outline/PencilIcon'),
  PencilSquareIcon: require('@heroicons/react/24/outline/PencilSquareIcon'),
  PhotoIcon: require('@heroicons/react/24/outline/PhotoIcon'),
  PlayIcon: require('@heroicons/react/24/outline/PlayIcon'),
  PlusIcon: require('@heroicons/react/24/outline/PlusIcon'),
  SparklesIcon: require('@heroicons/react/24/outline/SparklesIcon'),
  Squares2X2Icon: require('@heroicons/react/24/outline/Squares2X2Icon'),
  StopIcon: require('@heroicons/react/24/outline/StopIcon'),
  TicketIcon: require('@heroicons/react/24/outline/TicketIcon'),
  TrophyIcon: require('@heroicons/react/24/outline/TrophyIcon'),
  UserCircleIcon: require('@heroicons/react/24/outline/UserCircleIcon'),
  UserIcon: require('@heroicons/react/24/outline/UserIcon'),
  UserPlusIcon: require('@heroicons/react/24/outline/UserPlusIcon'),
  UsersIcon: require('@heroicons/react/24/outline/UsersIcon'),
  XMarkIcon: require('@heroicons/react/24/outline/XMarkIcon'),
};

const SOLID_ICONS = {
  AdjustmentsHorizontalIcon: require('@heroicons/react/24/solid/AdjustmentsHorizontalIcon'),
  ArrowPathIcon: require('@heroicons/react/24/solid/ArrowPathIcon'),
  ArrowUpIcon: require('@heroicons/react/24/solid/ArrowUpIcon'),
  Bars3Icon: require('@heroicons/react/24/solid/Bars3Icon'),
  BookmarkIcon: require('@heroicons/react/24/solid/BookmarkIcon'),
  BuildingStorefrontIcon: require('@heroicons/react/24/solid/BuildingStorefrontIcon'),
  CameraIcon: require('@heroicons/react/24/solid/CameraIcon'),
  ChatBubbleLeftIcon: require('@heroicons/react/24/solid/ChatBubbleLeftIcon'),
  ChatBubbleLeftRightIcon: require('@heroicons/react/24/solid/ChatBubbleLeftRightIcon'),
  CheckCircleIcon: require('@heroicons/react/24/solid/CheckCircleIcon'),
  CheckIcon: require('@heroicons/react/24/solid/CheckIcon'),
  ChevronDownIcon: require('@heroicons/react/24/solid/ChevronDownIcon'),
  ChevronLeftIcon: require('@heroicons/react/24/solid/ChevronLeftIcon'),
  ChevronRightIcon: require('@heroicons/react/24/solid/ChevronRightIcon'),
  GlobeAltIcon: require('@heroicons/react/24/solid/GlobeAltIcon'),
  GlobeEuropeAfricaIcon: require('@heroicons/react/24/solid/GlobeEuropeAfricaIcon'),
  HandThumbUpIcon: require('@heroicons/react/24/solid/HandThumbUpIcon'),
  HeartIcon: require('@heroicons/react/24/solid/HeartIcon'),
  InformationCircleIcon: require('@heroicons/react/24/solid/InformationCircleIcon'),
  LockClosedIcon: require('@heroicons/react/24/solid/LockClosedIcon'),
  MagnifyingGlassIcon: require('@heroicons/react/24/solid/MagnifyingGlassIcon'),
  MapIcon: require('@heroicons/react/24/solid/MapIcon'),
  MapPinIcon: require('@heroicons/react/24/solid/MapPinIcon'),
  MegaphoneIcon: require('@heroicons/react/24/solid/MegaphoneIcon'),
  MicrophoneIcon: require('@heroicons/react/24/solid/MicrophoneIcon'),
  MusicalNoteIcon: require('@heroicons/react/24/solid/MusicalNoteIcon'),
  PaperAirplaneIcon: require('@heroicons/react/24/solid/PaperAirplaneIcon'),
  PaperClipIcon: require('@heroicons/react/24/solid/PaperClipIcon'),
  PauseIcon: require('@heroicons/react/24/solid/PauseIcon'),
  PencilIcon: require('@heroicons/react/24/solid/PencilIcon'),
  PencilSquareIcon: require('@heroicons/react/24/solid/PencilSquareIcon'),
  PhotoIcon: require('@heroicons/react/24/solid/PhotoIcon'),
  PlayIcon: require('@heroicons/react/24/solid/PlayIcon'),
  PlusIcon: require('@heroicons/react/24/solid/PlusIcon'),
  SparklesIcon: require('@heroicons/react/24/solid/SparklesIcon'),
  Squares2X2Icon: require('@heroicons/react/24/solid/Squares2X2Icon'),
  StopIcon: require('@heroicons/react/24/solid/StopIcon'),
  TicketIcon: require('@heroicons/react/24/solid/TicketIcon'),
  TrophyIcon: require('@heroicons/react/24/solid/TrophyIcon'),
  UserCircleIcon: require('@heroicons/react/24/solid/UserCircleIcon'),
  UserIcon: require('@heroicons/react/24/solid/UserIcon'),
  UserPlusIcon: require('@heroicons/react/24/solid/UserPlusIcon'),
  UsersIcon: require('@heroicons/react/24/solid/UsersIcon'),
  XMarkIcon: require('@heroicons/react/24/solid/XMarkIcon'),
};

function resolveHeroElement(iconComponent) {
  const Icon = iconComponent?.default || iconComponent;
  if (!Icon) return null;
  if (typeof Icon.render === 'function') return Icon.render({});
  if (typeof Icon === 'function') return Icon({});
  return null;
}

function resolvePaint(value, color) {
  return value === 'currentColor' ? color : value;
}

function renderPath(child, index, color) {
  if (!child || typeof child !== 'object' || child.type !== 'path') return null;
  const {
    fill,
    stroke,
    children: _children,
    ...pathProps
  } = child.props;

  return (
    <Path
      key={index}
      {...pathProps}
      fill={resolvePaint(fill, color)}
      stroke={resolvePaint(stroke, color)}
    />
  );
}

export default function AppIcon({ name, focused = false, size = 22, color, style, ...props }) {
  const iconName = getSemanticIconName(name, { focused });
  if (!iconName) return null;

  const iconComponent = (focused ? SOLID_ICONS[iconName] : OUTLINE_ICONS[iconName])
    || OUTLINE_ICONS[iconName]
    || SOLID_ICONS[iconName];
  const heroElement = resolveHeroElement(iconComponent);
  if (!heroElement?.props) return null;

  const {
    children,
    fill,
    stroke,
    strokeWidth,
    viewBox = '0 0 24 24',
  } = heroElement.props;

  return (
    <Svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill={resolvePaint(fill, color)}
      stroke={resolvePaint(stroke, color)}
      strokeWidth={strokeWidth}
      style={style}
      {...props}
    >
      {React.Children.toArray(children).map((child, index) => renderPath(child, index, color))}
    </Svg>
  );
}
