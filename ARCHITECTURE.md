# MAX Connectivity — Production Architecture

> **Version**: 3.0 | **Date**: 2026-06-14 | **Author**: Architecture Audit  
> **Status**: DESIGN PHASE — Do not implement until approved

---

## 1. SYSTEM OVERVIEW

MAX Connectivity is a real-time messaging platform with a JARVIS-inspired HUD aesthetic, built as a mobile-first Next.js PWA with an Express/Socket.io backend and MongoDB persistence. It ships as both a web app (Vercel) and an Android APK (Capacitor 6).

```
┌──────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                            │
│  Next.js 14 (Pages Router) + Capacitor 6 Android Shell      │
│  Zustand stores │ Socket.io-client │ Axios │ Framer Motion   │
└──────────────────────┬───────────────────────────────────────┘
                       │ HTTPS + WSS
┌──────────────────────▼───────────────────────────────────────┐
│                     SERVER LAYER                             │
│  Express 4 + Socket.io 4 (Railway)                           │
│  JWT Auth │ Nodemailer │ Web-Push │ Giphy Proxy              │
└──────────────────────┬───────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────┐
│                    DATA LAYER                                │
│  MongoDB Atlas (Mongoose 8)                                  │
│  Collections: users, messages, otp, friendrequests,          │
│  gamescores, memes, calllogs                                 │
└──────────────────────────────────────────────────────────────┘
```

### Current Deployment
- **Frontend**: Vercel (Next.js SSR/SSG)
- **Backend**: Railway (Node.js Express)
- **Database**: MongoDB Atlas
- **APK**: Capacitor 6 wrapping Vercel URL

---

## 2. SECURITY ARCHITECTURE

### Current State (Audit Findings)
| Area | Status | Issue |
|------|--------|-------|
| JWT tokens | ⚠️ Partial | 30-day expiry, no refresh tokens, no blacklist |
| Device binding | ⚠️ Owner-only | `activeDeviceId` + `sessionVersion` only for owner account |
| Rate limiting | ⚠️ In-memory | `loginAttempts` Map lost on restart, owner-login only |
| CORS | 🔴 OPEN | `callback(null, true)` — accepts ALL origins |
| Helmet.js | 🔴 Missing | No HTTP security headers |
| Input sanitization | 🔴 Missing | No XSS/injection protection |
| Password auth | 🔴 Unused | bcrypt exists but no password-based login flow active |
| OTP security | ⚠️ Partial | 6-digit, 10min TTL, one-time use — but no rate limit on send-otp |

### Target Security Architecture

#### Authentication Flow
```
User → [Passphrase + DeviceID] → Server validates
  → Increment sessionVersion (kills all old sessions)
  → Generate JWT { userId, sessionVersion, deviceId }
  → Return token (30d expiry)
  
Every request: middleware checks sessionVersion match
Every socket: handshake checks sessionVersion match
Mismatch → 401 DEVICE_CONFLICT → auto-logout on client
```

#### Security Hardening Plan
1. **Helmet.js** — Add to Express for security headers (CSP, HSTS, X-Frame-Options)
2. **CORS lockdown** — Whitelist: Vercel domain, localhost:3000, Capacitor origin
3. **Rate limiting** — `express-rate-limit` with MongoDB store (survives restarts)
   - Login: 5 attempts / 15 min / IP
   - OTP send: 3 attempts / 15 min / email
   - API general: 100 req / min / IP
4. **Input sanitization** — `express-mongo-sanitize` + `xss-clean` on all routes
5. **Token blacklist** — Store invalidated tokens in MongoDB with TTL index
6. **Logout endpoint** — POST `/api/auth/logout` that blacklists current token
7. **bcrypt rounds**: Already at 12 ✅

---

## 3. DATABASE SCHEMA

