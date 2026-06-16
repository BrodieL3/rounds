const { DEFAULT_AUTHENTICATED_ROUTE } = require('./tab-config');

function resolveRoute({ loading }) {
  if (loading) return null;
  return DEFAULT_AUTHENTICATED_ROUTE;
}

module.exports = { resolveRoute };
module.exports.__esModule = true;
