import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const dbConnect = (await import('../src/lib/mongodb.js')).default;
const User = (await import('../src/models/User.js')).default;

async function resetPassword(email, newPassword) {
    try {
        await dbConnect();
        console.log(`Resetting password for ${email}...`);

        const user = await User.findOne({ email });
        if (!user) {
            console.error('User not found');
            process.exit(1);
        }

        const hashedPassword = bcrypt.hashSync(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        console.log('Password reset successfully');
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
    console.error('Usage: node scripts/reset-password-manual.js <email> <password>');
    process.exit(1);
}

resetPassword(email, password);