### User (exists — needs updates)
```js
{
  _id, username, email, googleId,
  password,              // exists but unused (OTP-only auth)
  displayName, bio,
  avatarColor,           // enum of 7 neon colors
  status,                // 'online' | 'offline' | 'away'
  lastSeen,
  vibe,                  // 'available' | 'gaming' | 'listening' | 'dnd' | 'ghost' | 'on-fire' | 'chillin'
  
  // Device security (exists, owner-only)
  isOwner, activeDeviceId, sessionVersion,
  
  // Social
  friends: [ObjectId],
  closeFriends: [ObjectId],
  
  // Gamification
  streakCount, lastStreakDate, totalMemesSent,
  badges: [String],      // 8 badge types
  // Individual game high scores (12 fields) — REDUNDANT with GameScore collection
  gameScores: {},        // nested scores object
  
  // Push
  pushSubscription: Mixed,
  
  timestamps: true
}
```

### Message (exists — solid)
```js
{
  _id, conversationId (indexed),
  sender: ObjectId,
  type: 'text' | 'meme' | 'gif' | 'voice',
  content, memeData: { id, memeId, name, title, url, preview, mp4 },
  replyTo: ObjectId,
  reactions: [{ emoji, users: [ObjectId] }],
  readBy: [ObjectId],
  deletedFor: [ObjectId],
  deletedForEveryone: Boolean,
  expiresAt: Date,       // TTL index for disappearing messages ✅
  timestamps: true
}
// Indexes: { conversationId: 1, createdAt: -1 }, { expiresAt: 1 } (TTL)
```

### FriendRequest (exists — solid)
```js
{ _id, sender: ObjectId, receiver: ObjectId, status: 'pending'|'accepted'|'rejected', timestamps }
// Index: { sender: 1, receiver: 1 } unique
```

### GameScore (exists — solid)
```js
{ _id, user: ObjectId, gameId: String (enum of 15 games), score, achievedAt }
// Indexes: { gameId: 1, score: -1 }, { gameId: 1, user: 1 } unique
```

### OTP (exists — solid)
```js
{ _id, email, code (6 digits), expiresAt, used: Boolean, timestamps }
// TTL index on expiresAt
```

### CallLog (exists — unused)
```js
{ _id, caller: ObjectId, receiver: ObjectId, callType, duration, status, startedAt, endedAt }
```

### Meme (exists — for meme feed feature)
```js
{ _id, name, url (unique), tags, keywords, category, source, subreddit,
  upvotes, nsfw, permalink, width, height, isTemplate, usageCount, trending, lastFetched }
```

### Models to DELETE (redundant with GameScore)
- `ReactionScore` — duplicate of GameScore for reaction-test
- `TyperScore` — duplicate of GameScore for type-racer

### Missing Models (needed)
- **Conversation** — Currently conversations are implicit (ID = sorted user IDs). Consider adding explicit model for group chat support, themes, disappear settings stored server-side.
- **Notification** — Currently client-only (localStorage). Need server-side for persistence.

---

## 4. API STRUCTURE

### Current Routes (from routes/ directory)

#### Auth (`/api/auth`)
| Method | Path | Auth | Status |
|--------|------|------|--------|
| POST | `/send-otp` | No | ✅ Working |
| POST | `/verify-otp` | No | ✅ Working |
| POST | `/signup` | No | ✅ Working |
| POST | `/login-otp` | No | ✅ Working |
| POST | `/login-verify` | No | ✅ Working |
| POST | `/google` | No | ✅ Working |
| POST | `/owner-login` | No | ✅ Working (rate-limited) |
| GET | `/me` | Yes | ✅ Working |
| PUT | `/profile` | Yes | ✅ Working |

#### Users (`/api/users`)
| Method | Path | Auth | Status |
|--------|------|------|--------|
| GET | `/search?q=` | Yes | ✅ Working |
| PUT | `/vibe` | Yes | ✅ Working |
| GET | `/:userId` | Yes | ✅ Working |

