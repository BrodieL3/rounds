STATUS: ACTIVE — agents must read before touching group creation, group membership grants, or lifecycle mutations.

# ADR 004: Trusted Boundary for Group Chat Creation

## Status
Accepted

## Context
Friends direct messages are currently created with client Firestore writes guarded by security rules. Group chat creation is different: creating a group grants membership, inbox access, message access, notifications, and future access to shared planning artifacts such as unlisted review links.

The group chat MVP allows a creator to select 2–24 Friends, creating a 3–25 member group including the creator. Firestore security rules can validate document shape, creator/admin fields, and basic membership, but they cannot practically verify that every selected invitee is a Friend for arbitrary group sizes. Validating each invitee requires dynamic friendship document reads and runs into security-rule read limits.

## Decision
Use a trusted Firebase Functions v2 callable, `createGroupConversation`, as the creation boundary for group chats.

The callable validates authentication, normalized group name, selected member count, total member cap, duplicate/self invitees, and Friendship for every selected member before writing conversation, member, conversation state, and notification documents.

Direct client creation of group conversation documents is denied by Firestore rules. Client Firestore writes may still send text messages after group membership exists, with rules enforcing active membership and text-message shape.

## Consequences
- Group membership grants are server-owned from the first group slice.
- Non-Friend group invite denial is enforceable for the full 25-member MVP cap.
- The app introduces a minimal `functions/` package earlier than the DM slice did.
- Tests must cover both callable behavior and Firestore rules.
- Later group lifecycle operations should follow the same trusted-boundary pattern when they mutate membership.
