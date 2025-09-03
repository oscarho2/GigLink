// Utility function to format payment with £ symbol
export const formatPayment = (payment) => {
  if (!payment) return '£0';
  
  // If payment already starts with £, return as is
  if (typeof payment === 'string' && payment.startsWith('£')) {
    return payment;
  }
  
  // If it's a number or string number, add £ prefix
  const numericValue = typeof payment === 'string' ? parseFloat(payment) : payment;
  if (!isNaN(numericValue)) {
    return `£${numericValue}`;
  }
  
  // If it's already a formatted string without £, add £ prefix
  return `£${payment}`;
};

// Utility function to extract numeric value from payment for sorting/filtering
export const getPaymentValue = (payment) => {
  if (!payment) return 0;
  
  // Remove £ symbol, commas, and any other non-numeric characters except decimal point
  const cleanedPayment = payment.toString().replace(/[£,]/g, '');
  const numericValue = parseFloat(cleanedPayment);
  
  return isNaN(numericValue) ? 0 : numericValue;
};