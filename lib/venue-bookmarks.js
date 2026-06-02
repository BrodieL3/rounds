function buildBookmarkPayload({ venueId, venueName, city, cohort }) {
  if (!venueId || !venueName || !city || !cohort) {
    throw new Error('venueId, venueName, city, and cohort are required');
  }

  return {
    venueId,
    venueName,
    city,
    cohort,
    createdAt: Date.now(),
  };
}

function getBookmarkDocPath(uid, venueId) {
  return `users/${uid}/venueBookmarks/${venueId}`;
}

module.exports = {
  buildBookmarkPayload,
  getBookmarkDocPath,
};
