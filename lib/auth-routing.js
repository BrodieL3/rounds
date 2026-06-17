const { DEFAULT_AUTHENTICATED_ROUTE } = require('./tab-config');

const LOGIN_ROUTE = '/login';
const ONBOARDING_ROUTE = '/onboarding';

/**
 * Resolve the entry route from auth + onboarding state (parent ISA ISC-4).
 *
 *   loading                        → null  (wait; don't navigate yet)
 *   signed-out                     → /login
 *   signed-in & not onboarded      → /onboarding
 *   signed-in & onboarded          → /(tabs)/friends
 *
 * @param {{ loading:boolean, user:unknown, isOnboarded:boolean }} state
 * @returns {string | null}
 */
function resolveRoute({ loading, user, isOnboarded }) {
  if (loading) return null;
  if (!user) return LOGIN_ROUTE;
  if (!isOnboarded) return ONBOARDING_ROUTE;
  return DEFAULT_AUTHENTICATED_ROUTE;
}

module.exports = { resolveRoute, LOGIN_ROUTE, ONBOARDING_ROUTE };
module.exports.__esModule = true;
