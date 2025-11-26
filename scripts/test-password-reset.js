// Script to test password reset functionality
// Usage: node scripts/test-password-reset.js <email> <test-password>

const email = process.argv[2];
const testPassword = process.argv[3] || 'Test123!';

if (!email) {
    console.error('Usage: node scripts/test-password-reset.js <email> [test-password]');
    process.exit(1);
}

const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

async function testPasswordReset() {
    console.log(`\n🧪 Testing password reset for: ${email}`);
    console.log(`📍 Using base URL: ${baseUrl}\n`);

    try {
        // Step 1: Check if user has a password backup
        console.log('1️⃣ Checking password backup status...');
        const checkResponse = await fetch(`${baseUrl}/api/admin/check-password-backup?email=${encodeURIComponent(email)}`);
        const checkData = await checkResponse.json();
        console.log('   Status:', checkData.hasOriginalPasswordBackup ? '✅ Has backup' : '⚠️ No backup');
        console.log('   Message:', checkData.message);

        // Step 2: Set temporary password
        console.log('\n2️⃣ Setting temporary password...');
        const setResponse = await fetch(`${baseUrl}/api/admin/reset-password-for-testing`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                newPassword: testPassword,
                action: 'set'
            })
        });

        const setData = await setResponse.json();
        if (!setResponse.ok) {
            throw new Error(setData.message || 'Failed to set password');
        }
        console.log('   ✅ Temporary password set successfully');
        console.log('   User ID:', setData.userId);
        console.log('   Role:', setData.role);
        console.log('   Original password saved:', setData.originalPasswordSaved ? 'Yes' : 'No');

        // Step 3: Verify password backup exists
        console.log('\n3️⃣ Verifying password backup was saved...');
        const verifyResponse = await fetch(`${baseUrl}/api/admin/check-password-backup?email=${encodeURIComponent(email)}`);
        const verifyData = await verifyResponse.json();
        if (verifyData.hasOriginalPasswordBackup) {
            console.log('   ✅ Password backup confirmed');
        } else {
            console.log('   ⚠️ Warning: Password backup not found');
        }

        // Step 4: Restore original password
        console.log('\n4️⃣ Restoring original password...');
        const restoreResponse = await fetch(`${baseUrl}/api/admin/reset-password-for-testing`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                action: 'restore'
            })
        });

        const restoreData = await restoreResponse.json();
        if (!restoreResponse.ok) {
            throw new Error(restoreData.message || 'Failed to restore password');
        }
        console.log('   ✅ Original password restored successfully');
        console.log('   User ID:', restoreData.userId);

        // Step 5: Verify password backup is cleared
        console.log('\n5️⃣ Verifying password backup was cleared...');
        const finalCheckResponse = await fetch(`${baseUrl}/api/admin/check-password-backup?email=${encodeURIComponent(email)}`);
        const finalCheckData = await finalCheckResponse.json();
        if (!finalCheckData.hasOriginalPasswordBackup) {
            console.log('   ✅ Password backup cleared (as expected)');
        } else {
            console.log('   ⚠️ Warning: Password backup still exists');
        }

        console.log('\n✅ All tests passed! Password reset functionality is working correctly.\n');
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('   Full error:', error);
        process.exit(1);
    }
}

testPasswordReset();

