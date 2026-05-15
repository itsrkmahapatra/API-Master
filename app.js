const express = require('express');

const app = express();
app.use(express.json());

// Routes
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

module.exports = app;
