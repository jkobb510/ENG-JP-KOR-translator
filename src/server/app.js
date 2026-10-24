const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const rowsRoutes = require('./rowsRoutes');
const translationRoutes = require('./translationRoutes');
const speechRoutes = require('./speechRoutes');

const app = express();
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(bodyParser.json({ limit: '25mb' }));
app.use(express.static(path.join(__dirname, '../../dist')));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn('CORS blocked origin:', origin);
    return callback(new Error('CORS not allowed for origin: ' + origin));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

app.get('/health', (_req, res) => res.send('ok'));
app.use('/api/rows', rowsRoutes);
app.use('/translate', translationRoutes);
app.use('/pronounce', speechRoutes);

app.get(/^(?!\/(translate|pronounce|health|api)).*/, (_req, res) => {
  res.sendFile(path.join(__dirname, '../../dist', 'index.html'));
});

module.exports = app;