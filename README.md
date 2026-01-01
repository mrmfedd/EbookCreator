# EbookPro - AI Manuscript Formatter

A private, single-user AI-powered manuscript formatting application designed for preparing professional books for publication. Upload your manuscript, answer a few questions, and receive a publication-ready formatted document.

## Features

- **Multi-format Upload**: Supports DOCX, PDF, TXT, and RTF files
- **AI-Powered Organization**: Automatically detects chapters, generates headers, and organizes content
- **Professional Formatting**: Applies publishing standards with justified text, proper margins, and clean styling
- **Customizable Preferences**: Choose book type, tone, chapter style, fonts, trim size, and more
- **Preview & Edit**: Review and make minor edits before export
- **Multiple Export Formats**: Export as DOCX, PDF, or EPUB

## System Requirements

- Node.js 16+ 
- npm or yarn
- OpenAI API key (optional - app includes fallback organization)

## Installation

1. **Clone or navigate to the project directory**

```bash
cd EbookPro
```

2. **Install backend dependencies**

```bash
npm install
```

3. **Install frontend dependencies**

```bash
cd client
npm install
cd ..
```

Or use the convenience script:

```bash
npm run install-all
```

4. **Set up environment variables**

Create a `.env` file in the root directory:

```bash
PORT=5000
OPENAI_API_KEY=your_openai_api_key_here
REACT_APP_API_URL=http://localhost:5000/api
```

> **Note**: The OpenAI API key is optional. If not provided, the app will use a rule-based fallback for document organization.

## Usage

1. **Start the development servers**

```bash
npm run dev
```

This starts both the backend server (port 5000) and frontend development server (port 3000).

Or run them separately:

```bash
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm run client
```

2. **Open your browser**

Navigate to `http://localhost:3000`

3. **Upload and format your manuscript**

   - Upload a DOCX, PDF, TXT, or RTF file
   - Wait for AI organization (or skip if using fallback)
   - Configure formatting preferences (or use defaults)
   - Review and edit the formatted content
   - Export in your preferred format

## Project Structure

```
EbookPro/
├── server/
│   ├── index.js                 # Express server
│   ├── services/
│   │   ├── documentProcessor.js # File text extraction
│   │   ├── aiOrganizer.js       # AI document organization
│   │   ├── formatter.js         # Formatting engine
│   │   └── exporter.js          # Export to DOCX/PDF/EPUB
│   ├── uploads/                 # Temporary upload storage
│   └── output/                  # Exported files
├── client/
│   ├── src/
│   │   ├── App.js              # Main app component
│   │   └── components/         # React components
│   └── public/
└── package.json
```

## Configuration

### Formatting Preferences

- **Book Type**: Nonfiction, Devotional, Teaching, Fiction
- **Tone**: Formal, Inspirational, Conversational, Academic
- **Chapter Style**: Numbered, Titled, or Both
- **Font Family**: Serif (Times New Roman) or Sans-serif (Arial)
- **Trim Size**: 5×8", 5.5×8.5", or 6×9"
- **Indent First Line**: Toggle paragraph indentation
- **Output Format**: DOCX, PDF, or EPUB

## API Endpoints

- `POST /api/upload` - Upload and extract text from document
- `POST /api/organize` - Organize document with AI
- `POST /api/format` - Apply formatting based on preferences
- `POST /api/export` - Export formatted document
- `GET /api/download/:filename` - Download exported file

## Technologies Used

- **Backend**: Node.js, Express
- **Frontend**: React
- **File Processing**: mammoth (DOCX), pdf-parse (PDF)
- **AI**: OpenAI API (with fallback)
- **Export**: docx, puppeteer (PDF), epub-gen-memory (EPUB)

## Production Deployment

1. **Build the frontend**

```bash
cd client
npm run build
cd ..
```

2. **Set production environment variables**

```bash
NODE_ENV=production
PORT=5000
OPENAI_API_KEY=your_key
REACT_APP_API_URL=https://your-domain.com/api
```

3. **Start the server**

```bash
npm run server
```

The server will serve the built React app from the `client/build` directory.

## Limitations & Notes

- This is designed as a **single-user, private application**
- No user authentication required
- No usage limits or credit system
- Files are stored locally (ensure adequate disk space)
- OpenAI API usage incurs costs (fallback available)

## License

MIT

## Support

For issues or questions, refer to the codebase documentation or create an issue in the repository.
