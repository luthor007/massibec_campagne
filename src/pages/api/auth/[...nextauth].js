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

        if (!user) {
          throw new Error('EMAIL_NOT_FOUND');
        }

        // Check if this is an auto-login attempt with a magic token
        if (credentials.password === 'MAGIC_LOGIN_TOKEN' && credentials.loginToken) {
          // Verify the login token
          if (user.loginToken && user.loginToken === credentials.loginToken &&
            user.loginTokenExpires && user.loginTokenExpires > Date.now()) {
            // Don't clear the token immediately - allow multiple devices to use it within expiration window
            // The token will expire naturally after 5 minutes
            // Note: We increment a use counter to track usage
            user.loginTokenUsed = (user.loginTokenUsed || 0) + 1;
            await user.save();

            return { id: user._id, email: user.email, school: user.school, name: user.name, role: user.role, telephone: user.parentInfo?.telephone, schoolManagerInfo: user.schoolManagerInfo, supplierManagerInfo: user.supplierManagerInfo, distributorInfo: user.distributorInfo, emailVerified: user.emailVerified };
          } else {
            throw new Error('INVALID_LOGIN_TOKEN');
          }
        }

        // Normal password login
        if (!bcrypt.compareSync(credentials.password, user.password)) {
          throw new Error('INVALID_PASSWORD');
        }

        return { id: user._id, email: user.email, school: user.school, name: user.name, role: user.role, telephone: user.parentInfo?.telephone, schoolManagerInfo: user.schoolManagerInfo, supplierManagerInfo: user.supplierManagerInfo, distributorInfo: user.distributorInfo, emailVerified: user.emailVerified }; // Role included
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
        token.sub = user.id; // Ensure token.sub is set for API compatibility
        token.role = user.role; // Store role in the token
        token.telephone = user.telephone; // Store telephone in the token
        token.school = user.school;
        token.schoolManagerInfo = user.schoolManagerInfo;
        token.supplierManagerInfo = user.supplierManagerInfo;
        token.distributorInfo = user.distributorInfo;
        token.emailVerified = user.emailVerified;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role; // Pass role to the session
      session.user.school = token.school;
      session.user.schoolManagerInfo = token.schoolManagerInfo;
      session.user.supplierManagerInfo = token.supplierManagerInfo;
      session.user.distributorInfo = token.distributorInfo;
      session.user.emailVerified = token.emailVerified;

      // Ensure parentInfo is defined
      session.user.parentInfo = session.user.parentInfo || {};
      session.user.parentInfo.telephone = token.telephone; // Pass telephone to the session
      session.user.schoolManagerInfo = session.user.schoolManagerInfo || {};
      session.user.supplierManagerInfo = session.user.supplierManagerInfo || {};
      session.user.distributorInfo = session.user.distributorInfo || {};

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
