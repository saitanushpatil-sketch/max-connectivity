// This file is intentionally empty.
// Google OAuth is handled client-side via Google Identity Services.
// See components/auth/GoogleLoginButton.jsx
export default function handler(req, res) {
  res.status(404).json({ error: 'NextAuth is not used. Use Google Identity Services.' });
}
