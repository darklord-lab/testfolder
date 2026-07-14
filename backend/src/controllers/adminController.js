const db = require('../config/db');

// List all teachers
exports.getAllTeachers = (req, res) => {
  try {
    const result = db.query('SELECT id, name, username, password, created_at FROM teachers ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
};

// Add a teacher
exports.addTeacher = (req, res) => {
  const { name, username, password } = req.body;
  if (!name || !username || !password) {
    return res.status(400).json({ error: 'Name, username, and password are required' });
  }

  try {
    // Check if username already exists in teachers or students
    const checkTeacher = db.query('SELECT id FROM teachers WHERE username = ?', [username]);
    const checkStudent = db.query('SELECT id FROM students WHERE username = ?', [username]);
    if (checkTeacher.rows.length > 0 || checkStudent.rows.length > 0 || username === 'mahakal') {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    db.query(
      'INSERT INTO teachers (name, username, password) VALUES (?, ?, ?)',
      [name.trim(), username.trim().toLowerCase(), password]
    );

    res.status(201).json({ success: true, message: 'Teacher added successfully' });
  } catch (error) {
    console.error('Error adding teacher:', error);
    res.status(500).json({ error: 'Failed to add teacher' });
  }
};

// Remove a teacher
exports.deleteTeacher = (req, res) => {
  const { id } = req.params;
  try {
    const result = db.query('DELETE FROM teachers WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    res.json({ success: true, message: 'Teacher deleted successfully' });
  } catch (error) {
    console.error('Error deleting teacher:', error);
    res.status(500).json({ error: 'Failed to delete teacher' });
  }
};

// List all students
exports.getAllStudents = (req, res) => {
  try {
    const result = db.query('SELECT id, name, roll_number, username, password, created_at FROM students ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
};

// Add a student
exports.addStudent = (req, res) => {
  const { name, roll_number, username, password } = req.body;
  if (!name || !roll_number || !username || !password) {
    return res.status(400).json({ error: 'Name, roll number, username, and password are required' });
  }

  try {
    // Check if username is taken
    const checkTeacher = db.query('SELECT id FROM teachers WHERE username = ?', [username]);
    const checkStudent = db.query('SELECT id FROM students WHERE username = ?', [username]);
    if (checkTeacher.rows.length > 0 || checkStudent.rows.length > 0 || username === 'mahakal') {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    // Check if roll number is taken
    const checkRoll = db.query('SELECT id FROM students WHERE roll_number = ?', [roll_number]);
    if (checkRoll.rows.length > 0) {
      return res.status(400).json({ error: 'Roll Number is already taken' });
    }

    db.query(
      'INSERT INTO students (name, roll_number, username, password) VALUES (?, ?, ?, ?)',
      [name.trim(), roll_number.trim().toUpperCase(), username.trim().toLowerCase(), password]
    );

    res.status(201).json({ success: true, message: 'Student added successfully' });
  } catch (error) {
    console.error('Error adding student:', error);
    res.status(500).json({ error: 'Failed to add student' });
  }
};

// Remove a student
exports.deleteStudent = (req, res) => {
  const { id } = req.params;
  try {
    const result = db.query('DELETE FROM students WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: 'Failed to delete student' });
  }
};

// Fetch distinct chapter-wise question sets in the Question Bank pool
exports.getChapterSets = (req, res) => {
  try {
    const result = db.query(`
      SELECT exam, subject, chapter, COUNT(*) AS question_count
      FROM questions
      WHERE test_id IS NULL
      GROUP BY exam, subject, chapter
      ORDER BY exam ASC, subject ASC, chapter ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching chapter sets:', error);
    res.status(500).json({ error: 'Failed to fetch chapter sets' });
  }
};

// Delete all questions for a given exam, subject, and chapter set in the bank
exports.deleteChapterSet = (req, res) => {
  const { exam, subject, chapter } = req.query;
  if (!exam || !subject || !chapter) {
    return res.status(400).json({ error: 'Exam, subject, and chapter parameters are required' });
  }
  try {
    const result = db.query(
      'DELETE FROM questions WHERE test_id IS NULL AND exam = ? AND subject = ? AND chapter = ?',
      [exam, subject, chapter]
    );
    res.json({ success: true, message: `Successfully deleted ${result.affectedRows} questions from chapter '${chapter}' set.` });
  } catch (error) {
    console.error('Error deleting chapter set:', error);
    res.status(500).json({ error: 'Failed to delete chapter set' });
  }
};
