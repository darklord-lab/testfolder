const express = require('express');
const router = express.Router({ mergeParams: true }); // Enable mergeParams to get testId from parent router
const questionController = require('../controllers/questionController');

router.post('/', questionController.addQuestion);
router.put('/:questionId', questionController.updateQuestion);
router.delete('/:questionId', questionController.deleteQuestion);

module.exports = router;
