#!/usr/bin/env node

/**
 * Script to manually verify email addresses for testing
 * Usage: node scripts/verify-email.js <email_address>
 * Example: node scripts/verify-email.js test@example.com
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Import dbConnect and User model
const dbConnect = (await import('../src/lib/mongodb.js')).default;
const User = (await import('../src/models/User.js')).default;

async function verifyEmail(email) {
  try {
    // Connect to MongoDB using the existing connection function
    await dbConnect();
    console.log('✓ Connected to MongoDB');

    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      console.error(`❌ User with email "${email}" not found`);
      process.exit(1);
    }

    console.log(`✓ Found user: ${user.name} (${user.email})`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Current verification status: ${user.emailVerified ? '✓ Verified' : '✗ Not verified'}`);

    // Verify email
    user.emailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;

    // Generate login token for auto-login
    const crypto = await import('crypto');
    const loginToken = crypto.randomBytes(32).toString('hex');
    const loginTokenExpires = Date.now() + 5 * 60 * 1000; // Valid for 5 minutes

    user.loginToken = loginToken;
    user.loginTokenExpires = loginTokenExpires;

    await user.save();

    console.log('✓ Email verified successfully!');
    console.log(`✓ Login token generated: ${loginToken}`);
    console.log(`✓ Login token expires in: 5 minutes`);
    console.log('\n📧 You can now:');
    console.log(`   1. Log in directly at: /connexion`);
    console.log(`   2. Or use the auto-login URL (if implemented):`);
    console.log(`      /email-verified?token=${loginToken}&userId=${user._id}&name=${encodeURIComponent(user.name)}`);

    // Close connection
    const mongoose = await import('mongoose');
    await mongoose.default.connection.close();
    console.log('\n✓ Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    try {
      const mongoose = await import('mongoose');
      await mongoose.default.connection.close();
    } catch (closeError) {
      // Ignore close errors
    }
    process.exit(1);
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('Usage: node scripts/verify-email.js <email_address>');
  console.error('Example: node scripts/verify-email.js test@example.com');
  process.exit(1);
}

// Run the verification
verifyEmail(email);
