const db = require('../config/db');

// Create a new Mock Test
exports.createTest = (req, res) => {
  const { name, duration, marks, negative_marks, randomize_questions } = req.body;
  if (!name || !duration) {
    return res.status(400).json({ error: 'Test name and duration are required' });
  }

  const marksVal = marks !== undefined ? parseFloat(marks) : 4.0;
  const negMarksVal = negative_marks !== undefined ? parseFloat(negative_marks) : -1.0;
  const randomizeVal = randomize_questions !== undefined ? parseInt(randomize_questions, 10) : 0;

  try {
    const result = db.query(
      'INSERT INTO tests (name, duration, is_published, marks, negative_marks, randomize_questions) VALUES (?, ?, 0, ?, ?, ?)',
      [name, parseInt(duration, 10), marksVal, negMarksVal, randomizeVal]
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
  const { name, duration, randomize_questions } = req.body;
  if (!name || !duration) {
    return res.status(400).json({ error: 'Test name and duration are required' });
  }

  const randomizeVal = randomize_questions !== undefined ? parseInt(randomize_questions, 10) : 0;

  try {
    const result = db.query(
      'UPDATE tests SET name = ?, duration = ?, randomize_questions = ? WHERE id = ?',
      [name, parseInt(duration, 10), randomizeVal, id]
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

// Automatically generate custom mock test from the pool
exports.generateCustomTest = (req, res) => {
  const { id: testId } = req.params;
  const { exam, subject, chapters, totalQuestions } = req.body;

  if (!exam || !subject || !totalQuestions) {
    return res.status(400).json({ error: 'Exam, subject, and totalQuestions are required' });
  }

  try {
    // 1. Fetch test details to get default marks/negative_marks
    const testCheck = db.query('SELECT marks, negative_marks FROM tests WHERE id = ?', [testId]);
    if (testCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Test not found' });
    }

    const test = testCheck.rows[0];
    const testMarks = test.marks !== null && test.marks !== undefined ? parseFloat(test.marks) : 4.0;
    const testNegMarks = test.negative_marks !== null && test.negative_marks !== undefined ? parseFloat(test.negative_marks) : -1.0;

    // 2. Query random matching hard questions from the general pool
    let queryText = 'SELECT * FROM questions WHERE difficulty = \'hard\' AND subject = ?';
    const params = [subject];

    queryText += ' AND (exam LIKE ? OR exam = ?)';
    params.push(`%${exam}%`, exam);

    if (chapters && chapters.length > 0) {
      const placeholders = chapters.map(() => '?').join(',');
      queryText += ` AND chapter IN (${placeholders})`;
      params.push(...chapters);
    }

    queryText += ' ORDER BY RANDOM() LIMIT ?';
    params.push(parseInt(totalQuestions, 10));

    const matchResult = db.query(queryText, params);
    const questions = matchResult.rows;

    if (questions.length === 0) {
      return res.status(404).json({ error: 'No matching questions found in the question bank pool.' });
    }

    // 3. Insert copied questions into the target test
    db.query('BEGIN TRANSACTION;');
    let inserted = 0;
    try {
      for (const q of questions) {
        // Map subject to mock test portal standard "section" parameter
        let section = 'Physics';
        const subLower = q.subject ? q.subject.toLowerCase() : '';
        if (subLower.includes('chem')) {
          section = 'Chemistry';
        } else if (subLower.includes('math') || subLower.includes('calculus') || subLower.includes('algebra')) {
          section = 'Mathematics';
        } else if (subLower.includes('bio') || subLower.includes('botany') || subLower.includes('zoology')) {
          section = 'Biology';
        } else {
          section = q.subject || 'Physics';
        }

        db.query(`
          INSERT INTO questions (
            test_id, exam, subject, chapter, question_text, option_a, option_b, option_c, option_d, 
            correct_option, difficulty, year, explanation, options, correct_answer, question_type, section,
            marks, negative_marks
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          testId,
          q.exam,
          q.subject,
          q.chapter,
          q.question_text,
          q.option_a,
          q.option_b,
          q.option_c,
          q.option_d,
          q.correct_option,
          q.difficulty,
          q.year,
          q.explanation,
          q.options,
          q.correct_answer,
          q.question_type || 'SINGLE',
          section,
          testMarks,
          testNegMarks
        ]);
        inserted++;
      }
      db.query('COMMIT;');
    } catch (insertErr) {
      db.query('ROLLBACK;');
      throw insertErr;
    }

    res.json({
      success: true,
      message: `Successfully generated custom test with ${inserted} matching difficult questions from the pool.`,
      inserted
    });

  } catch (error) {
    console.error('Error generating custom test:', error);
    res.status(500).json({ error: 'Failed to generate custom test: ' + error.message });
  }
};
