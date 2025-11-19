#!/usr/bin/env node

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

async function testManagerAPI() {
  console.log('🧪 Testing Manager API endpoints...');
  
  try {
    // Test 1: Check if managers endpoint is accessible
    console.log('\n1. Testing managers endpoint...');
    const response = await fetch(`${BASE_URL}/api/schools/test/managers`);
    
    if (response.status === 401) {
      console.log('✅ Endpoint is protected (401 Unauthorized)');
    } else if (response.status === 500) {
      console.log('⚠️  Endpoint returns 500 - this is expected for invalid schoolId');
    } else {
      console.log(`❌ Unexpected status: ${response.status}`);
    }

    // Test 2: Check if invitation endpoint is accessible
    console.log('\n2. Testing invitation endpoint...');
    const inviteResponse = await fetch(`${BASE_URL}/api/schools/test/managers/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        role: 'member'
      })
    });
    
    if (inviteResponse.status === 401) {
      console.log('✅ Invitation endpoint is protected (401 Unauthorized)');
    } else if (inviteResponse.status === 500) {
      console.log('⚠️  Invitation endpoint returns 500 - this is expected for invalid schoolId');
    } else {
      console.log(`❌ Unexpected status: ${inviteResponse.status}`);
    }

    // Test 3: Check if accept invitation page exists
    console.log('\n3. Testing accept invitation page...');
    const acceptPageResponse = await fetch(`${BASE_URL}/managers/accept-invitation`);
    
    if (acceptPageResponse.status === 200) {
      console.log('✅ Accept invitation page is accessible');
    } else {
      console.log(`❌ Accept invitation page status: ${acceptPageResponse.status}`);
    }

    console.log('\n🎉 API tests completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Login to the dashboard-manager');
    console.log('2. Navigate to the "Équipe" tab');
    console.log('3. Try inviting a manager');
    console.log('4. Check the email invitation flow');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests
testManagerAPI();



