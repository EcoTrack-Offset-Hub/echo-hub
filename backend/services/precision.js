const Decimal = require('decimal.js');
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
function decimal(value) {
  const result = new Decimal(value);
  if (!result.isFinite()) throw new Error('A finite decimal value is required.');
  return result;
}
function creditQuantity(value) {
  const d = decimal(value);
  if (d.lte(0) || d.gt('9999999999.99') || d.decimalPlaces() > 2)
    throw new Error('Credit quantity must be a positive number with at most 2 decimal places.');
  return d;
}
module.exports = { Decimal, decimal, creditQuantity };
