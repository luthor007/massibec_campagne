import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const dbConnect = (await import('../src/lib/mongodb.js')).default;
const User = (await import('../src/models/User.js')).default;

async function listUsers() {
    try {
        await dbConnect();
        console.log('Connected to MongoDB');
        const users = await User.find({}).sort({ createdAt: -1 }).limit(5);
        console.log('Last 5 users:');
        users.forEach(u => {
            console.log(`- ${u.email} (Verified: ${u.emailVerified})`);
        });
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

listUsers();
