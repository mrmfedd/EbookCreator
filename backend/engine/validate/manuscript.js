const validateManuscript = (manuscript) => {
  const warnings = [];
  const errors = [];

  if (!manuscript) return { errors: ['Manuscript missing'], warnings };
  if (!manuscript.title) warnings.push('Missing book title');
  if (!manuscript.metadata?.author) warnings.push('Missing author');

  const chapters = manuscript.chapters || [];
  if (chapters.length === 0) errors.push('No chapters found');

  chapters.forEach((chapter) => {
    if (!chapter.title) warnings.push(`Chapter ${chapter.id} missing title`);
    (chapter.blocks || []).forEach((block) => {
      if (!block.styleId) errors.push(`Block ${block.id} missing styleId`);
      if (typeof block.text !== 'string') errors.push(`Block ${block.id} missing text`);
    });
  });

  return { errors, warnings };
};

const validateToc = (manuscript) => {
  const warnings = [];
  const errors = [];
  const chapters = (manuscript?.chapters || []).slice().sort((a, b) => a.order - b.order);
  if (chapters.length === 0) return { errors: ['No chapters for TOC'], warnings };
  const titles = chapters.map((c) => c.title || '').filter(Boolean);
  if (titles.length !== chapters.length) warnings.push('Some chapters missing titles for TOC');
  return { errors, warnings };
};

module.exports = { validateManuscript, validateToc };

