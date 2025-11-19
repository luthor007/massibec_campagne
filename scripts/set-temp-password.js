// Script to set a temporary password for testing
// Usage: 
//   Set: node scripts/set-temp-password.js <email> set <password>
//   Restore: node scripts/set-temp-password.js <email> restore

const email = process.argv[2];
const action = process.argv[3]; // 'set' or 'restore'
const password = process.argv[4] || 'Test123!';

if (!email || !action) {
    console.error('Usage:');
    console.error('  Set temporary password: node scripts/set-temp-password.js <email> set [password]');
    console.error('  Restore original password: node scripts/set-temp-password.js <email> restore');
    process.exit(1);
}

const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

async function setTempPassword() {
    try {
        if (action === 'set') {
            console.log(`\n🔐 Setting temporary password for: ${email}`);
            console.log(`   Temporary password: ${password}\n`);

            const response = await fetch(`${baseUrl}/api/admin/reset-password-for-testing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    newPassword: password,
                    action: 'set'
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to set password');
            }

            console.log('✅ Temporary password set successfully!');
            console.log(`   User ID: ${data.userId}`);
            console.log(`   Role: ${data.role}`);
            console.log(`   Original password saved: ${data.originalPasswordSaved ? 'Yes' : 'No'}`);
            console.log(`\n📝 You can now login with:`);
            console.log(`   Email: ${email}`);
            console.log(`   Password: ${password}`);
            console.log(`\n⚠️  Remember to restore the original password after testing!`);
            console.log(`   Run: node scripts/set-temp-password.js ${email} restore\n`);

        } else if (action === 'restore') {
            console.log(`\n🔙 Restoring original password for: ${email}\n`);

            const response = await fetch(`${baseUrl}/api/admin/reset-password-for-testing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    action: 'restore'
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to restore password');
            }

            console.log('✅ Original password restored successfully!');
            console.log(`   User ID: ${data.userId}`);
            console.log(`   Role: ${data.role}`);
            console.log(`\n✅ User can now login with their original password.\n`);

        } else {
            console.error(`❌ Invalid action: ${action}`);
            console.error('   Use "set" or "restore"');
            process.exit(1);
        }
    } catch (error) {
        console.error(`\n❌ Error: ${error.message}`);
        process.exit(1);
    }
}

setTempPassword();


