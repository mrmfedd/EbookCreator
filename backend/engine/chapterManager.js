const makeId = (prefix) =>
  `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

const normalizeOrder = (items) =>
  items.map((item, index) => ({ ...item, order: index + 1 }));

const addChapter = (manuscript, chapterInput = {}) => {
  if (!manuscript) {
    throw new Error('Manuscript is required');
  }
  const chapter = {
    id: makeId('chapter'),
    title: chapterInput.title || 'Untitled Chapter',
    subtitle: chapterInput.subtitle || '',
    section: chapterInput.section || 'body',
    blocks: chapterInput.blocks || [],
    order: manuscript.chapters.length + 1
  };
  manuscript.chapters.push(chapter);
  manuscript.chapters = normalizeOrder(manuscript.chapters);
  return chapter;
};

const deleteChapter = (manuscript, chapterId) => {
  if (!manuscript) {
    throw new Error('Manuscript is required');
  }
  manuscript.chapters = manuscript.chapters.filter(
    (chapter) => chapter.id !== chapterId
  );
  manuscript.chapters = normalizeOrder(manuscript.chapters);
  return manuscript.chapters;
};

const reorderChapters = (manuscript, orderedIds = []) => {
  if (!manuscript) {
    throw new Error('Manuscript is required');
  }
  const byId = new Map(manuscript.chapters.map((c) => [c.id, c]));
  const reordered = orderedIds
    .map((id) => byId.get(id))
    .filter(Boolean);
  manuscript.chapters = normalizeOrder(reordered);
  return manuscript.chapters;
};

const updateChapter = (manuscript, chapterId, updates = {}) => {
  if (!manuscript) {
    throw new Error('Manuscript is required');
  }
  const chapter = manuscript.chapters.find((item) => item.id === chapterId);
  if (!chapter) {
    throw new Error('Chapter not found');
  }
  Object.assign(chapter, {
    title: updates.title ?? chapter.title,
    subtitle: updates.subtitle ?? chapter.subtitle,
    blocks: updates.blocks ?? chapter.blocks,
    section: updates.section ?? chapter.section
  });
  return chapter;
};

module.exports = {
  addChapter,
  deleteChapter,
  reorderChapters,
  updateChapter
};
