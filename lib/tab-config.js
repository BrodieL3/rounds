const navigationShell = require('./navigation-shell');

module.exports = {
  ...navigationShell,
  HIDDEN_TAB_ROUTES: navigationShell.HIDDEN_TAB_ROUTES,
  PRIMARY_TABS: navigationShell.PRIMARY_TABS,
};
module.exports.__esModule = true;