#### Friends (`/api/friends`)
| Method | Path | Auth | Status |
|--------|------|------|--------|
| POST | `/request` | Yes | ✅ Working |
| PUT | `/respond` | Yes | ✅ Working |
| GET | `/` | Yes | ✅ Working |
| GET | `/pending` | Yes | ✅ Working |
| GET | `/close-friends` | Yes | ✅ Working |
| POST | `/close-friend/:userId` | Yes | ✅ Working |
| DELETE | `/:id` | Yes | ✅ Working |

#### Messages (`/api/messages`)
| Method | Path | Auth | Status |
|--------|------|------|--------|
| GET | `/:convId?page=` | Yes | ✅ Working |
| POST | `/` | Yes | ✅ Working |
| POST | `/:id/react` | Yes | ✅ Working |
| DELETE | `/:id` | Yes | ✅ Working |
| PUT | `/:convId/read` | Yes | ✅ Working |

#### Games (`/api/games`)
| Method | Path | Auth | Status |
|--------|------|------|--------|
| POST | `/score` | Yes | ✅ Working |
| GET | `/stats` | Yes | ✅ Working |
| GET | `/leaderboard?gameId=` | Yes | ✅ Working |

#### GIFs (`/api/gifs`)
| Method | Path | Auth | Status |
|--------|------|------|--------|
| GET | `/search?q=` | Yes | ✅ Working |
| GET | `/trending` | Yes | ✅ Working |

#### Memes (`/api/memes`) — Duplicate GIF routes + meme feed
| Method | Path | Auth | Status |
|--------|------|------|--------|
| GET | `/gifs/trending` | Yes | ⚠️ Duplicate of /api/gifs |
| GET | `/gifs/search` | Yes | ⚠️ Duplicate of /api/gifs |
| GET | `/gifs/categories` | Yes | ✅ Working |
| GET | `/trending` | Yes | ✅ Legacy |
| GET | `/search` | Yes | ✅ Legacy |
| GET | `/collection` | Yes | ✅ Working |

#### Push (`/api/push`)
| Method | Path | Auth | Status |
|--------|------|------|--------|
| POST | `/subscribe` | Yes | ⚠️ Needs VAPID env vars |
| POST | `/unsubscribe` | Yes | ⚠️ Needs VAPID env vars |

#### Other
| Method | Path | Auth | Status |
|--------|------|------|--------|
| GET | `/health` | No | ✅ Working |
| GET | `/api/ice-config` | No | ⚠️ Should be auth-protected |

### Missing Routes (needed)
- `POST /api/auth/logout` — Token blacklist + session invalidation
- `GET /api/conversations` — List conversations with last message (currently done N+1 on client)
- `GET /api/calls/history` — Call log listing (CallLog model exists but unused)

---

## 5. SOCKET EVENTS

### Current Implementation (from socketHandler.js)

#### Client → Server
| Event | Data | Status |
|-------|------|--------|
| `join_conversation` | `{ conversationId }` | ✅ |
| `send_message` | `{ conversationId, receiverId, content, type, memeData, replyTo, disappearAfter }` | ✅ |
| `typing_start` | `{ conversationId, receiverId }` | ✅ |
| `typing_stop` | `{ conversationId, receiverId }` | ✅ |
| `react_message` | `{ messageId, emoji, conversationId }` | ✅ |
| `mark_read` | `{ conversationId, senderId }` | ✅ |
| `call:initiate` | `{ to, from, offer, callType, callerName, callerAvatar }` | ⚠️ Functional but fragile |
| `call:answer` | `{ to, answer }` | ⚠️ |
| `call:ice-candidate` | `{ to, candidate }` | ⚠️ |
| `call:reject` | `{ to }` | ⚠️ |
| `call:end` | `{ to }` | ⚠️ |
| `call:busy` | `{ to }` | ⚠️ |
| `ttt_challenge` | `{ opponentId, gameId }` | ✅ |
| `ttt_move` | `{ gameId, board, nextPlayer, opponentId }` | ✅ |
| `ttt_result` | `{ gameId, winner, opponentId }` | ✅ |

