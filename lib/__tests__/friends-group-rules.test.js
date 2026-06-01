const {
  canAddGroupMember,
  getGroupLeaveOutcome,
  hasExactlyOneActiveAdmin,
} = require('../friends/group-rules');

function members(count) {
  return Array.from({ length: count }, (_, index) => `user${index + 1}`);
}

describe('Friends group chat rules', () => {
  test('caps MVP group chats at 25 active members', () => {
    expect(canAddGroupMember({ currentMemberUids: members(24), uidToAdd: 'user25' })).toEqual({
      allowed: true,
    });
    expect(canAddGroupMember({ currentMemberUids: members(25), uidToAdd: 'user26' })).toEqual({
      allowed: false,
      reason: 'group_member_cap_reached',
    });
  });

  test('rejects adding duplicate group member', () => {
    expect(canAddGroupMember({ currentMemberUids: ['alice', 'bob'], uidToAdd: 'bob' })).toEqual({
      allowed: false,
      reason: 'already_member',
    });
  });

  test('requires exactly one active admin for active groups', () => {
    expect(
      hasExactlyOneActiveAdmin([
        { uid: 'alice', role: 'admin' },
        { uid: 'bob', role: 'member' },
      ]),
    ).toBe(true);
    expect(
      hasExactlyOneActiveAdmin([
        { uid: 'alice', role: 'admin' },
        { uid: 'bob', role: 'admin' },
      ]),
    ).toBe(false);
    expect(hasExactlyOneActiveAdmin([{ uid: 'alice', role: 'admin', leftAt: 100 }])).toBe(false);
  });

  test('requires admin transfer before admin leaves a non-empty group', () => {
    expect(
      getGroupLeaveOutcome({
        leavingUid: 'alice',
        adminUid: 'alice',
        activeMemberUids: ['alice', 'bob', 'cara'],
      }),
    ).toEqual({ allowed: false, reason: 'next_admin_required' });

    expect(
      getGroupLeaveOutcome({
        leavingUid: 'alice',
        adminUid: 'alice',
        activeMemberUids: ['alice', 'bob', 'cara'],
        nextAdminUid: 'bob',
      }),
    ).toEqual({ allowed: true, archive: false, nextAdminUid: 'bob' });
  });

  test('archives group when last active member leaves without requiring next admin', () => {
    expect(
      getGroupLeaveOutcome({
        leavingUid: 'alice',
        adminUid: 'alice',
        activeMemberUids: ['alice'],
      }),
    ).toEqual({ allowed: true, archive: true });
  });
});
