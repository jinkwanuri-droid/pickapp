# Security Specification - Picker App

## Data Invariants
- A session must always have a list of participants.
- The `updatedAt` field must always match the server time.
- Only valid phases (PICKING, TOURNAMENT, RANKINGS) are allowed.

## The Dirty Dozen Payloads (Rejection Targets)
1. **Empty Participants**: Attempting to create a session with no participants.
2. **Invalid Theme**: Setting theme to 'neon' instead of 'light' or 'dark'.
3. **Phase Bypass**: Jumping to 'RANKINGS' phase when `final.winner` is null.
4. **ID Injection**: Using a 2KB string as a session ID to cause resource exhaustion.
5. **Unauthorized Status Change**: A user trying to set a participant status to 'PASS' without being the admin (if admin was implemented, currently public).
6. **Shadow Field**: Adding `isAdmin: true` to the session document.
7. **Negative Target**: Setting `targetCount` to -5.
8. **Broken Rankings**: Submitting rankings that are not an array.
9. **Fake Timestamp**: Providing a hardcoded strings for `updatedAt` instead of server timestamp.
10. **Logo Overflow**: Attempting to upload a 10MB Base64 string (exceeding document limits).
11. **Status Key Poisoning**: Using a dangerous key like `__proto__` in the statuses object.
12. **Match result spoofing**: Setting a SF winner that didn't come from the QF winners.

## Security Rules Strategy
- `allow read`: Public access (for shared viewing).
- `allow write`: Simplified for now (all users can update) but with strict schema validation to prevent corruption.

```typescript
// Test runner conceptual structure
describe('Firestore Security Rules', () => {
  it('should deny invalid phase', async () => { /* ... */ });
  it('should deny unauthorized fields', async () => { /* ... */ });
});
```