#### Server → Client
| Event | Data | Status |
|-------|------|--------|
| `receive_message` | `{ message }` (populated) | ✅ |
| `new_message_notification` | `{ conversationId, message, from }` | ✅ |
| `user_typing` | `{ conversationId, userId, username, displayName }` | ✅ |
| `user_stop_typing` | `{ conversationId, userId }` | ✅ |
| `user_status` | `{ userId, status }` | ✅ |
| `message_reacted` | `{ messageId, reactions }` | ✅ |
| `messages_read` | `{ conversationId, readBy }` | ✅ |
| `call:incoming` | `{ from, fromUser, offer, callType, callerName, callerAvatar }` | ⚠️ |
| `call:answered` | `{ from, answer }` | ⚠️ |
| `call:ice-candidate` | `{ candidate, from }` | ⚠️ |
| `call:ended` | `{ from }` | ⚠️ |
| `call:rejected` | `{ from }` | ⚠️ |
| `call:busy` | `{ from }` | ⚠️ |
| `ttt_challenge` | `{ from, gameId, challenger }` | ✅ |
| `ttt_move` | `{ gameId, board, nextPlayer, from }` | ✅ |
| `ttt_result` | `{ gameId, winner, from }` | ✅ |

### Socket Issues Found
1. **Duplicate disconnect handlers** — Two `socket.on('disconnect')` handlers (lines 171 and 252)
2. **No error handling** — Silent catches everywhere (`catch(() => {})`)
3. **No device-level socket tracking** — `onlineUsers` maps userId→Set<socketId>, but doesn't track deviceId for single-device enforcement
4. **Race condition** — `send_message` creates message and emits to room + receiver separately, can cause duplicate delivery

---

## 6. FRONTEND ARCHITECTURE

### Pages (Next.js Pages Router)
| Route | File | Purpose | Status |
|-------|------|---------|--------|
| `/login` | `login.js` | Owner passphrase login | ✅ |
| `/signup` | `signup.js` | OTP-based registration | ✅ |
| `/` | `index.js` | Redirect | ✅ |
| `/chats` | `chats.js` | Conversation list | ✅ |
| `/chat/[convId]` | `chat/[convId].js` | Active conversation (838 lines!) | ⚠️ Needs refactor |
| `/profile` | `profile.js` | User profile + settings | ✅ |
| `/friends` | `friends.js` | Friend management | ✅ |
| `/games` | `games.js` | Games hub | ✅ |
| `/call/[friendId]` | `call/[friendId].js` | WebRTC call page | ⚠️ Fragile |
| `/calls` | `calls.js` | Call history | ⚠️ Empty/stub |
| `/search` | `search.js` | User search | ✅ |
| `/camera` | `camera.js` | Camera feature | ✅ |
| `/memes` | `memes.js` | Meme feed | ✅ |
| `/gallery` | `gallery.js` | Photo gallery | ✅ |
| `/offline` | `offline.js` | Offline fallback | ✅ |

### State Management (Zustand stores)
| Store | File | State |
|-------|------|-------|
| `authStore` | `context/authStore.js` | user, token, isAuthenticated, login/logout actions |
| `callStore` | `context/callStore.js` | incomingCall, activeCall (minimal) |
| `notificationStore` | `context/notificationStore.js` | notifications array (localStorage-backed) |

### Key Hooks
| Hook | File | Purpose |
|------|------|---------|
| `useSocket` | `hooks/useSocket.js` | Singleton socket + event handlers |
| `useWebRTC` | `hooks/useWebRTC.js` | WebRTC peer connection management |
| `useToast` | `hooks/useToast.js` | Toast notification system |
| `useWindNotification` | `hooks/useWindNotification.js` | JARVIS wind-sweep notifications |
| `usePushNotifications` | `hooks/usePushNotifications.js` | Web Push registration |

