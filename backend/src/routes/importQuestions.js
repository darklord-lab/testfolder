const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const pdfParse = require('pdf-parse');
const db = require('../config/db');

// Multer memory storage configuration (doesn't save file to disk)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /xlsx|xls|pdf/;
    const mimetype = filetypes.test(file.mimetype) || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls') || file.originalname.endsWith('.pdf');
    if (mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only Excel (.xlsx, .xls) and PDF (.pdf) files are allowed!'));
  }
});

// GET Template Excel Endpoint
router.get('/import-questions/template', (req, res) => {
  try {
    const wb = xlsx.utils.book_new();
    const data = [
      ["Exam", "Subject", "Chapter", "Question Text", "Option A", "Option B", "Option C", "Option D", "Correct Option", "Difficulty", "Year", "Explanation"],
      ["Instructions: Skip this row. Insert questions from row 3. correct_option must be only a, b, c, or d.", "", "", "", "", "", "", "", "", "", "", ""],
      ["JEE Advanced", "Physics", "Mechanics", "What is the acceleration due to gravity on Earth?", "9.8 m/s²", "10 m/s²", "1.6 m/s²", "0 m/s²", "a", "medium", 2026, "The standard acceleration due to gravity on Earth is approximately 9.8 m/s²."]
    ];
    const ws = xlsx.utils.aoa_to_sheet(data);
    xlsx.utils.book_append_sheet(wb, ws, "Questions Template");
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=questions_template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error('Error generating template:', err);
    res.status(500).json({ success: false, message: 'Failed to generate template' });
  }
});

