# MAX Connectivity — Complete Deployment Guide
## Iron Man JARVIS-aesthetic real-time meme chat PWA

---

## WHAT YOU BUILT
- Real-time 1-to-1 DM chat with Socket.io
- Meme suggestion engine (32 memes, 3-tier scoring)
- Friend system (send/accept/reject/remove)
- Gamification: streaks, badges, meme count
- PWA (installable on phone home screen)
- Full Iron Man HUD aesthetic (dark, neon cyan, grid overlay)
- JWT auth, bcrypt passwords, MongoDB Atlas

---

## STEP 0 — INSTALL PREREQUISITES

On your machine, install these if you don't have them:

1. **Node.js 18+**: https://nodejs.org → download LTS
   - Verify: open Terminal/CMD and type: `node --version`

2. **Git**: https://git-scm.com/downloads
   - Verify: `git --version`

3. **GitHub account**: https://github.com (free)

4. **MongoDB Atlas account**: https://cloud.mongodb.com (free)

5. **Railway account**: https://railway.app (free, login with GitHub)

6. **Vercel account**: https://vercel.com (free, login with GitHub)

---

## STEP 1 — MONGODB ATLAS SETUP

### 1.1 Create Free Cluster
1. Go to https://cloud.mongodb.com
2. Click **"Build a Database"**
3. Choose **FREE** (M0 Sandbox, 512MB)
4. Pick any region (closest to you)
5. Cluster name: `max-cluster` → Click **Create**

