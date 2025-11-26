#!/usr/bin/env node
/**
 * Script to create a super admin account
 * 
 * Usage: node scripts/create-super-admin.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models
const User = require('../src/models/User').default;
const AdminManager = require('../src/models/AdminManager').default;

const ADMIN_EMAIL = 'alexis.massicotte@icloud.com';
const ADMIN_PASSWORD = '123ALEXIS$!';
const ADMIN_NAME = 'Alexis Massicotte';

async function createSuperAdmin() {
    try {
        console.log('\n🔐 ========================================');
        console.log('   CREATE SUPER ADMIN ACCOUNT');
        console.log('   ========================================\n');

        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }

        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB\n');

        // Check if admin already exists
        const existingUser = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });

        if (existingUser) {
            console.log(`⚠️  User with email ${ADMIN_EMAIL} already exists.`);
            console.log('   Updating to admin role...\n');

            // Update existing user to admin
            existingUser.role = 'admin';
            existingUser.emailVerified = true;

            // Update password
            const hashedPassword = bcrypt.hashSync(ADMIN_PASSWORD, 10);
            existingUser.password = hashedPassword;

            await existingUser.save();
            console.log('✅ User updated to admin role with new password\n');

            // Check if AdminManager record exists
            let adminManager = await AdminManager.findOne({ user: existingUser._id });

            if (!adminManager) {
                // Create AdminManager record
                adminManager = new AdminManager({
                    user: existingUser._id,
                    role: 'owner',
                    invitedBy: existingUser._id, // Self-invited for primary admin
                    status: 'active',
                    joinedAt: new Date()
                });
                await adminManager.save();
                console.log('✅ AdminManager record created\n');
            } else {
                // Update existing AdminManager to owner
                adminManager.role = 'owner';
                adminManager.status = 'active';
                await adminManager.save();
                console.log('✅ AdminManager record updated to owner\n');
            }
        } else {
            // Create new admin user
            console.log(`📝 Creating new admin account for ${ADMIN_EMAIL}...\n`);

            const hashedPassword = bcrypt.hashSync(ADMIN_PASSWORD, 10);

            const newUser = new User({
                email: ADMIN_EMAIL.toLowerCase(),
                password: hashedPassword,
                name: ADMIN_NAME,
                role: 'admin',
                emailVerified: true, // Auto-verify for super admin
                profileCompleted: true
            });

            await newUser.save();
            console.log('✅ Admin user created\n');

            // Create AdminManager record
            const adminManager = new AdminManager({
                user: newUser._id,
                role: 'owner',
                invitedBy: newUser._id, // Self-invited for primary admin
                status: 'active',
                joinedAt: new Date()
            });
            await adminManager.save();
            console.log('✅ AdminManager record created\n');
        }

        console.log('📊 Admin Account Details:');
        console.log('   Email:', ADMIN_EMAIL);
        console.log('   Password:', ADMIN_PASSWORD);
        console.log('   Role: admin (owner)');
        console.log('   Email Verified: true');
        console.log('\n✅ Super admin account ready!');
        console.log('   Login at: /connexion');
        console.log('   Will redirect to: /admin-jappuie-dashboard\n');

    } catch (error) {
        console.error('❌ Error creating super admin:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('✅ Database connection closed\n');
    }
}

createSuperAdmin();

