const express = require('express');
const router = express.Router();
const attemptController = require('../controllers/attemptController');

// Submit student answers
router.post('/submit', attemptController.submitAttempt);

// Get attempt details for review with answers & explanations
router.get('/:id', attemptController.getAttemptDetails);

// Get all student attempts for a test (Teacher Dashboard)
router.get('/test/:testId', attemptController.getAttemptsByTest);

module.exports = router;
