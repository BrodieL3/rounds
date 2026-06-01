const { GROUP_CHAT_MAX_MEMBERS } = require('./contracts');

function activeMemberRecords(members = []) {
  return members.filter((member) => member && !member.leftAt);
}

function canAddGroupMember({ currentMemberUids = [], uidToAdd } = {}) {
  if (currentMemberUids.includes(uidToAdd)) {
    return { allowed: false, reason: 'already_member' };
  }

  if (currentMemberUids.length >= GROUP_CHAT_MAX_MEMBERS) {
    return { allowed: false, reason: 'group_member_cap_reached' };
  }

  return { allowed: true };
}

function hasExactlyOneActiveAdmin(members = []) {
  const activeAdmins = activeMemberRecords(members).filter((member) => member.role === 'admin');
  return activeAdmins.length === 1;
}

function getGroupLeaveOutcome({
  leavingUid,
  adminUid,
  activeMemberUids = [],
  nextAdminUid,
} = {}) {
  const remainingMemberUids = activeMemberUids.filter((uid) => uid !== leavingUid);

  if (remainingMemberUids.length === 0) {
    return { allowed: true, archive: true };
  }

  if (leavingUid !== adminUid) {
    return { allowed: true, archive: false };
  }

  if (!nextAdminUid) {
    return { allowed: false, reason: 'next_admin_required' };
  }

  if (!remainingMemberUids.includes(nextAdminUid)) {
    return { allowed: false, reason: 'next_admin_must_be_active_member' };
  }

  return { allowed: true, archive: false, nextAdminUid };
}

module.exports = {
  canAddGroupMember,
  getGroupLeaveOutcome,
  hasExactlyOneActiveAdmin,
};
module.exports.__esModule = true;
