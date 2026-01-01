class Formatter {
  formatDocument(organizedContent, preferences = {}) {
    const {
      bookType = 'nonfiction',
      tone = 'formal',
      chapterStyle = 'numbered',
      fontFamily = 'serif',
      trimSize = '6x9',
      indentFirstLine = true
    } = preferences;

    const formatted = {
      metadata: {
        bookType,
        tone,
        chapterStyle,
        fontFamily,
        trimSize,
        indentFirstLine
      },
      chapters: organizedContent.chapters.map((chapter, index) => 
        this.formatChapter(chapter, index, preferences)
      )
    };

    return formatted;
  }

  formatChapter(chapter, index, preferences) {
    const { chapterStyle } = preferences;
    
    let title = chapter.title;
    
    // Apply chapter title styling
    if (chapterStyle === 'numbered') {
      title = `Chapter ${index + 1}`;
    } else if (chapterStyle === 'titled') {
      // Keep original title, clean it up
      title = this.cleanTitle(chapter.title);
    } else if (chapterStyle === 'both') {
      title = `Chapter ${index + 1}: ${this.cleanTitle(chapter.title)}`;
    }

    return {
      title,
      sections: chapter.sections.map(section => 
        this.formatSection(section, preferences)
      ),
      lists: chapter.lists || []
    };
  }

  formatSection(section, preferences) {
    const formatted = {
      header: section.header ? this.cleanTitle(section.header) : null,
      content: this.formatParagraphs(section.content || '', preferences),
      subsections: (section.subsections || []).map(sub => ({
        subheader: sub.subheader ? this.cleanTitle(sub.subheader) : null,
        content: this.formatParagraphs(sub.content || '', preferences)
      }))
    };

    return formatted;
  }

  formatParagraphs(text, preferences) {
    if (!text) return [];
    
    // Split into paragraphs (preserve existing breaks)
    const paragraphs = text
      .split(/\n\n+/)
      .map(p => p.trim().replace(/\s+/g, ' '))
      .filter(p => p.length > 0);

    return paragraphs;
  }

  cleanTitle(title) {
    if (!title) return '';
    
    return title
      .trim()
      .replace(/\s+/g, ' ')
      // Remove common formatting artifacts
      .replace(/^Chapter\s+\d+[:.]?\s*/i, '')
      .trim();
  }

  getFormattingStyles(preferences) {
    const { trimSize, fontFamily } = preferences;
    
    // Trim size dimensions in inches
    const trimSizes = {
      '5x8': { width: 5, height: 8 },
      '5.5x8.5': { width: 5.5, height: 8.5 },
      '6x9': { width: 6, height: 9 }
    };

    const fonts = {
      serif: 'Times New Roman, serif',
      'sans-serif': 'Arial, sans-serif'
    };

    return {
      trimSize: trimSizes[trimSize] || trimSizes['6x9'],
      fontFamily: fonts[fontFamily] || fonts.serif,
      fontSize: '12pt',
      lineHeight: '1.6',
      margin: {
        top: '1in',
        bottom: '1in',
        left: '1in',
        right: '1in'
      }
    };
  }
}

module.exports = new Formatter();
