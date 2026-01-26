// Icons - SVG 아이콘 파일들
import homeIcon from './home.svg';
import settingsIcon from './settings.svg';
import chevronRightIcon from './chevron-right.svg';
import chevronLeftIcon from './chevron-left.svg';
import usersIcon from './users.svg';
import calendarIcon from './calendar.svg';
import closeIcon from './close.svg';
import arrowRightIcon from './arrow-right.svg';
import plusIcon from './plus.svg';
import linkIcon from './link.svg';
import bellIcon from './bell.svg';
import trashIcon from './trash.svg';
import bookIcon from './book.svg';
import churchIcon from './church.svg';
import targetIcon from './target.svg';
import briefcaseIcon from './briefcase.svg';
import heartIcon from './heart.svg';
import pencilIcon from './pencil.svg';
import graduationIcon from './graduation.svg';
import musicIcon from './music.svg';
import cameraIcon from './camera.svg';
import gamepadIcon from './gamepad.svg';
import starIcon from './star.svg';
import fireIcon from './fire.svg';
import giftIcon from './gift.svg';
import sunIcon from './sun.svg';
import moonIcon from './moon.svg';
import leafIcon from './leaf.svg';
import flowerIcon from './flower.svg';
import chartIcon from './chart.svg';
import rocketIcon from './rocket.svg';
import lightbulbIcon from './lightbulb.svg';
import coffeeIcon from './coffee.svg';
import globeIcon from './globe.svg';
import planeIcon from './plane.svg';
import chatIcon from './chat.svg';
import trophyIcon from './trophy.svg';
import paletteIcon from './palette.svg';
import dumbbellIcon from './dumbbell.svg';

export {
  homeIcon,
  settingsIcon,
  chevronRightIcon,
  chevronLeftIcon,
  usersIcon,
  calendarIcon,
  closeIcon,
  arrowRightIcon,
  plusIcon,
  linkIcon,
  bellIcon,
  trashIcon,
  bookIcon,
  churchIcon,
  targetIcon,
  briefcaseIcon,
  heartIcon,
  pencilIcon,
  graduationIcon,
  musicIcon,
  cameraIcon,
  gamepadIcon,
  starIcon,
  fireIcon,
  giftIcon,
  sunIcon,
  moonIcon,
  leafIcon,
  flowerIcon,
  chartIcon,
  rocketIcon,
  lightbulbIcon,
  coffeeIcon,
  globeIcon,
  planeIcon,
  chatIcon,
  trophyIcon,
  paletteIcon,
  dumbbellIcon,
};

// IconPicker용 아이콘 목록
export const PICKER_ICONS = [
  { id: 'book', icon: bookIcon, label: '책' },
  { id: 'pencil', icon: pencilIcon, label: '연필' },
  { id: 'graduation', icon: graduationIcon, label: '졸업' },
  { id: 'church', icon: churchIcon, label: '교회' },
  { id: 'star', icon: starIcon, label: '별' },
  { id: 'heart', icon: heartIcon, label: '하트' },
  { id: 'target', icon: targetIcon, label: '목표' },
  { id: 'trophy', icon: trophyIcon, label: '트로피' },
  { id: 'music', icon: musicIcon, label: '음악' },
  { id: 'camera', icon: cameraIcon, label: '카메라' },
  { id: 'palette', icon: paletteIcon, label: '팔레트' },
  { id: 'gamepad', icon: gamepadIcon, label: '게임' },
  { id: 'dumbbell', icon: dumbbellIcon, label: '운동' },
  { id: 'briefcase', icon: briefcaseIcon, label: '가방' },
  { id: 'chart', icon: chartIcon, label: '차트' },
  { id: 'rocket', icon: rocketIcon, label: '로켓' },
  { id: 'lightbulb', icon: lightbulbIcon, label: '전구' },
  { id: 'users', icon: usersIcon, label: '사람들' },
  { id: 'chat', icon: chatIcon, label: '채팅' },
  { id: 'calendar', icon: calendarIcon, label: '캘린더' },
  { id: 'fire', icon: fireIcon, label: '불' },
  { id: 'gift', icon: giftIcon, label: '선물' },
  { id: 'coffee', icon: coffeeIcon, label: '커피' },
  { id: 'plane', icon: planeIcon, label: '비행기' },
  { id: 'globe', icon: globeIcon, label: '지구' },
  { id: 'sun', icon: sunIcon, label: '태양' },
  { id: 'moon', icon: moonIcon, label: '달' },
  { id: 'leaf', icon: leafIcon, label: '잎' },
  { id: 'flower', icon: flowerIcon, label: '꽃' },
  { id: 'home', icon: homeIcon, label: '집' },
];

// 아이콘 ID로 아이콘 가져오기
export const getIconById = (iconId: string): string | undefined => {
  const found = PICKER_ICONS.find((item) => item.id === iconId);
  return found?.icon;
};
