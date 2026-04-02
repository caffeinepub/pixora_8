# Pixora

## Current State
New project. Only scaffolded Motoko actor and empty frontend exist.

## Requested Changes (Diff)

### Add
- User authentication (signup/login with username, bio, profile picture)
- Home feed showing posts from all users (latest first, paginated)
- Post upload: pick image from device, add caption, store via blob-storage
- Like / unlike posts (toggle, show count)
- Comment on posts (add comment, list comments with author + timestamp)
- User profile page: avatar, username, bio, all posts in grid view
- Follow / unfollow other users
- Bottom/side navigation: Home, Upload, Profile
- Post detail modal with full image, likes, comments

### Modify
- Nothing (new project)

### Remove
- Nothing

## Implementation Plan

### Backend (Motoko)
- User profile: create/update (username, bio, profile picture blob key)
- Posts: create post (image blob key, caption, timestamp, authorId), list all posts paginated, list posts by user
- Likes: toggle like on a post, get like count and whether caller has liked
- Comments: add comment, list comments per post
- Follows: follow/unfollow user, get follower/following counts, check if following
- All queries/updates require caller identity (authorization component)

### Components
- authorization: identity-based user sessions
- blob-storage: image uploads for posts and profile pictures

### Frontend
- Auth screens: signup (username, bio, avatar upload) and login
- Home feed: infinite scroll, post cards (avatar, username, image, caption, likes, comment preview)
- Upload screen: image picker, caption input, submit
- Profile screen: header (avatar, username, bio, post count, followers/following), grid of posts
- Post detail modal: full image, caption, like button, comment list, add comment input
- Navigation: left sidebar (desktop), bottom bar (mobile)
- Dark premium UI matching design preview
