const express = require('express');
const router = express.Router();

// Geo routes placeholder - implement controllers when needed
// Avoid wildcard path ("*") due to path-to-regexp v6 breaking change in Express 5

router.get('/', (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Not Implemented',
    message: 'Geo endpoints are not yet implemented'
  });
});

router.post('/', (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Not Implemented',
    message: 'Geo endpoints are not yet implemented'
  });
});

// Catch-all within this router without specifying a path string
router.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: 'Geo route not found'
  });
});

module.exports = router;

