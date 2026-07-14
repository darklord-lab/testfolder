const db = require('../config/db');

exports.login = (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Username, password, and role are required' });
  }

  try {
    if (role === 'admin') {
      if (username === 'mahakal' && password === 'mahakal@123') {
        return res.json({
          success: true,
          user: {
            name: 'Administrator',
            username: 'mahakal',
            role: 'admin'
          }
        });
      } else {
        return res.status(401).json({ error: 'Invalid admin credentials' });
      }
    }

    if (role === 'teacher') {
      const result = db.query(
        'SELECT id, name, username FROM teachers WHERE username = ? AND password = ?',
        [username, password]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid teacher credentials' });
      }

      const teacher = result.rows[0];
      return res.json({
        success: true,
        user: {
          id: teacher.id,
          name: teacher.name,
          username: teacher.username,
          role: 'teacher'
        }
      });
    }

    if (role === 'student') {
      const result = db.query(
        'SELECT id, name, username, roll_number FROM students WHERE username = ? AND password = ?',
        [username, password]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid student credentials' });
      }

      const student = result.rows[0];
      return res.json({
        success: true,
        user: {
          id: student.id,
          name: student.name,
          username: student.username,
          rollNumber: student.roll_number,
          role: 'student'
        }
      });
    }

    return res.status(400).json({ error: 'Invalid role specified' });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Internal server error occurred during login' });
  }
};
