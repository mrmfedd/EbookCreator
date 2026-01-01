const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

class AIOrganizer {
  async organizeDocument(text) {
    if (!process.env.OPENAI_API_KEY) {
      // Fallback to rule-based organization if no API key
      return this.organizeFallback(text);
    }

    try {
      const prompt = `You are a professional book editor. Analyze the following manuscript text and organize it into a structured document with:

1. Chapter breaks (detect natural chapter transitions)
2. Chapter titles (extract or generate appropriate titles)
3. Section headers (identify major sections within chapters)
4. Subheaders (identify subsections)
5. Proper paragraph breaks
6. Convert lists into properly formatted bullet or numbered lists
7. Clean up any formatting inconsistencies

Return the organized content in JSON format with this structure:
{
  "chapters": [
    {
      "title": "Chapter Title or Chapter 1",
      "sections": [
        {
          "header": "Section Header (optional)",
          "subsections": [
            {
              "subheader": "Subheader (optional)",
              "content": "Paragraph text here"
            }
          ],
          "content": "Direct paragraph content (if no subsections)"
        }
      ],
      "lists": [
        {
          "type": "bullet" or "numbered",
          "items": ["item 1", "item 2"]
        }
      ]
    }
  ]
}

Manuscript text:
${text.substring(0, 15000)}${text.length > 15000 ? '\n\n[Text truncated for processing...]' : ''}

Return ONLY valid JSON, no additional text.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional book editor specializing in manuscript organization. Always return valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000
      });

      const content = response.choices[0].message.content.trim();
      
      // Try to extract JSON from response
      let jsonContent = content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonContent = jsonMatch[0];
      }

      const organized = JSON.parse(jsonContent);
      return organized;
    } catch (error) {
      console.error('AI organization error:', error);
      // Fallback to rule-based organization
      return this.organizeFallback(text);
    }
  }

  organizeFallback(text) {
    // Rule-based fallback organization
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const chapters = [];
    let currentChapter = null;
    let currentSection = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Detect chapter breaks (lines that are ALL CAPS, or start with "Chapter", or are very short standalone lines)
      const isChapterTitle = (
        line.toUpperCase() === line && 
        line.length > 3 && 
        line.length < 100 &&
        !line.match(/^[A-Z][a-z]/) // Not sentence case
      ) || line.match(/^Chapter\s+\d+/i) || line.match(/^Chapter\s+[IVX]+/i);

      if (isChapterTitle && (!currentChapter || currentChapter.sections.length > 0)) {
        if (currentChapter) chapters.push(currentChapter);
        currentChapter = {
          title: line,
          sections: []
        };
        currentSection = null;
        continue;
      }

      // Detect section headers (short lines, often ending without period, in title case)
      const isSectionHeader = (
        line.length < 100 &&
        !line.endsWith('.') &&
        !line.endsWith(',') &&
        !line.match(/^[a-z]/) && // Starts with capital
        line.split(' ').length < 10
      );

      if (isSectionHeader && currentChapter) {
        if (currentSection && currentSection.content) {
          currentChapter.sections.push(currentSection);
        }
        currentSection = {
          header: line,
          content: ''
        };
        continue;
      }

      // Regular content
      if (!currentChapter) {
        currentChapter = {
          title: 'Chapter 1',
          sections: []
        };
        currentSection = {
          content: ''
        };
      }

      if (!currentSection) {
        currentSection = {
          content: ''
        };
      }

      if (currentSection.content) {
        currentSection.content += ' ' + line;
      } else {
        currentSection.content = line;
      }
    }

    // Add final section and chapter
    if (currentSection && currentChapter) {
      currentChapter.sections.push(currentSection);
    }
    if (currentChapter) {
      chapters.push(currentChapter);
    }

    // If no chapters detected, create one chapter with all content
    if (chapters.length === 0) {
      chapters.push({
        title: 'Chapter 1',
        sections: [{
          content: text
        }]
      });
    }

    return { chapters };
  }
}

module.exports = new AIOrganizer();
