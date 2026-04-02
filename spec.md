# Pixora

## Current State
Pixora is a full Instagram-like social media app. The backend (main.mo) has full implementations for: user profiles, posts, likes, comments, follows, search, reels, reel likes/comments, and direct messages (chat).

However, the generated frontend bindings (`backend.ts` and `declarations/`) are stale -- they were last generated before Reels and Chat were added to the backend. This means:
1. `backend.ts` is missing `createReel`, `getAllReels`, `getReelsByUser`, `toggleReelLike`, `hasLikedReel`, `getReelLikeCount`, `addReelComment`, `getReelComments`, `sendMessage`, `getConversation`, `getConversations`
2. `declarations/backend.did.js` and `backend.did.d.ts` are also missing these methods
3. Profile picture uploads may silently fail due to stale binding issues

## Requested Changes (Diff)

### Add
- Nothing new to add at the feature level

### Modify
- Regenerate `backend.ts`, `declarations/backend.did.js`, and `declarations/backend.did.d.ts` to match the current `main.mo` which includes Reels and Chat
- Fix profile picture upload to ensure ExternalBlob.fromBytes() correctly triggers storage upload through the backend binding

### Remove
- Nothing to remove

## Implementation Plan
1. Regenerate backend Motoko code (which also regenerates frontend bindings) by calling `generate_motoko_code` with the full feature set
2. Update frontend pages (Reels.tsx, Chat.tsx) to use the actual generated actor methods instead of any workarounds
3. Ensure profile picture upload in OnboardingPage.tsx and ProfileHeader.tsx correctly uses ExternalBlob.fromBytes() which triggers upload via the generated binding
4. Validate build
