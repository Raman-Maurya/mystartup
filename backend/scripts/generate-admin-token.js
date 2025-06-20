// Simple script to create a JWT token for the admin user

// Get admin ID from command line arguments or use the one we created
const adminId = process.argv[2] || '683a80ee8b71711796f2c59d';

// Create a simple token
// In a real system, don't hardcode secrets like this
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
              Buffer.from(JSON.stringify({id: adminId, role: 'ADMIN'})).toString('base64') +
              '.dummy_signature';

console.log('Admin JWT Token:');
console.log(token);
console.log('\nUse this token in your Authorization header like:');
console.log('Authorization: Bearer ' + token);
console.log('\nFor testing admin contest creation, you can use:');
console.log(`curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer ${token}" -d "{\\"name\\":\\"Test Contest\\",\\"description\\":\\"Admin created contest\\",\\"entryFee\\":100,\\"maxParticipants\\":10,\\"startDate\\":\\"2025-06-01T12:00:00Z\\",\\"endDate\\":\\"2025-06-02T12:00:00Z\\",\\"prizePool\\":900,\\"contestType\\":\\"PAID\\",\\"prizeDistribution\\":[{\\"rank\\":1,\\"amount\\":500},{\\"rank\\":2,\\"amount\\":300},{\\"rank\\":3,\\"amount\\":100}],\\"isPublished\\":true}" http://localhost:9877/api/contests`);

// For the simplicity of testing, let's use the hardcoded mock admin token
// that's already set up in the auth middleware
const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluMTIzIiwicm9sZSI6IkFETUlOIn0.8tat9J_uJaGrVUEzL9GfFV6AaKWsJp8yzLd5GQ6cKls';

console.log('\nFor development, you can use this mock admin token:');
console.log(mockToken);

console.log('\nYou can also use the test-admin-token.js script to test admin access:');
console.log('node backend/scripts/test-admin-token.js');