### 1.2 Create Database User
1. Left sidebar → **Database Access** → **Add New Database User**
2. Username: `maxadmin`
3. Password: click **Autogenerate Secure Password** → **COPY IT** (you'll need it)
4. Built-in Role: **Atlas Admin**
5. Click **Add User**

### 1.3 Whitelist All IPs (for Railway)
1. Left sidebar → **Network Access** → **Add IP Address**
2. Click **"Allow Access from Anywhere"** (adds 0.0.0.0/0)
3. Click **Confirm**

### 1.4 Get Connection String
1. Left sidebar → **Database** → **Connect** on your cluster
2. Choose **"Connect your application"**
3. Driver: **Node.js**, Version: **5.5 or later**
4. Copy the connection string — it looks like:
   ```
   mongodb+srv://maxadmin:<password>@max-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Replace `<password>` with the password you copied in 1.2
6. Add your database name — change `/?retryWrites` to `/max-connectivity?retryWrites`:
   ```
   mongodb+srv://maxadmin:YOURPASSWORD@max-cluster.xxxxx.mongodb.net/max-connectivity?retryWrites=true&w=majority
   ```
7. **Save this string** — you need it in Step 3.

---

## STEP 2 — PUSH CODE TO GITHUB

### 2.1 Create GitHub Repository
1. Go to https://github.com → click **"New repository"**
2. Name: `max-connectivity`
3. Make it **Private** (recommended)
4. Don't add README/gitignore (we have our own code)
5. Click **Create repository**

### 2.2 Push Your Code
Open Terminal/CMD in the `MAX-Connectivity` folder (where backend/ and frontend/ sit):

```bash
# Initialize git
git init

# Create .gitignore
cat > .gitignore << 'EOF'
node_modules/
.env
.env.local
.next/
*.log
EOF

# Add all files
git add .
git commit -m "feat: initial MAX Connectivity build"

# Connect to GitHub (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/max-connectivity.git
git branch -M main
git push -u origin main
```

If it asks for GitHub credentials, use your username and a **Personal Access Token** (not your password):
- GitHub → Settings → Developer settings → Personal access tokens → Generate new token (classic)
- Check: `repo` scope → Generate → Copy it → use as password

---

## STEP 3 — DEPLOY BACKEND ON RAILWAY

### 3.1 Create Railway Project
1. Go to https://railway.app → **"New Project"**
2. Choose **"Deploy from GitHub repo"**
3. Select `max-connectivity`
4. Railway will detect the repo

### 3.2 Configure Root Directory
1. Click on the service that was created
2. Go to **Settings** tab
3. Under **Source** → **Root Directory** → type: `backend`
4. Railway will now only deploy the `backend/` folder

### 3.3 Set Environment Variables
1. Click **Variables** tab
2. Add these one by one (click "New Variable" for each):

   | Key | Value |
   |-----|-------|
   | `MONGODB_URI` | your full Atlas connection string from Step 1.4 |
   | `JWT_SECRET` | any long random string, e.g. `mx_s3cr3t_k3y_jarvis_2024_ultra_secure_xyz` |
   | `NODE_ENV` | `production` |
   | `CLIENT_URL` | `https://placeholder.vercel.app` (update after Vercel deploy) |

   **Note:** `PORT` is set automatically by Railway — do NOT add it.

3. Click **Deploy** (or it auto-deploys on save)

### 3.4 Wait for Deploy
- Watch the **Deployments** tab — should show green "Success" in ~2 minutes
- Click on the deployment → **View Logs** — you should see:
  ```
  ✅ MongoDB connected: max-cluster.xxxxx.mongodb.net
  🚀 MAX Connectivity server running on port XXXX
  ```

### 3.5 Get Your Backend URL
1. Go to **Settings** → **Networking** → **Public Networking** → **Generate Domain**
2. Your URL looks like: `https://max-connectivity-production-xxxx.up.railway.app`
3. **Save this URL** — needed for Vercel setup

### 3.6 Seed the Meme Database
1. In Railway → your service → click **"Railway Shell"** (terminal icon)
2. Run:
   ```bash
   node scripts/seedMemes.js
   ```
3. You should see:
   ```
   ✅ Connected to MongoDB
   🗑️  Cleared existing memes
   ✅ Seeded 32 memes
   📦 Categories: Reaction, Relatable, Humor, ...
   ✅ Done! Disconnected.
   ```

---

## STEP 4 — DEPLOY FRONTEND ON VERCEL

### 4.1 Import Project
1. Go to https://vercel.com → **"Add New Project"**
2. Import from GitHub → select `max-connectivity`
3. **IMPORTANT**: Under **"Root Directory"** → click **Edit** → type `frontend`
4. Framework: **Next.js** (auto-detected)

### 4.2 Set Environment Variables
Under **Environment Variables**, add:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://YOUR_RAILWAY_URL.up.railway.app/api` |
| `NEXT_PUBLIC_SOCKET_URL` | `https://YOUR_RAILWAY_URL.up.railway.app` |

Replace `YOUR_RAILWAY_URL` with the Railway URL from Step 3.5.

### 4.3 Deploy
Click **Deploy** → wait ~3 minutes → you get a URL like:
`https://max-connectivity-xyz.vercel.app`

**Save this URL.**

---

## STEP 5 — UPDATE RAILWAY WITH VERCEL URL

1. Go back to Railway → your service → **Variables**
2. Update `CLIENT_URL` to your Vercel URL: `https://max-connectivity-xyz.vercel.app`
3. Railway auto-redeploys — wait ~1 minute

---

## STEP 6 — TEST CHECKLIST

Open your Vercel URL and verify each step:

- [ ] **Signup**: Create account, pick a color, see the JARVIS loading screen
- [ ] **Login**: Log in with email or username
- [ ] **Search**: Go to SCAN → search for another user (open incognito and create a second account)
- [ ] **Friend Request**: Send friend request → accept in other tab
- [ ] **Open DM**: Go to COMMS → click on friend → chat opens
- [ ] **Send Message**: Type and send — appears instantly with cyan bubble
- [ ] **Typing Indicator**: Start typing in one tab — bouncing dots appear in other tab
- [ ] **Read Receipt**: ✓ turns ✓✓ when friend reads message
- [ ] **Send Meme**: Click 🎭 → meme panel slides up → tap a meme → sends instantly
- [ ] **React to Message**: Long-press a bubble → emoji picker → add reaction
- [ ] **Delete Message**: Long-press → 🗑 → "This message was deleted"
- [ ] **Profile**: Check PROFILE page — streak counter, meme count
- [ ] **PWA Install**: On mobile Chrome → 3-dot menu → "Add to Home Screen"

---

## STEP 7 — INSTALLING ON YOUR PHONE (PWA)

### Android (Chrome):
1. Open your Vercel URL in Chrome
2. Tap the 3-dot menu → "Add to Home screen"
3. Name it "MAX" → tap Add
4. Opens as a full app, no browser bar

### iPhone (Safari):
1. Open your Vercel URL in Safari
2. Tap the Share button (box with arrow)
3. Scroll down → "Add to Home Screen"
4. Tap Add

---

## ADDING NEW FEATURES (Infinitely Extensible)

The codebase is structured so every new feature is isolated:

### Add a new message type (e.g. voice notes):
1. `backend/models/Message.js` → add to type enum
2. `backend/controllers/messageController.js` → handle new type
3. `frontend/src/components/chat/MessageBubble.jsx` → render new type
4. `frontend/src/pages/chat/[convId].js` → add send button

### Add a new page:
1. Create `frontend/src/pages/newpage.js`
2. Add to BottomNav if needed: `frontend/src/components/ui/BottomNav.jsx`
3. Add route logic in `_app.js` if auth-gated

### Add a new API route:
1. Create `backend/controllers/newController.js`
2. Create `backend/routes/new.js`
3. Register in `backend/server.js`: `app.use('/api/new', newRoutes)`

### Add new memes:
1. Edit `backend/data/memes.json` — add objects with same schema
2. Run `node scripts/seedMemes.js` in Railway shell

### Week 1 ideas to add:
- Voice message recording (Web Audio API → base64 → store in Message)
- Group chats (add participants[] to a Conversation model)
- Giphy integration (replace imgflip with Giphy API)
- Message scheduling
- Custom emoji reactions (beyond the 6 hardcoded)
- Push notifications (Web Push API)
- End-to-end encryption indicator (Signal-style)

---

## TROUBLESHOOTING

### "CORS error" in browser console:
- Check Railway `CLIENT_URL` exactly matches your Vercel URL (no trailing slash)
- Redeploy Railway after updating env var

### "Socket not connecting":
- Check `NEXT_PUBLIC_SOCKET_URL` in Vercel matches Railway URL (no `/api` at end)
- Check Railway logs for socket.io initialization

### "Cannot find module" on Railway:
- Make sure Root Directory is set to `backend` in Railway settings
- Check `package.json` `start` script is `"node server.js"`

### Memes not showing:
- Run the seed script in Railway shell: `node scripts/seedMemes.js`
- Verify MongoDB connection is working (check Railway logs)

### "Authentication error" after login:
- JWT_SECRET must be the same value before and after redeploy
- Clear localStorage in browser (DevTools → Application → Local Storage → Clear)

---

## ENVIRONMENT VARIABLES SUMMARY

### Backend (Railway):
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-here
NODE_ENV=production
CLIENT_URL=https://your-app.vercel.app
```

### Frontend (Vercel):
```
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app/api
NEXT_PUBLIC_SOCKET_URL=https://your-backend.up.railway.app
```

---

Built with ❤️ — MAX Connectivity v2.0 // JARVIS Protocol
