const axios = require('axios');

// Use the mock admin token that's already configured in the auth middleware
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluMTIzIiwicm9sZSI6IkFETUlOIn0.8tat9J_uJaGrVUEzL9GfFV6AaKWsJp8yzLd5GQ6cKls';

const testAdminAccess = async () => {
  try {
    // Basic contest data
    const contestData = {
      name: 'Admin Created Contest',
      description: 'This is a test contest created by an admin',
      entryFee: 100,
      maxParticipants: 10,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(), // 1 day later
      prizePool: 900,
      contestType: 'PAID',
      prizeDistribution: [
        { rank: 1, amount: 500 },
        { rank: 2, amount: 300 },
        { rank: 3, amount: 100 }
      ],
      isPublished: true
    };

    // Make the API call with admin token
    console.log('Making request to create a contest with admin token...');
    console.log('Using token:', token);
    try {
      const response = await axios.post('http://localhost:9877/api/contests', contestData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

    console.log('Contest created successfully!');
    console.log('Response data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error testing admin access:');
    console.error(error.response?.data || error.message);
  }
};

testAdminAccess();
