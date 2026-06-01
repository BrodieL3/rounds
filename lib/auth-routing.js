const { DEFAULT_AUTHENTICATED_ROUTE } = require('./tab-config');

function resolveRoute({ loading, user, isOnboarded }) {
  if (loading) return null;
  if (!user) return '/welcome';
  if (!isOnboarded) return '/onboarding/phone';
  return DEFAULT_AUTHENTICATED_ROUTE;
}

module.exports = { resolveRoute };
module.exports.__esModule = true;
