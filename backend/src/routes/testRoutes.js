const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');
const attemptController = require('../controllers/attemptController');

// Test management routes (Teacher Dashboard)
router.post('/', testController.createTest);
router.get('/', testController.getAllTests);
router.get('/:id', testController.getTestById);
router.put('/:id', testController.updateTest);
router.delete('/:id', testController.deleteTest);
router.patch('/:id/publish', testController.publishTest);

// Student start test route (Questions are stripped of answers and explanations)
router.get('/:testId/start', attemptController.startTest);

module.exports = router;
