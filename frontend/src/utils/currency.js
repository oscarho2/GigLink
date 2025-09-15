// Utility mapping for currency symbols
const CURRENCY_SYMBOLS = {
  GBP: '£',
  USD: '$',
  EUR: '€',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$'
};

export const formatPaymentWithCurrency = (amount, currency = 'GBP') => {
  const sym = CURRENCY_SYMBOLS[currency] || '';
  if (amount == null || amount === '') return `${sym}0`;
  const numericValue = typeof amount === 'string' ? parseFloat(amount.replace(/[^\d.\-]/g, '')) : amount;
  if (isNaN(numericValue)) return `${sym}${amount}`;
  return `${sym}${numericValue}`;
};

// Backward compatible: formatPayment kept for existing usages but will try to parse the currency from string if prefixed
export const formatPayment = (payment, currency = 'GBP') => {
  if (typeof payment === 'string' && /^[£$€¥]/.test(payment)) {
    // already has a symbol, return as-is
    return payment;
  }
  return formatPaymentWithCurrency(payment, currency);
};

// Utility function to extract numeric value from payment for sorting/filtering
export const getPaymentValue = (payment) => {
  if (!payment) return 0;
  const cleanedPayment = payment.toString().replace(/[^\d.\-]/g, '');
  const numericValue = parseFloat(cleanedPayment);
  return isNaN(numericValue) ? 0 : numericValue;
};