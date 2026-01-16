/**
 * Test script for WhatsApp QR endpoints
 */

// Test 1: GET /api/settings/features
console.log('\n=== TEST 1: GET /api/settings/features ===');
console.log('Expected: Returns feature flags for tenant');
console.log('Command: curl -X GET http://51.159.170.20:3005/api/settings/features -H "Authorization: Bearer <JWT>" -H "X-Tenant: macrea"');
console.log('\nNote: Need valid JWT first\n');

// Test 2: POST /api/wa/qr/generate
console.log('\n=== TEST 2: POST /api/wa/qr/generate ===');
console.log('Expected: Returns QR code base64 image');
console.log('Prerequisites:');
console.log('- whatsapp_enabled=true in tenant_features for macrea');
console.log('- GREENAPI_INSTANCE_ID and GREENAPI_API_TOKEN in env');
console.log('\nCommand: curl -X POST http://51.159.170.20:3005/api/wa/qr/generate -H "Authorization: Bearer <JWT>" -H "X-Tenant: macrea" -H "Content-Type: application/json" -d "{}"');
console.log('\n');

// Test 3: GET /api/wa/qr/status
console.log('\n=== TEST 3: GET /api/wa/qr/status ===');
console.log('Expected: Returns connection status');
console.log('Prerequisites: QR generated in Test 2');
console.log('\nCommand: curl -X GET http://51.159.170.20:3005/api/wa/qr/status -H "Authorization: Bearer <JWT>" -H "X-Tenant: macrea"');
console.log('\n');

// Test 4: POST /api/wa/disconnect
console.log('\n=== TEST 4: POST /api/wa/disconnect ===');
console.log('Expected: Disconnects WhatsApp and removes from DB');
console.log('\nCommand: curl -X POST http://51.159.170.20:3005/api/wa/disconnect -H "Authorization: Bearer <JWT>" -H "X-Tenant: macrea" -H "Content-Type: application/json" -d "{}"');
console.log('\n');

console.log('\n=== AUTHENTICATION ===');
console.log('First get a valid JWT by logging in from the frontend at http://51.159.170.20:5173');
console.log('Then extract the JWT from localStorage in browser DevTools:');
console.log('  localStorage.getItem("jwt")');
console.log('\n');
