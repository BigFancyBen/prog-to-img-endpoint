const path = require('path');

const CANVAS_CONFIG = {
  WIDTH: 330,
  TITLE_HEIGHT: 80,
  LINE_WIDTH: 2,
  SHADOW_CONFIG: {
    offsetX: 2,
    offsetY: 2,
    blur: 2,
    color: 'rgba(0, 0, 0, 0.5)'
  }
};

const COLORS = {
  YELLOW: '#ffff00',
  ORANGE: '#ff9a1d',
  WHITE: '#fff'
};

const FONTS = {
  RUNESCAPE: 'Runescape',
  SIZES: {
    TITLE: '30px',
    SUBTITLE: '20px',
    BODY: '16px',
    SMALL: '14px'
  }
};

const PATHS = {
  FONT_DIR: path.join(__dirname, '../../font'),
  ICONS_DIR: path.join(__dirname, '../../icons'),
  ITEMS_DIR: path.join(__dirname, '../../icons/items'),
  FONT_FILE: path.join(__dirname, '../../font/runescape.ttf')
};

const COIN_IDS = [617, 995, 996, 997, 998, 999, 1000, 1001, 1002, 1003, 1004, 6964, 8890, 8891, 8892, 8893, 8894, 8895, 8896, 8897, 8898, 8899, 14440, 18028];

const COLLECTION_LOG_CONFIG = {
  WIDTH: 396,
  HEIGHT: 221,
  ICON_SIZE: 50,
  ICON_POSITION: { x: 173, y: 135 }
};

module.exports = {
  CANVAS_CONFIG,
  COLORS,
  FONTS,
  PATHS,
  COIN_IDS,
  COLLECTION_LOG_CONFIG
}; 