#!/usr/bin/env node

// Test script for the new dashboard manager API endpoints
const BASE_URL = 'http://localhost:3000';

async function testEndpoint(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();

    console.log(`\n📡 ${method} ${endpoint}`);
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));

    return { status: response.status, data };
  } catch (error) {
    console.error(`❌ Error testing ${endpoint}:`, error.message);
    return { status: 'ERROR', error: error.message };
  }
}

async function runTests() {
  console.log('🧪 Testing Dashboard Manager API Endpoints\n');
  console.log('=' .repeat(50));

  // Test 1: School info (should require auth)
  await testEndpoint('/api/school-info');

  // Test 2: Participants (should require auth)
  await testEndpoint('/api/participants');

  // Test 3: Campaign stats (should require auth and campaign ID)
  await testEndpoint('/api/campaigns/test-campaign-id/stats');

  // Test 4: Campaign products (should require auth and campaign ID)
  await testEndpoint('/api/campaigns/test-campaign-id/products');

  // Test 5: Campaign participants (should require auth and campaign ID)
  await testEndpoint('/api/campaigns/test-campaign-id/participants');

  console.log('\n✅ All tests completed!');
  console.log('\nNote: These endpoints require authentication.');
  console.log('To test with real data, you need to:');
  console.log('1. Log in as a school manager');
  console.log('2. Navigate to /dashboard-manager');
  console.log('3. Check the browser network tab for actual API calls');
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.log('❌ This script requires Node.js 18+ with fetch support');
  console.log('Alternatively, you can test the endpoints manually in the browser');
  process.exit(1);
}

runTests().catch(console.error);
