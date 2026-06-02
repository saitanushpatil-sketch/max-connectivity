import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        token: { label: 'Token', type: 'text' },
      },
      async authorize(credentials) {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/verify-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: credentials.token }),
          });
          const user = await res.json();
          if (res.ok && user) return user;
          return null;
        } catch { return null; }
      }
    })
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) token.user = user;
      if (account?.provider === 'google') token.googleAuth = true;
      return token;
    },
    async session({ session, token }) {
      session.user = token.user || session.user;
      return session;
    },
  },
  pages: { signIn: '/login', error: '/login' },
});