### Key Components
| Component | Purpose | Status |
|-----------|---------|--------|
| `CallSystem.jsx` | Legacy call UI (standalone) | 🔴 Deprecated — replaced by `call/[friendId].js` + `useWebRTC` |
| `IncomingCallModal` | Incoming call popup | ✅ |
| `MessageBubble.jsx` | Message renderer | ✅ |
| `GifPanel.jsx` | GIF search panel | ✅ |
| `GifStickerPanel.jsx` | GIF+Sticker combined panel | ⚠️ May be unused |
| `MemeEditor.jsx` | Meme text overlay editor | ✅ |
| `WindNotification.jsx` | JARVIS toast style | ✅ |
| `BottomNav.jsx` | Navigation tabs | ✅ |
| `Avatar.jsx` | User avatar with status | ✅ |
| 13 game components | Individual games | ✅ |

---

## 7. PERFORMANCE TARGETS

| Metric | Current | Target |
|--------|---------|--------|
| First message load | ~800ms (N+1 queries) | < 500ms |
| Socket reconnect | ~3-5s | < 2s |
| Message send → receive | ~150ms | < 100ms |
| Chat page render (838 lines) | Slow | Refactor to < 300 lines |
| GIF panel open | ~1.5s | < 1s |
| Call connect time | Unreliable | < 5s |

### Performance Issues Found
1. **N+1 conversation loading** — `chats.js` fetches friends list, then fetches messages for EACH friend individually
2. **No conversation aggregation endpoint** — Server should return conversations with last message in one query
3. **Chat page is 838 lines** — Needs decomposition into smaller components
4. **Naive virtualization** — `chat/[convId].js` uses manual padding-based virtualization (estimate 80px per message)
5. **Voice messages stored as base64 in message content** — Should use file upload

---

## 8. APK ARCHITECTURE

### Current Capacitor Config
```ts
{
  appId: 'com.max.connectivity',
  appName: 'MAX',
  webDir: 'out',
  server: {
    url: 'https://frontend-mu-gules-75.vercel.app',  // ⚠️ Points to Vercel
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: ['*']    // ⚠️ Too permissive
  },
  android: {
    allowMixedContent: true,  // ⚠️ Security risk
    webContentsDebuggingEnabled: true  // ⚠️ Should be false in production
  }
}
```

### Issues
1. **Points to Vercel** — Should serve from local `out/` for offline support, with API pointing to Railway
2. **Debug mode enabled** — `webContentsDebuggingEnabled` must be false in production
3. **Mixed content allowed** — Should enforce HTTPS only
4. **No target SDK specified** — Should target SDK 35 (Android 15)
5. **No splash screen config** — Using defaults

---

## 9. AI ASSISTANT ARCHITECTURE

**Status**: Not yet implemented. Placeholder in architecture spec.

### Planned Design
- Uses Anthropic Claude API (claude-sonnet-4-6)
- System prompt: JARVIS persona, knows app features
- Context: current user, current page, recent errors
- Triggered by: floating button or "Hey JARVIS"
- Responses streamed for instant feel
- Stored in sessionStorage (not persistent)

---

## 10. WHAT NEEDS TO BE FIXED VS REBUILT

### ✅ FIX (keep existing code, patch)

| File | Issue | Fix |
|------|-------|-----|
| `backend/server.js` | CORS wide open | Whitelist known origins |
| `backend/server.js` | No Helmet.js | Add `helmet()` middleware |
| `backend/server.js` | `/api/ice-config` unprotected | Add auth middleware |
| `backend/routes/memes.js` | Duplicate GIF routes | Remove duplicates, keep `/api/gifs/*` |
| `backend/controllers/authController.js` | Rate limiter in-memory | Move to MongoDB/Redis store |
| `backend/middleware/auth.js` | No token blacklist check | Add blacklist lookup |
| `frontend/src/utils/api.js` | No logout on expired token | Add expired token handling |
| `frontend/capacitor.config.ts` | Debug mode, mixed content | Fix for production |
| `frontend/src/pages/chats.js` | N+1 query pattern | Use new `/api/conversations` endpoint |

