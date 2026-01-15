const { KDP_PRESETS } = require('../render/print');

const validatePrint = ({ preset }) => {
  const warnings = [];
  const errors = [];
  if (!KDP_PRESETS[preset]) {
    warnings.push(`Unknown trim preset "${preset}", defaulting to 6x9 behavior.`);
  }
  // Minimal checks; true KDP validation requires font embedding, bleed, image DPI, etc.
  warnings.push('KDP validation is currently basic. Full KDP compliance checks are not yet implemented.');
  return { errors, warnings };
};

module.exports = { validatePrint };

