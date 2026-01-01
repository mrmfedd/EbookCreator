const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
require('dotenv').config();

const documentProcessor = require('./services/documentProcessor');
const aiOrganizer = require('./services/aiOrganizer');
const formatter = require('./services/formatter');
const exporter = require('./services/exporter');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
const outputDir = path.join(__dirname, 'output');
fs.ensureDirSync(uploadsDir);
fs.ensureDirSync(outputDir);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.docx', '.pdf', '.txt', '.rtf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only DOCX, PDF, TXT, and RTF files are allowed.'));
    }
  }
});

// Routes
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Processing file:', req.file.originalname);
    
    // Extract text from uploaded file
    const extractedText = await documentProcessor.extractText(req.file.path);
    
    // Clean up uploaded file
    await fs.remove(req.file.path);
    
    res.json({ 
      success: true,
      text: extractedText,
      originalFilename: req.file.originalname
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/organize', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    console.log('Organizing document with AI...');
    
    // Use AI to organize the document
    const organized = await aiOrganizer.organizeDocument(text);
    
    res.json({ 
      success: true,
      organized: organized
    });
  } catch (error) {
    console.error('Organization error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/format', async (req, res) => {
  try {
    const { organizedContent, preferences } = req.body;
    
    if (!organizedContent) {
      return res.status(400).json({ error: 'No content provided' });
    }

    console.log('Formatting document...');
    
    // Apply formatting based on preferences
    const formatted = await formatter.formatDocument(organizedContent, preferences || {});
    
    res.json({ 
      success: true,
      formatted: formatted
    });
  } catch (error) {
    console.error('Formatting error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/export', async (req, res) => {
  try {
    const { formattedContent, preferences, format } = req.body;
    
    if (!formattedContent || !format) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    console.log('Exporting document as', format);
    
    const filename = await exporter.exportDocument(formattedContent, preferences, format);
    
    res.json({ 
      success: true,
      filename: filename,
      downloadUrl: `/api/download/${filename}`
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(outputDir, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  res.download(filePath, (err) => {
    if (err) {
      console.error('Download error:', err);
      res.status(500).json({ error: 'Error downloading file' });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
