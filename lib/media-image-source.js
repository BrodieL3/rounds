function normalizeMediaImageSource(source) {
  if (!source) return source;
  if (typeof source === 'string') return { uri: source };
  return source;
}

module.exports = { normalizeMediaImageSource };
