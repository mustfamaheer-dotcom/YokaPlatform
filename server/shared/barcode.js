/**
 * Shared Barcode Utilities
 * Standard EAN-13 generation and validation with Modulo-10 checksum
 */

function generateValidEAN13(prefix = '622') {
  let code = String(prefix);
  while (code.length < 12) {
    code += Math.floor(Math.random() * 10);
  }

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return code + checkDigit;
}

function isValidEAN13(barcode) {
  if (!barcode || !/^\d{13}$/.test(String(barcode).trim())) return false;
  const str = String(barcode).trim();
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(str[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(str[12], 10);
}

module.exports = {
  generateValidEAN13,
  isValidEAN13
};
