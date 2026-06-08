const express = require('express');
const cors = require('cors');
require('dotenv').config();

const testRoutes = require('./routes/testRoutes');
const questionRoutes = require('./routes/questionRoutes');
const attemptRoutes = require('./routes/attemptRoutes');

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

// Root check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', database: 'connected' });
});

// Mount Routes
app.use('/api/tests', testRoutes);
// Nest question routes under tests, e.g. /api/tests/:testId/questions
app.use('/api/tests/:testId/questions', questionRoutes);
app.use('/api/attempts', attemptRoutes);

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
