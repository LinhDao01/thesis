/**
 * Script để test kết nối giữa frontend và backend
 * Chạy: node test-connection.js
 */

const BACKEND_URL = 'http://localhost:3000';

async function testConnection() {
  console.log('🔍 Testing Backend Connection...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthRes = await fetch(`${BACKEND_URL}/api/v1/health`);
    const healthData = await healthRes.json();
    console.log('   ✅ Health check:', healthData);
  } catch (error) {
    console.log('   ❌ Health check failed:', error.message);
    return;
  }

  try {
    // Test 2: Login endpoint
    console.log('\n2. Testing login endpoint...');
    const loginRes = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@example.com',
        password: '123456'
      })
    });
    const loginData = await loginRes.json();
    if (loginRes.ok && loginData.status === 'success') {
      console.log('   ✅ Login successful:', {
        hasToken: !!loginData.data?.token,
        user: loginData.data?.user
      });
    } else {
      console.log('   ⚠️  Login response:', loginData);
    }
  } catch (error) {
    console.log('   ❌ Login test failed:', error.message);
  }

  try {
    // Test 3: Register endpoint
    console.log('\n3. Testing register endpoint...');
    const registerRes = await fetch(`${BACKEND_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test${Date.now()}@example.com`,
        password: '123456',
        name: 'Test User'
      })
    });
    const registerData = await registerRes.json();
    if (registerRes.ok && registerData.status === 'success') {
      console.log('   ✅ Register successful:', {
        hasToken: !!registerData.data?.token,
        user: registerData.data?.user
      });
    } else {
      console.log('   ⚠️  Register response:', registerData);
    }
  } catch (error) {
    console.log('   ❌ Register test failed:', error.message);
  }

  // Test 4: CORS
  console.log('\n4. Testing CORS...');
  try {
    const corsRes = await fetch(`${BACKEND_URL}/api/v1/health`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET'
      }
    });
    console.log('   ✅ CORS preflight:', corsRes.status);
  } catch (error) {
    console.log('   ⚠️  CORS test:', error.message);
  }

  console.log('\n✨ Connection test completed!');
  console.log('\n📝 Summary:');
  console.log(`   Backend URL: ${BACKEND_URL}`);
  console.log('   Frontend should run on: http://localhost:5173');
  console.log('   Frontend will proxy /api requests to backend');
}

// Run test
testConnection().catch(console.error);








