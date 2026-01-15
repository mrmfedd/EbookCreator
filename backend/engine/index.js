const ManuscriptStore = require('./manuscriptStore');
const schemas = require('./schema');
const { importIDML } = require('./idmlImport');
const { renderEbook } = require('./render/ebook');
const { renderPrint, KDP_PRESETS } = require('./render/print');
const { exportEpub } = require('./export/epub');
const { exportPrintPdf } = require('./export/pdf');
const { exportPrintPdfPro } = require('./export/pdfPro');
const { exportDocxInDesignSafe } = require('./export/docx');
const { exportIdmlStub } = require('./export/idml');
const { exportIdmlRoundTrip } = require('./export/idmlRoundTrip');
const { validateEpub } = require('./validate/epub');
const { validateManuscript, validateToc } = require('./validate/manuscript');
const { validatePrint } = require('./validate/print');
const { validateKDP } = require('./validate/kdp');
const styleMapping = require('./styleMapping');

const store = new ManuscriptStore();

const createManuscript = (data) => store.createManuscript(data);
const getManuscript = (id) => store.getManuscript(id);
const addChapter = (manuscriptId, chapterInput) =>
  store.addChapter(manuscriptId, chapterInput);
const deleteChapter = (manuscriptId, chapterId) =>
  store.deleteChapter(manuscriptId, chapterId);
const reorderChapters = (manuscriptId, orderedIds) =>
  store.reorderChapters(manuscriptId, orderedIds);
const updateChapter = (manuscriptId, chapterId, updates) =>
  store.updateChapter(manuscriptId, chapterId, updates);
const listStyles = (manuscriptId) => store.listStyles(manuscriptId);
const addStyle = (manuscriptId, styleInput) =>
  store.addStyle(manuscriptId, styleInput);
const updateStyle = (manuscriptId, styleId, updates) =>
  store.updateStyle(manuscriptId, styleId, updates);
const updateBlock = (manuscriptId, chapterId, blockId, updates) =>
  store.updateBlock(manuscriptId, chapterId, blockId, updates);

module.exports = {
  schemas,
  importIDML,
  renderEbook,
  renderPrint,
  KDP_PRESETS,
  exportEpub,
  exportPrintPdf,
  exportPrintPdfPro,
  exportDocxInDesignSafe,
  exportIdmlStub,
  exportIdmlRoundTrip,
  validateEpub,
  validateManuscript,
  validateToc,
  validatePrint,
  validateKDP,
  styleMapping,
  createManuscript,
  getManuscript,
  addChapter,
  deleteChapter,
  reorderChapters,
  updateChapter,
  listStyles,
  addStyle,
  updateStyle,
  updateBlock
};
