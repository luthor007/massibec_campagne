// API endpoint to test inscription-manager functionality
import dbConnect from '../../lib/mongodb';
import User from '../../models/User';
import School from '../../models/School';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      console.log('Testing inscription-manager environment...');
      
      // Test database connection
      await dbConnect();
      console.log('✅ Database connection successful');
      
      // Test environment variables
      const envVars = {
        MONGODB_URI: process.env.MONGODB_URI ? '✅ Set' : '❌ Missing',
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '✅ Set' : '❌ Missing',
        NEXTAUTH_URL: process.env.NEXTAUTH_URL ? '✅ Set' : '❌ Missing',
        EMAIL_PROVIDER: process.env.EMAIL_PROVIDER ? '✅ Set' : '❌ Missing',
        SENDGRID_API_KEY: process.env.SENDGRID_API_KEY ? '✅ Set' : '❌ Missing',
        NODE_ENV: process.env.NODE_ENV || 'development'
      };
      
      // Test models
      const userCount = await User.countDocuments();
      const schoolCount = await School.countDocuments();
      
      res.status(200).json({
        status: 'success',
        message: 'Inscription-manager environment test',
        environment: envVars,
        database: {
          connected: true,
          userCount,
          schoolCount
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Test error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Environment test failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
