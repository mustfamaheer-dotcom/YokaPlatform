/**
 * Generates an authentic, valid EAN-13 barcode with correct Modulo-10 checksum digit.
 * Default prefix 622 (GS1 Egypt).
 */
export function generateValidEAN13(prefix = '622') {
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
