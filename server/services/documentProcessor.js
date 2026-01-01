const mammoth = require('mammoth');
const pdf = require('pdf-parse');
const fs = require('fs-extra');
const path = require('path');

class DocumentProcessor {
  async extractText(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    try {
      switch (ext) {
        case '.docx':
          return await this.extractFromDocx(filePath);
        case '.pdf':
          return await this.extractFromPdf(filePath);
        case '.txt':
          return await this.extractFromTxt(filePath);
        case '.rtf':
          return await this.extractFromRtf(filePath);
        default:
          throw new Error(`Unsupported file type: ${ext}`);
      }
    } catch (error) {
      throw new Error(`Error extracting text: ${error.message}`);
    }
  }

  async extractFromDocx(filePath) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return this.cleanText(result.value);
    } catch (error) {
      throw new Error(`Error reading DOCX file: ${error.message}`);
    }
  }

  async extractFromPdf(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdf(dataBuffer);
      return this.cleanText(data.text);
    } catch (error) {
      throw new Error(`Error reading PDF file: ${error.message}`);
    }
  }

  async extractFromTxt(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return this.cleanText(content);
    } catch (error) {
      throw new Error(`Error reading TXT file: ${error.message}`);
    }
  }

  async extractFromRtf(filePath) {
    try {
      // RTF is complex, basic text extraction
      const content = await fs.readFile(filePath, 'utf-8');
      // Remove RTF control codes (basic approach)
      const text = content
        .replace(/\\[a-z]+\d*\s?/gi, ' ')
        .replace(/\{[^}]*\}/g, ' ')
        .replace(/\s+/g, ' ');
      return this.cleanText(text);
    } catch (error) {
      throw new Error(`Error reading RTF file: ${error.message}`);
    }
  }

  cleanText(text) {
    // Preserve paragraph breaks (double newlines)
    // Remove excessive whitespace but keep paragraph structure
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim();
  }
}

module.exports = new DocumentProcessor();
