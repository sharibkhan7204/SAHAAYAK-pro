const db = require('../database/db');

async function getCommissionSettings() {
  const settingRow = await db.get('SELECT value_json FROM system_settings WHERE key = ?', ['commission_settings']);
  if (settingRow && settingRow.value_json) {
    try {
      return JSON.parse(settingRow.value_json);
    } catch (e) {
      // fallback
    }
  }
  return {
    threshold_amount: 599,
    commission_percentage: 10.0,
    exclude_parts: true,
    exclude_tips: true
  };
}

/**
 * Calculates platform commission and worker net earnings based on fair business rules.
 * 
 * @param {number} labourAmount - Service/labour amount
 * @param {number} partsAmount - Parts and materials amount (excluded from commission)
 * @param {number} tipAmount - Tip amount (100% to worker, excluded from commission)
 * @returns {object} { commissionAmount, commissionRate, ruleApplied, workerNetEarnings }
 */
async function calculateCommission(labourAmount = 0, partsAmount = 0, tipAmount = 0) {
  const settings = await getCommissionSettings();
  const threshold = Number(settings.threshold_amount || 599);
  const rate = Number(settings.commission_percentage || 10.0);

  const labour = Math.max(0, Number(labourAmount) || 0);
  const parts = Math.max(0, Number(partsAmount) || 0);
  const tip = Math.max(0, Number(tipAmount) || 0);

  let commissionAmount = 0;
  let ruleApplied = '';

  if (labour <= threshold) {
    commissionAmount = 0;
    ruleApplied = `Fair Worker Protection: ₹0 commission on service/labour amount ₹${labour.toFixed(2)} (<= threshold of ₹${threshold})`;
  } else {
    commissionAmount = Math.round(((labour * rate) / 100) * 100) / 100;
    ruleApplied = `Standard Platform Fee: ${rate}% applied on service/labour amount ₹${labour.toFixed(2)} (exceeds ₹${threshold})`;
  }

  // Worker net earnings = (Labour - Commission) + Parts + 100% Tips
  const workerNetEarnings = Math.round(((labour - commissionAmount) + parts + tip) * 100) / 100;

  return {
    threshold,
    commissionRate: labour <= threshold ? 0 : rate,
    commissionAmount,
    ruleApplied,
    workerNetEarnings,
    partsAmount: parts,
    tipAmount: tip,
    labourAmount: labour
  };
}

module.exports = {
  getCommissionSettings,
  calculateCommission
};
