-- Create database tables for Mock Test Portal

CREATE TABLE IF NOT EXISTS tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  duration INTEGER NOT NULL, -- in minutes
  is_published INTEGER DEFAULT 0, -- 0 = unpublished, 1 = published
  marks REAL DEFAULT 4.0,
  negative_marks REAL DEFAULT -1.0,
  randomize_questions INTEGER DEFAULT 0, -- 0 = no, 1 = yes
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_id INTEGER, -- Nullable to allow general bulk upload
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'SINGLE',
  options TEXT, -- JSON options (nullable)
  image_url TEXT,
  correct_answer TEXT, -- JSON correct answers (nullable)
  explanation TEXT,
  marks REAL DEFAULT 4,
  negative_marks REAL DEFAULT -1,
  section TEXT DEFAULT 'Physics',
  
  -- New Excel & PDF Bulk Upload Columns
  exam TEXT,
  subject TEXT,
  chapter TEXT,
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  correct_option TEXT,
  difficulty TEXT,
  year INTEGER,
  
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

CREATE TABLE IF NOT EXISTS teachers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  roll_number TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO teachers (id, name, username, password) VALUES (1, 'Test Teacher', 'teacher', 'password123');
INSERT OR IGNORE INTO students (id, name, roll_number, username, password) VALUES (1, 'Soham Nandanwar', 'VU1F2122', 'soham', 'password123');
