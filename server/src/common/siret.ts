// Luhn checksum — same algorithm used to validate French SIREN/SIRET registry
// numbers. Catches transposed/mistyped digits a format-only `/^\d{14}$/` regex lets through.
export function isValidSiret(value: string): boolean {
  if (!/^\d{14}$/.test(value)) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let digit = Number(value[13 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}
