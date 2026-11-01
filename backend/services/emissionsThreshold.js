const { decimal } = require('./precision');

function validateLimit(value) {
  if (value === null) return null;
  if (!['string', 'number'].includes(typeof value) || String(value).trim() === '')
    throw new Error('Enter a positive monthly limit, or leave it blank to disable warnings.');
  const limit = decimal(value);
  if (limit.lte(0) || limit.gte('10000000000000') || limit.decimalPlaces() > 11)
    throw new Error('Monthly limit must be positive, with up to 13 integer digits and 11 decimal places.');
  return limit.toFixed();
}

function emissionsThreshold(limit, grossTonnes, isMonthly) {
  const result = { limitTonnes: limit === null || limit === undefined ? null : String(limit), warningAtPercent: 80, alertAtPercent: 100, usedPercent: null, remainingTonnes: null, status: 'not_configured' };
  if (result.limitTonnes === null) return result;
  if (!isMonthly) return { ...result, status: 'select_month' };
  const amount = decimal(grossTonnes);
  const target = decimal(limit);
  return {
    ...result,
    usedPercent: amount.div(target).times(100).toDecimalPlaces(2).toNumber(),
    remainingTonnes: target.minus(amount).toFixed(),
    status: amount.gte(target) ? 'exceeded' : amount.gte(target.times('0.8')) ? 'warning' : 'normal',
  };
}
module.exports = { validateLimit, emissionsThreshold };
