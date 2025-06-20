import axios from 'axios';

/**
 * Mock Payment Service
 * This is a temporary implementation until Razorpay integration is completed
 */

// Load Razorpay script
export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    // We're mocking this function since Razorpay isn't fully integrated yet
    console.log('Mock: Loading Razorpay script');
    resolve(true);
  });
};

// Create a deposit order
export const createDepositOrder = async (amount) => {
  try {
    const response = await axios.post('/api/payments/deposit', { amount });
    return response.data;
  } catch (error) {
    console.error('Error creating deposit order:', error);
    throw error;
  }
};

// Create a contest entry order
export const createContestEntryOrder = async (contestId) => {
  try {
    const response = await axios.post(`/api/payments/contest-entry/${contestId}`);
    return response.data;
  } catch (error) {
    console.error('Error creating contest entry order:', error);
    throw error;
  }
};

// Process payment - simulating Razorpay checkout flow
export const processPayment = async (orderData, paymentType = 'deposit') => {
  // For now, since Razorpay isn't fully integrated, we'll use a mock success flow
  
  console.log(`Mock: Processing ${paymentType} payment`);
  
  // In a real implementation, this would open the Razorpay checkout
  // and handle the payment completion and verification
  
  // Simulate successful payment
  const paymentId = `mock_pay_${Date.now()}`;
  
  // Verify the payment based on type
  if (paymentType === 'deposit') {
    try {
      const response = await axios.post('/api/payments/deposit/verify', {
        razorpay_order_id: orderData.id,
        razorpay_payment_id: paymentId,
        razorpay_signature: 'mock_signature' // In real implementation, this would come from Razorpay
      });
      return response.data;
    } catch (error) {
      console.error('Error verifying deposit payment:', error);
      throw error;
    }
  } else if (paymentType === 'contest-entry') {
    try {
      const response = await axios.post('/api/payments/contest-entry/verify', {
        razorpay_order_id: orderData.id,
        razorpay_payment_id: paymentId,
        razorpay_signature: 'mock_signature' // In real implementation, this would come from Razorpay
      });
      return response.data;
    } catch (error) {
      console.error('Error verifying contest entry payment:', error);
      throw error;
    }
  }
  
  throw new Error('Unknown payment type');
};

// Get payment history
export const getPaymentHistory = async () => {
  try {
    const response = await axios.get('/api/payments/history');
    return response.data;
  } catch (error) {
    console.error('Error fetching payment history:', error);
    throw error;
  }
}; 