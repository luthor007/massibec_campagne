import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Mot de passe", type: "password" }
      },
      async authorize(credentials) {
        await dbConnect();
        const user = await User.findOne({ email: credentials.email });
        if (user && bcrypt.compareSync(credentials.password, user.password)) {
          return { id: user._id, email: user.email, school: user.school, name: user.name, role: user.role, telephone: user.parentInfo.telephone, schoolManagerInfo: user.schoolManagerInfo, emailVerified: user.emailVerified }; // Role included
        }
        return null;
      }
    })
  ],
  session: {
    strategy: 'jwt', // or 'database' for database sessions
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role; // Store role in the token
        token.telephone = user.telephone; // Store telephone in the token
        token.school = user.school;
        token.schoolManagerInfo = user.schoolManagerInfo;
        token.emailVerified = user.emailVerified;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role; // Pass role to the session
      session.user.school = token.school;
      session.user.schoolManagerInfo = token.schoolManagerInfo;
      session.user.emailVerified = token.emailVerified;
      
      // Ensure parentInfo is defined
      session.user.parentInfo = session.user.parentInfo || {};
      session.user.parentInfo.telephone = token.telephone; // Pass telephone to the session
      session.user.schoolManagerInfo = session.user.schoolManagerInfo || {};
      
      return session;
    }
  },
  pages: {
    signIn: '/connexion',
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
};

export default NextAuth(authOptions);
