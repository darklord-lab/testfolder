const db = require('../config/db');

// Add a question to a test
exports.addQuestion = (req, res) => {
  const { testId } = req.params;
  const {
    question_text,
    question_type,
    options, // Array of strings, e.g., ["A", "B", "C", "D"]
    image_url,
    correct_answer, // Array containing index/indices (for MCQs) or numerical answer value: e.g., [0], [0, 2], ["4.2"]
    explanation,
    marks,
    negative_marks,
    section
  } = req.body;

  if (!question_text || !question_type || !options || !correct_answer) {
    return res.status(400).json({ error: 'Required fields: question_text, question_type, options, correct_answer' });
  }

  try {
    // Check if test exists
    const testCheck = db.query('SELECT id, marks, negative_marks FROM tests WHERE id = ?', [testId]);
    if (testCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Test not found' });
    }
    const testInfo = testCheck.rows[0];

    const marksVal = marks !== undefined ? parseFloat(marks) : (testInfo.marks !== null ? testInfo.marks : 4.0);
    const negMarksVal = negative_marks !== undefined ? parseFloat(negative_marks) : (testInfo.negative_marks !== null ? testInfo.negative_marks : -1.0);

    const result = db.query(
      `INSERT INTO questions (test_id, question_text, question_type, options, image_url, correct_answer, explanation, marks, negative_marks, section) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        testId,
        question_text,
        question_type,
        JSON.stringify(options),
        image_url || null,
        JSON.stringify(correct_answer),
        explanation || '',
        marksVal,
        negMarksVal,
        section || 'Physics'
      ]
    );

    res.status(201).json({
      message: 'Question added successfully',
      questionId: result.insertId
    });
  } catch (error) {
    console.error('Error adding question:', error);
    res.status(500).json({ error: 'Failed to add question' });
  }
};

// Update a question
exports.updateQuestion = (req, res) => {
  const { testId, questionId } = req.params;
  const {
    question_text,
    question_type,
    options,
    image_url,
    correct_answer,
    explanation,
    marks,
    negative_marks,
    section
  } = req.body;

  if (!question_text || !question_type || !options || !correct_answer) {
    return res.status(400).json({ error: 'Required fields: question_text, question_type, options, correct_answer' });
  }

  try {
    const marksVal = marks !== undefined ? parseFloat(marks) : 4;
    const negMarksVal = negative_marks !== undefined ? parseFloat(negative_marks) : -1;

    const result = db.query(
      `UPDATE questions 
       SET question_text = ?, question_type = ?, options = ?, image_url = ?, correct_answer = ?, explanation = ?, marks = ?, negative_marks = ?, section = ?
       WHERE id = ? AND test_id = ?`,
      [
        question_text,
        question_type,
        JSON.stringify(options),
        image_url || null,
        JSON.stringify(correct_answer),
        explanation || '',
        marksVal,
        negMarksVal,
        section || 'Physics',
        questionId,
        testId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Question not found for this test' });
    }

    res.json({ message: 'Question updated successfully' });
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
};

// Delete a question
exports.deleteQuestion = (req, res) => {
  const { testId, questionId } = req.params;
  try {
    const result = db.query(
      'DELETE FROM questions WHERE id = ? AND test_id = ?',
      [questionId, testId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Question not found for this test' });
    }

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
};
