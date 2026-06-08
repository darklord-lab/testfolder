const db = require('../config/db');

// Create a new Mock Test
exports.createTest = (req, res) => {
  const { name, duration } = req.body;
  if (!name || !duration) {
    return res.status(400).json({ error: 'Test name and duration are required' });
  }

  try {
    const result = db.query(
      'INSERT INTO tests (name, duration, is_published) VALUES (?, ?, 0)',
      [name, parseInt(duration, 10)]
    );
    res.status(201).json({
      message: 'Test created successfully',
      testId: result.insertId
    });
  } catch (error) {
    console.error('Error creating test:', error);
    res.status(500).json({ error: 'Failed to create test' });
  }
};

// Get all tests
// Supports query: ?published=true to list only published tests for students
exports.getAllTests = (req, res) => {
  const publishedOnly = req.query.published === 'true';
  
  try {
    let queryText = `
      SELECT t.*, 
             (SELECT COUNT(*) FROM questions q WHERE q.test_id = t.id) as question_count,
             (SELECT COUNT(*) FROM student_attempts sa WHERE sa.test_id = t.id) as attempt_count
      FROM tests t
    `;
    
    const params = [];
    if (publishedOnly) {
      queryText += ' WHERE t.is_published = 1';
    }
    
    queryText += ' ORDER BY t.created_at DESC';
    
    const result = db.query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tests:', error);
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
};

// Get a single test (including questions for edit/preview)
exports.getTestById = (req, res) => {
  const { id } = req.params;
  try {
    const testResult = db.query('SELECT * FROM tests WHERE id = ?', [id]);
    if (testResult.rows.length === 0) {
      return res.status(404).json({ error: 'Test not found' });
    }

    const test = testResult.rows[0];
    
    // Fetch all questions for this test
    const questionsResult = db.query(
      'SELECT * FROM questions WHERE test_id = ? ORDER BY id ASC',
      [id]
    );

    // Parse options and correct answers JSON
    const questions = questionsResult.rows.map(q => ({
      ...q,
      options: JSON.parse(q.options),
      correct_answer: JSON.parse(q.correct_answer)
    }));

    res.json({ ...test, questions });
  } catch (error) {
    console.error('Error fetching test:', error);
    res.status(500).json({ error: 'Failed to fetch test details' });
  }
};

// Update test metadata (name, duration)
exports.updateTest = (req, res) => {
  const { id } = req.params;
  const { name, duration } = req.body;
  if (!name || !duration) {
    return res.status(400).json({ error: 'Test name and duration are required' });
  }

  try {
    const result = db.query(
      'UPDATE tests SET name = ?, duration = ? WHERE id = ?',
      [name, parseInt(duration, 10), id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Test not found' });
    }

    res.json({ message: 'Test updated successfully' });
  } catch (error) {
    console.error('Error updating test:', error);
    res.status(500).json({ error: 'Failed to update test' });
  }
};

// Delete a test and all its questions/attempts (cascade handled by foreign keys)
exports.deleteTest = (req, res) => {
  const { id } = req.params;
  try {
    const result = db.query('DELETE FROM tests WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Test not found' });
    }
    res.json({ message: 'Test deleted successfully' });
  } catch (error) {
    console.error('Error deleting test:', error);
    res.status(500).json({ error: 'Failed to delete test' });
  }
};

// Publish or Unpublish a test
exports.publishTest = (req, res) => {
  const { id } = req.params;
  const { is_published } = req.body;
  
  if (is_published === undefined) {
    return res.status(400).json({ error: 'is_published value is required' });
  }

  const publishStatus = is_published ? 1 : 0;

  try {
    // If publishing, ensure there is at least 1 question
    if (publishStatus === 1) {
      const qCountResult = db.query('SELECT COUNT(*) as count FROM questions WHERE test_id = ?', [id]);
      if (qCountResult.rows[0].count === 0) {
        return res.status(400).json({ error: 'Cannot publish a test with zero questions' });
      }
    }

    const result = db.query(
      'UPDATE tests SET is_published = ? WHERE id = ?',
      [publishStatus, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Test not found' });
    }

    res.json({ 
      message: `Test ${publishStatus === 1 ? 'published' : 'unpublished'} successfully`,
      is_published: publishStatus === 1
    });
  } catch (error) {
    console.error('Error updating publish status:', error);
    res.status(500).json({ error: 'Failed to update publish status' });
  }
};
