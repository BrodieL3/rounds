// Pure. Builds and parses the rounds://connect?token=... link shared by the QR
// scanner and the deep-link testability seam. Returns the token or null; only
// well-formed hex tokens are accepted. Firebase-free.

function buildConnectLink(token) {
  if (!token) throw new Error('token is required');
  return `rounds://connect?token=${token}`;
}

function parseConnectLink(url) {
  if (typeof url !== 'string') return null;
  const m = url.match(/^rounds:\/\/connect\?(.+)$/);
  if (!m) return null;
  const token = new URLSearchParams(m[1]).get('token');
  return token && /^[0-9a-f]+$/i.test(token) ? token : null;
}

module.exports = { buildConnectLink, parseConnectLink };
