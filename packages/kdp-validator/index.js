/**
 * @anointed-pages/kdp-validator
 * 
 * KDP compliance validation engine.
 * Exports the validation functions from the existing implementation.
 */

// Re-export from existing location during migration
// TODO: Move validation logic here from backend/engine/validate/kdp.js

module.exports = {
  validateKDP: require('../../backend/engine/validate/kdp').validateKDP,
  validateStructure: require('../../backend/engine/validate/kdp').validateStructure,
  validateEpubCompliance: require('../../backend/engine/validate/kdp').validateEpubCompliance,
  validateTypography: require('../../backend/engine/validate/kdp').validateTypography,
  validatePrintRules: require('../../backend/engine/validate/kdp').validatePrintRules,
  generateWarnings: require('../../backend/engine/validate/kdp').generateWarnings
};

