const crypto = require('crypto');

/**
 * Simulated pharmacy API adapter.
 * Sends a prescription to the pharmacy and returns a simulated response.
 * @param {object} prescription - The prescription document
 * @returns {Promise<object>} Simulated pharmacy response
 */
function sendToPharmacy(prescription) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        status: 'received',
        pharmacyRefId: crypto.randomBytes(8).toString('hex'),
        receivedAt: new Date()
      });
    }, 500);
  });
}

module.exports = { sendToPharmacy };
