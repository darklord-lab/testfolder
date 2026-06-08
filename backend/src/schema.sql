-- Create database tables for Mock Test Portal

CREATE TABLE IF NOT EXISTS tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  duration INTEGER NOT NULL, -- in minutes
  is_published INTEGER DEFAULT 0, -- 0 = unpublished, 1 = published
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_id INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL, -- 'SINGLE', 'MULTIPLE', 'NUMERICAL'
  options TEXT NOT NULL, -- JSON string array: '["Option A", "Option B", ...]'
  image_url TEXT,
  correct_answer TEXT NOT NULL, -- JSON string representing correct answers: '[0]' or '[0,2]' or '["15.5"]'
  explanation TEXT,
  marks REAL DEFAULT 4,
  negative_marks REAL DEFAULT -1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (test_id) REFERENCES tests (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_id INTEGER NOT NULL,
  student_name TEXT NOT NULL,
  score REAL NOT NULL,
  total_questions INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  wrong_count INTEGER NOT NULL,
  unattempted_count INTEGER NOT NULL,
  time_taken INTEGER NOT NULL, -- in seconds
  accuracy REAL NOT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (test_id) REFERENCES tests (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  selected_options TEXT, -- JSON string of student responses: '[0]' or '[]' or '["15.5"]'
  is_correct INTEGER NOT NULL, -- 0 = false, 1 = true
  marks_obtained REAL NOT NULL,
  FOREIGN KEY (attempt_id) REFERENCES student_attempts (id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE
);