// GET All Questions (Question Bank) Endpoint
router.get('/questions', (req, res) => {
  try {
    const { exam, subject, chapter } = req.query;
    let queryText = 'SELECT * FROM questions WHERE 1=1';
    const params = [];

    if (exam) {
      queryText += ' AND exam LIKE ?';
      params.push(`%${exam}%`);
    }
    if (subject) {
      queryText += ' AND subject = ?';
      params.push(subject);
    }
    if (chapter) {
      queryText += ' AND chapter LIKE ?';
      params.push(`%${chapter}%`);
    }

    queryText += ' ORDER BY id DESC';

    const result = db.query(queryText, params);
    
    const formatted = result.rows.map(q => {
      let options = [];
      let correct_answer = [];
      try {
        options = q.options ? JSON.parse(q.options) : [q.option_a, q.option_b, q.option_c, q.option_d];
      } catch (e) {
        options = [q.option_a, q.option_b, q.option_c, q.option_d];
      }
      try {
        correct_answer = q.correct_answer ? JSON.parse(q.correct_answer) : [];
      } catch (e) {
        correct_answer = [];
      }
      return {
        ...q,
        options,
        correct_answer
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// Import Questions Endpoint
router.post('/import-questions', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  // Retrieve optional default values from request body
  const defaultExam = req.body.exam || '';
  const defaultSubject = req.body.subject || '';
  const defaultChapter = req.body.chapter || '';
  const defaultDifficulty = req.body.difficulty || 'medium';
  const defaultYear = req.body.year ? parseInt(req.body.year, 10) : null;
  const forceMetadata = req.body.forceMetadata === 'true' || req.body.forceMetadata === true;
  const testId = req.body.testId ? parseInt(req.body.testId, 10) : (req.query.testId ? parseInt(req.query.testId, 10) : null);

  let testMarks = 4.0;
  let testNegMarks = -1.0;
  if (testId) {
    const testCheck = db.query('SELECT marks, negative_marks FROM tests WHERE id = ?', [testId]);
    if (testCheck.rows && testCheck.rows.length > 0) {
      const t = testCheck.rows[0];
      if (t.marks !== null && t.marks !== undefined) {
        testMarks = parseFloat(t.marks);
      }
      if (t.negative_marks !== null && t.negative_marks !== undefined) {
        testNegMarks = parseFloat(t.negative_marks);
      }
    }
  }

  const errors = [];
  let inserted = 0;
  let skipped = 0;
  const questionsToInsert = [];

  try {
    const filename = req.file.originalname.toLowerCase();
    
    if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      // --- Excel Parsing ---
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

      if (rows.length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Excel file is empty or does not have enough rows (Header row 1, Instructions row 2, Data row 3+).'
        });
      }

      // Read Header Row (Row 1, Index 0) to map columns dynamically
      const headerRow = rows[0] || [];
      const normalizedHeaders = headerRow.map(h => (h || '').toString().trim().toLowerCase().replace(/[\s_-]/g, ''));

      const fieldIndices = {
        exam: normalizedHeaders.indexOf('exam'),
        subject: normalizedHeaders.indexOf('subject'),
        chapter: normalizedHeaders.indexOf('chapter'),
        question_text: normalizedHeaders.findIndex(h => h === 'questiontext' || h === 'question' || h === 'questiontext'),
        option_a: normalizedHeaders.findIndex(h => h === 'optiona' || h === 'a'),
        option_b: normalizedHeaders.findIndex(h => h === 'optionb' || h === 'b'),
        option_c: normalizedHeaders.findIndex(h => h === 'optionc' || h === 'c'),
        option_d: normalizedHeaders.findIndex(h => h === 'optiond' || h === 'd'),
        correct_option: normalizedHeaders.findIndex(h => h === 'correctoption' || h === 'correct' || h === 'correctans' || h === 'correctanswer'),
        difficulty: normalizedHeaders.indexOf('difficulty'),
        year: normalizedHeaders.indexOf('year'),
        explanation: normalizedHeaders.indexOf('explanation')
      };

      // Helper to fetch value from row, falling back to positional index if header not matched
      const getRowValue = (row, field) => {
        const idx = fieldIndices[field];
        if (idx !== undefined && idx !== -1) {
          return row[idx];
        }
        // Positional defaults:
        // 0: exam, 1: subject, 2: chapter, 3: question_text, 4: option_a, 5: option_b, 6: option_c, 7: option_d, 8: correct_option, 9: difficulty, 10: year, 11: explanation
        const defaults = {
          exam: 0, subject: 1, chapter: 2, question_text: 3,
          option_a: 4, option_b: 5, option_c: 6, option_d: 7,
          correct_option: 8, difficulty: 9, year: 10, explanation: 11
        };
        return row[defaults[field]];
      };

      // Loop through data rows (Row 3 onwards, Index 2 onwards)
      for (let i = 2; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue; // Skip completely empty rows

        // Check if row has any content to avoid registering trailing empty Excel rows
        const hasContent = row.some(cell => cell !== null && cell !== undefined && cell.toString().trim() !== '');
        if (!hasContent) continue;

        const excelRowNumber = i + 1; // Row number in Excel is 1-indexed

        // Extract values
        const exam = (forceMetadata && defaultExam ? defaultExam : (getRowValue(row, 'exam') || defaultExam || '')).toString().trim();
        const subject = (forceMetadata && defaultSubject ? defaultSubject : (getRowValue(row, 'subject') || defaultSubject || '')).toString().trim();
        const chapter = (forceMetadata && defaultChapter ? defaultChapter : (getRowValue(row, 'chapter') || defaultChapter || '')).toString().trim();
        const question_text = (getRowValue(row, 'question_text') || '').toString().trim();
        const option_a = (getRowValue(row, 'option_a') || '').toString().trim();
        const option_b = (getRowValue(row, 'option_b') || '').toString().trim();
        const option_c = (getRowValue(row, 'option_c') || '').toString().trim();
        const option_d = (getRowValue(row, 'option_d') || '').toString().trim();
        const correct_option_raw = (getRowValue(row, 'correct_option') || '').toString().trim().toLowerCase();
        const difficulty = (forceMetadata && defaultDifficulty ? defaultDifficulty : (getRowValue(row, 'difficulty') || defaultDifficulty || 'medium')).toString().trim().toLowerCase();
        
        let year = null;
        if (forceMetadata && defaultYear !== null) {
          year = defaultYear;
        } else {
          const yearVal = getRowValue(row, 'year');
          if (yearVal !== undefined && yearVal !== null && yearVal !== '') {
            year = parseInt(yearVal, 10);
          } else {
            year = defaultYear;
          }
        }

        const explanation = (getRowValue(row, 'explanation') || '').toString().trim();

        // Required field validation
        const missingFields = [];
        if (!exam) missingFields.push('exam');
        if (!subject) missingFields.push('subject');
        if (!chapter) missingFields.push('chapter');
        if (!question_text) missingFields.push('question_text');
        if (!option_a) missingFields.push('option_a');
        if (!option_b) missingFields.push('option_b');
        if (!option_c) missingFields.push('option_c');
        if (!option_d) missingFields.push('option_d');
        if (!correct_option_raw) missingFields.push('correct_option');

        if (missingFields.length > 0) {
          skipped++;
          errors.push(`Row ${excelRowNumber}: Missing required field(s): ${missingFields.join(', ')}`);
          continue;
        }

        // Correct option validation
        if (!['a', 'b', 'c', 'd'].includes(correct_option_raw)) {
          skipped++;
          errors.push(`Row ${excelRowNumber}: correct_option must be a, b, c, or d (got: "${correct_option_raw}")`);
          continue;
        }

        questionsToInsert.push({
          exam, subject, chapter, question_text,
          option_a, option_b, option_c, option_d,
          correct_option: correct_option_raw, difficulty, year, explanation
        });
      }

    } else if (filename.endsWith('.pdf')) {
      // --- PDF Parsing ---
      const pdfData = await pdfParse(req.file.buffer);
      const text = pdfData.text;

      if (!text || text.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'PDF file is empty or text could not be extracted.'
        });
      }

      const lines = text.split(/\r?\n/);
      let currentQuestion = null;
      let currentField = 'question_text';

      // Track active dynamic headers from PDF
      let activeExam = defaultExam;
      let activeSubject = defaultSubject;
      let activeChapter = defaultChapter;
      let activeDifficulty = defaultDifficulty;
      let activeYear = defaultYear;

      const saveCurrentQuestion = () => {
        if (!currentQuestion) return;

        // Apply fallback/forced metadata values
        currentQuestion.exam = forceMetadata && defaultExam ? defaultExam : (currentQuestion.exam || activeExam);
        currentQuestion.subject = forceMetadata && defaultSubject ? defaultSubject : (currentQuestion.subject || activeSubject);
        currentQuestion.chapter = forceMetadata && defaultChapter ? defaultChapter : (currentQuestion.chapter || activeChapter);
        currentQuestion.difficulty = forceMetadata && defaultDifficulty ? defaultDifficulty : (currentQuestion.difficulty || activeDifficulty);
        if (forceMetadata && defaultYear !== null) {
          currentQuestion.year = defaultYear;
        } else if (currentQuestion.year === null) {
          currentQuestion.year = activeYear;
        }

        // Validate
        const missingFields = [];
        if (!currentQuestion.exam) missingFields.push('exam');
        if (!currentQuestion.subject) missingFields.push('subject');
        if (!currentQuestion.chapter) missingFields.push('chapter');
        if (!currentQuestion.question_text) missingFields.push('question_text');
        if (!currentQuestion.option_a) missingFields.push('option_a');
        if (!currentQuestion.option_b) missingFields.push('option_b');
        if (!currentQuestion.option_c) missingFields.push('option_c');
        if (!currentQuestion.option_d) missingFields.push('option_d');
        if (!currentQuestion.correct_option) missingFields.push('correct_option');

        if (missingFields.length > 0) {
          skipped++;
          errors.push(`Line ${currentQuestion.lineNum} (Question ${currentQuestion.qNum || '?'}): Missing required field(s): ${missingFields.join(', ')}`);
        } else if (!['a', 'b', 'c', 'd'].includes(currentQuestion.correct_option)) {
          skipped++;
          errors.push(`Line ${currentQuestion.lineNum} (Question ${currentQuestion.qNum || '?'}): correct_option must be a, b, c, or d (got: "${currentQuestion.correct_option}")`);
        } else {
          questionsToInsert.push({
            exam: currentQuestion.exam,
            subject: currentQuestion.subject,
            chapter: currentQuestion.chapter,
            question_text: currentQuestion.question_text,
            option_a: currentQuestion.option_a,
            option_b: currentQuestion.option_b,
            option_c: currentQuestion.option_c,
            option_d: currentQuestion.option_d,
            correct_option: currentQuestion.correct_option,
            difficulty: currentQuestion.difficulty,
            year: currentQuestion.year,
            explanation: currentQuestion.explanation
          });
        }
      };

      for (let idx = 0; idx < lines.length; idx++) {
        const line = lines[idx].trim();
        if (!line) continue;

        // 1. Check for page/document metadata headers
        const examMatch = line.match(/^Exam\s*[:\-]\s*(.*)$/i);
        if (examMatch) {
          activeExam = examMatch[1].trim();
          continue;
        }
        const subjectMatch = line.match(/^Subject\s*[:\-]\s*(.*)$/i);
        if (subjectMatch) {
          activeSubject = subjectMatch[1].trim();
          continue;
        }
        const chapterMatch = line.match(/^Chapter\s*[:\-]\s*(.*)$/i);
        if (chapterMatch) {
          activeChapter = chapterMatch[1].trim();
          continue;
        }
        const diffMatch = line.match(/^Difficulty\s*[:\-]\s*(.*)$/i);
        if (diffMatch) {
          activeDifficulty = diffMatch[1].trim().toLowerCase();
          continue;
        }
        const yearMatch = line.match(/^Year\s*[:\-]\s*(.*)$/i);
        if (yearMatch) {
          activeYear = parseInt(yearMatch[1].trim(), 10) || null;
          continue;
        }

        // 2. Check for Question Start, e.g. "1. What is...", "Q12. What is...", "3) What is..."
        const qMatch = line.match(/^(?:Q|Question)?\s*(\d+)[\.\s\)]+[:\-]?\s*(.*)$/i);
        if (qMatch) {
          saveCurrentQuestion(); // Save the previous question before starting new one
          currentQuestion = {
            lineNum: idx + 1,
            qNum: qMatch[1],
            question_text: qMatch[2].trim(),
            option_a: '',
            option_b: '',
            option_c: '',
            option_d: '',
            correct_option: '',
            explanation: '',
            exam: activeExam,
            subject: activeSubject,
            chapter: activeChapter,
            difficulty: activeDifficulty,
            year: activeYear
          };
          currentField = 'question_text';
          continue;
        }

        if (!currentQuestion) continue; // Skip headers/text before first question

        // 3. Check for Inline Options, e.g., "A. OptionA B. OptionB C. OptionC D. OptionD"
        const inlineMatch = line.match(/^\(?A[\.\)\s]+(.*?)\s+B[\.\)\s]+(.*?)\s+C[\.\)\s]+(.*?)\s+D[\.\)\s]+(.*)$/i);
        if (inlineMatch) {
          currentQuestion.option_a = inlineMatch[1].trim();
          currentQuestion.option_b = inlineMatch[2].trim();
          currentQuestion.option_c = inlineMatch[3].trim();
          currentQuestion.option_d = inlineMatch[4].trim();
          currentField = 'option_d'; // If they append more lines, append to Option D or wait for answers
          continue;
        }

        // 4. Check for Single Option Lines
        const optAMatch = line.match(/^(?:\(|\[)?A(?:\)|\]|\.|\s)\s*(.*)/i);
        if (optAMatch) {
          currentQuestion.option_a = optAMatch[1].trim();
          currentField = 'option_a';
          continue;
        }
        const optBMatch = line.match(/^(?:\(|\[)?B(?:\)|\]|\.|\s)\s*(.*)/i);
        if (optBMatch) {
          currentQuestion.option_b = optBMatch[1].trim();
          currentField = 'option_b';
          continue;
        }
        const optCMatch = line.match(/^(?:\(|\[)?C(?:\)|\]|\.|\s)\s*(.*)/i);
        if (optCMatch) {
          currentQuestion.option_c = optCMatch[1].trim();
          currentField = 'option_c';
          continue;
        }
        const optDMatch = line.match(/^(?:\(|\[)?D(?:\)|\]|\.|\s)\s*(.*)/i);
        if (optDMatch) {
          currentQuestion.option_d = optDMatch[1].trim();
          currentField = 'option_d';
          continue;
        }

        // 5. Check for Correct Answer Indicator, e.g., "Answer: A" or "Ans: c"
        const ansMatch = line.match(/^(?:Ans(?:wer)?|Correct(?:\s*Option)?|Key)\s*[:\-\s]*([a-d])/i);
        if (ansMatch) {
          currentQuestion.correct_option = ansMatch[1].trim().toLowerCase();
          currentField = 'correct_option';
          continue;
        }

        // 6. Check for Explanation Indicator, e.g., "Explanation: ..." or "Exp: ..."
        const expMatch = line.match(/^(?:Explanation|Exp|Sol(?:ution)?)\s*[:\-\s]*(.*)/i);
        if (expMatch) {
          currentQuestion.explanation = expMatch[1].trim();
          currentField = 'explanation';
          continue;
        }

        // 7. Accumulate Multi-line values
        if (currentField && currentQuestion[currentField] !== undefined) {
          currentQuestion[currentField] = (currentQuestion[currentField] + ' ' + line).trim();
        }
      }

      // Save last question in PDF
      saveCurrentQuestion();
    }

    if (questionsToInsert.length === 0) {
      return res.status(200).json({
        success: true,
        inserted: 0,
        skipped,
        errors,
        message: 'No valid questions were found in the uploaded file.'
      });
    }

    // --- Bulk Insertion using transaction ---
    db.query('BEGIN TRANSACTION;');
    try {
      for (const q of questionsToInsert) {
        // Map subject to mock test portal standard "section" parameter (Physics, Chemistry, Mathematics)
        let section = 'Physics';
        const subLower = q.subject.toLowerCase();
        if (subLower.includes('chem')) {
          section = 'Chemistry';
        } else if (subLower.includes('math') || subLower.includes('calculus') || subLower.includes('algebra')) {
          section = 'Mathematics';
        } else {
          // Capitalize first letter of subject
          section = q.subject.charAt(0).toUpperCase() + q.subject.slice(1);
        }

        // Build standard options array and correct answer representation to maintain compatibility with client engine
        const optionsArray = [q.option_a, q.option_b, q.option_c, q.option_d];
        const correctIndexMap = { a: 0, b: 1, c: 2, d: 3 };
        const correctIndex = correctIndexMap[q.correct_option];
        const correctAnswersArray = [correctIndex];

        db.query(`
          INSERT INTO questions (
            test_id, exam, subject, chapter, question_text, option_a, option_b, option_c, option_d, 
            correct_option, difficulty, year, explanation, options, correct_answer, question_type, section,
            marks, negative_marks
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SINGLE', ?, ?, ?)
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
          JSON.stringify(optionsArray),
          JSON.stringify(correctAnswersArray),
          section,
          testMarks,
          testNegMarks
        ]);
        inserted++;
      }
      db.query('COMMIT;');
    } catch (insertError) {
      db.query('ROLLBACK;');
      throw insertError;
    }

    return res.status(200).json({
      success: true,
      inserted,
      skipped,
      errors,
      message: `Successfully imported ${inserted} questions.${skipped > 0 ? ` Skipped ${skipped} questions due to validation errors.` : ''}`
    });

  } catch (error) {
    console.error('Error importing questions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to parse file: ' + error.message,
      inserted: 0,
      skipped: 0,
      errors: [error.message]
    });
  }
});

// DELETE Question from Question Bank
router.delete('/questions/:id', (req, res) => {
  const { id } = req.params;
  try {
    const result = db.query('DELETE FROM questions WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }
    res.json({ success: true, message: 'Question deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// Assign Question to a Mock Test
router.put('/questions/:id/assign-test', (req, res) => {
  const { id } = req.params;
  const { test_id } = req.body;
  if (!test_id) {
    return res.status(400).json({ error: 'test_id is required' });
  }
  try {
    const result = db.query('UPDATE questions SET test_id = ? WHERE id = ?', [test_id, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }
    res.json({ success: true, message: 'Question assigned to test successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to assign question to test' });
  }
});

module.exports = router;
