const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Seed question pool on startup if not already seeded
const { seedQuestionsPool } = require('./config/seedQuestions');
seedQuestionsPool();

const testRoutes = require('./routes/testRoutes');
const questionRoutes = require('./routes/questionRoutes');
const attemptRoutes = require('./routes/attemptRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable Cross-Origin Resource Sharing (CORS) for frontend interaction
app.use(cors());

// Parse incoming requests with JSON payloads
app.use(express.json());

// Log incoming API requests for local monitoring
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Serve static uploads folder and ensure it exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// File Upload Endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});

// Root check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', database: 'connected' });
});

// Mount Routes
app.use('/api/tests', testRoutes);
// Nest question routes under tests, e.g. /api/tests/:testId/questions
app.use('/api/tests/:testId/questions', questionRoutes);
app.use('/api/attempts', attemptRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', require('./routes/importQuestions'));

// Simple global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack || err);
  res.status(500).json({ error: 'Internal server error occurred' });
});

app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`  Mock Test Portal Backend running!     `);
  console.log(`  URL: http://localhost:${PORT}        `);
  console.log(`========================================`);
});
