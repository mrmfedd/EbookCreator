const validateSpans = (text, spans) => {
  const errors = [];
  const len = (text || '').length;
  (spans || []).forEach((span) => {
    if (typeof span.start !== 'number' || typeof span.end !== 'number') {
      errors.push('Span start/end must be numbers');
      return;
    }
    if (span.start < 0 || span.end > len || span.start >= span.end) {
      errors.push(`Invalid span range: ${span.start}-${span.end} for len ${len}`);
    }
    if (!span.styleId) {
      errors.push('Span styleId is required');
    }
  });
  return errors;
};

module.exports = { validateSpans };