### 🔄 REBUILD (rewrite from scratch)

| File | Reason |
|------|--------|
| `frontend/src/components/CallSystem.jsx` | Legacy duplicate of `useWebRTC` — completely unused but still in bundle |
| `backend/socket/socketHandler.js` | Duplicate disconnect handlers, no device tracking, race conditions, silent error swallowing |
| `frontend/src/pages/chat/[convId].js` | 838 lines, needs decomposition into ChatHeader, ChatMessages, ChatInput, ChatPanels |
| `frontend/src/hooks/useWebRTC.js` | ICE servers hardcoded (should fetch from `/api/ice-config`), no call logging, no reconnection strategy |

### 🆕 NEW FILES NEEDED

| File | Purpose |
|------|---------|
| `backend/middleware/rateLimiter.js` | Express rate limiter with MongoDB store |
| `backend/middleware/sanitize.js` | Input sanitization middleware |
| `backend/controllers/conversationController.js` | Conversation list with last message aggregation |
| `backend/routes/conversations.js` | Conversation routes |
| `backend/controllers/callController.js` | Call history endpoints using CallLog model |
| `backend/routes/calls.js` | Call log routes |
| `frontend/src/components/chat/ChatHeader.jsx` | Extracted from [convId].js |
| `frontend/src/components/chat/ChatInput.jsx` | Extracted from [convId].js |
| `frontend/src/components/chat/ChatMessages.jsx` | Extracted from [convId].js (virtualized list) |
| `frontend/src/components/chat/VoiceRecorder.jsx` | Extracted voice recording logic |

---

## 11. FILE CHANGE MANIFEST

### DELETE (3 files)
```
backend/models/ReactionScore.js      — Redundant with GameScore
backend/models/TyperScore.js         — Redundant with GameScore
frontend/src/components/CallSystem.jsx — Legacy duplicate, unused
```

### REWRITE (4 files)
```
backend/socket/socketHandler.js       — Race conditions, duplicate handlers, no device tracking
frontend/src/pages/chat/[convId].js   — 838 lines, decompose into components
frontend/src/hooks/useWebRTC.js       — Hardcoded ICE, no call logging, no reconnect
frontend/src/pages/call/[friendId].js — Tightly coupled to broken WebRTC hook
```

### SMALL FIX (9 files)
```
backend/server.js                     — CORS + Helmet + rate limiter + sanitization
backend/middleware/auth.js            — Token blacklist check
backend/controllers/authController.js — Persistent rate limiter, add logout
backend/routes/auth.js                — Add logout route
backend/routes/memes.js               — Remove duplicate GIF routes
frontend/src/utils/api.js             — Handle expired token logout
frontend/src/pages/chats.js           — Use conversations endpoint
frontend/capacitor.config.ts          — Production settings
frontend/src/context/authStore.js     — Add logout API call
```

### NEW FILES (10 files)
```
backend/middleware/rateLimiter.js
backend/middleware/sanitize.js
backend/controllers/conversationController.js
backend/routes/conversations.js
backend/controllers/callController.js
backend/routes/calls.js
frontend/src/components/chat/ChatHeader.jsx
frontend/src/components/chat/ChatInput.jsx
frontend/src/components/chat/ChatMessages.jsx
frontend/src/components/chat/VoiceRecorder.jsx
```

### SUMMARY
| Action | Count |
|--------|-------|
| Delete | 3 |
| Rewrite | 4 |
| Small Fix | 9 |
| New | 10 |
| **Total files to change** | **26** |

---

## 12. DEPENDENCY ADDITIONS NEEDED

### Backend (`package.json`)
```json
{
  "helmet": "^7.x",
  "express-rate-limit": "^7.x",
  "rate-limit-mongo": "^2.x",
  "express-mongo-sanitize": "^2.x",
  "xss-clean": "^0.1.x"
}
```

### Frontend
No new dependencies needed. Current stack is sufficient.
