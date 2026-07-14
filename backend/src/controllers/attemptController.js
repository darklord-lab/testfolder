const db = require('../config/db');

// Start test: fetch questions without correct answers and explanations
exports.startTest = (req, res) => {
  const { testId } = req.params;
  try {
    const testResult = db.query('SELECT * FROM tests WHERE id = ?', [testId]);
    if (testResult.rows.length === 0) {
      return res.status(404).json({ error: 'Test not found' });
    }

    const test = testResult.rows[0];
    if (test.is_published !== 1) {
      return res.status(400).json({ error: 'Test is not published yet' });
    }

    // Fetch questions, excluding correct_answer and explanation
    const questionsResult = db.query(
      'SELECT id, test_id, question_text, question_type, options, image_url, marks, negative_marks, section FROM questions WHERE test_id = ? ORDER BY id ASC',
      [testId]
    );

    let questions = questionsResult.rows.map(q => ({
      ...q,
      options: JSON.parse(q.options)
    }));

    if (test.randomize_questions === 1) {
      // Fisher-Yates shuffle
      for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
      }
    }

    res.json({
      id: test.id,
      name: test.name,
      duration: test.duration,
      questions
    });
  } catch (error) {
    console.error('Error starting test:', error);
    res.status(500).json({ error: 'Failed to start test' });
  }
};

// Submit test attempt and calculate scores
exports.submitAttempt = (req, res) => {
  const { testId, studentName, timeTaken, answers, questionOrder } = req.body;
  // answers is an object: { [questionId]: [selectedOptionIndexes] or [numericalAnswerString] }

  if (!testId || !studentName || timeTaken === undefined || !answers) {
    return res.status(400).json({ error: 'Required fields: testId, studentName, timeTaken, answers' });
  }

  try {
    // 1. Fetch test details
    const testResult = db.query('SELECT * FROM tests WHERE id = ?', [testId]);
    if (testResult.rows.length === 0) {
      return res.status(404).json({ error: 'Test not found' });
    }

    // 2. Fetch all questions for this test
    const questionsResult = db.query('SELECT * FROM questions WHERE test_id = ?', [testId]);
    const questions = questionsResult.rows;

    const questionsMap = {};
    questions.forEach(q => {
      questionsMap[q.id] = q;
    });

    let score = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let unattemptedCount = 0;
    
    const processedAnswers = [];

    // Determine the order to grade and insert
    let orderedQuestionIds = [];
    if (questionOrder && Array.isArray(questionOrder) && questionOrder.length > 0) {
      orderedQuestionIds = questionOrder;
    } else {
      orderedQuestionIds = questions.map(q => q.id);
    }

    // 3. Grade each question
    orderedQuestionIds.forEach((qId) => {
      const q = questionsMap[qId];
      if (!q) return;

      const selected = answers[qId]; // Array or undefined
      const correctAns = JSON.parse(q.correct_answer); // Array
      
      let isCorrect = 0;
      let marksObtained = 0;
      let isAttempted = false;

      if (q.question_type === 'SINGLE' || q.question_type === 'MULTIPLE') {
        // For MCQs, check if student selected anything
        if (selected && Array.isArray(selected) && selected.length > 0) {
          isAttempted = true;
        }
      } else if (q.question_type === 'NUMERICAL') {
        // For numerical, check if there is a non-empty string response
        if (selected && Array.isArray(selected) && selected.length > 0 && selected[0] !== null && selected[0].trim() !== '') {
          isAttempted = true;
        }
      }

      if (!isAttempted) {
        unattemptedCount++;
        isCorrect = 0;
        marksObtained = 0;
      } else {
        if (q.question_type === 'SINGLE') {
          // Single Correct MCQ
          const selectedIdx = selected[0];
          const correctIdx = correctAns[0];
          
          if (selectedIdx === correctIdx) {
            isCorrect = 1;
            marksObtained = q.marks;
            correctCount++;
          } else {
            isCorrect = 0;
            marksObtained = q.negative_marks; // negative value
            wrongCount++;
          }
        } else if (q.question_type === 'MULTIPLE') {
          // Multiple Correct MCQ (webapple style partial marking)
          // correctAns: [0, 2], selected: [0] or [0, 2] or [0, 1]
          const correctSet = new Set(correctAns);
          const selectedSet = new Set(selected);
          
          let selectedWrongOption = false;
          selected.forEach(idx => {
            if (!correctSet.has(idx)) {
              selectedWrongOption = true;
            }
          });

          if (selectedWrongOption) {
            // Any wrong option selected = negative marks
            isCorrect = 0;
            marksObtained = q.negative_marks;
            wrongCount++;
          } else {
            // No wrong options selected. Check if all correct options are selected
            let allCorrectSelected = true;
            correctAns.forEach(idx => {
              if (!selectedSet.has(idx)) {
                allCorrectSelected = false;
              }
            });

            if (allCorrectSelected) {
              isCorrect = 1;
              marksObtained = q.marks;
              correctCount++;
            } else {
              // Partial marking: positive marks proportional to how many correct options selected
              isCorrect = 1; // partial correct is counted as correct in counts, or wrong? In webapple it's positive marks, so let's count as correct
              marksObtained = parseFloat(((q.marks * selected.length) / correctAns.length).toFixed(2));
              correctCount++;
            }
          }
        } else if (q.question_type === 'NUMERICAL') {
          // Numerical questions
          const studentInput = selected[0].trim();
          const correctInput = correctAns[0].trim();
          
          const studentFloat = parseFloat(studentInput);
          const correctFloat = parseFloat(correctInput);

          if (!isNaN(studentFloat) && !isNaN(correctFloat) && studentFloat === correctFloat) {
            isCorrect = 1;
            marksObtained = q.marks;
            correctCount++;
          } else {
            isCorrect = 0;
            marksObtained = q.negative_marks; // numerical tests may have 0 negative marks, but we use the question setting
            wrongCount++;
          }
        }
      }

      score += marksObtained;

      processedAnswers.push({
        question_id: qId,
        selected_options: JSON.stringify(selected || []),
        is_correct: isCorrect,
        marks_obtained: marksObtained
      });
    });

    const totalQuestions = questions.length;
    const attemptedCount = correctCount + wrongCount;
    const accuracy = attemptedCount > 0 ? parseFloat(((correctCount / attemptedCount) * 100).toFixed(2)) : 0;

    // 4. Save attempt summary
    const attemptInsert = db.query(
      `INSERT INTO student_attempts (test_id, student_name, score, total_questions, correct_count, wrong_count, unattempted_count, time_taken, accuracy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        testId,
        studentName,
        parseFloat(score.toFixed(2)),
        totalQuestions,
        correctCount,
        wrongCount,
        unattemptedCount,
        timeTaken,
        accuracy
      ]
    );

    const attemptId = attemptInsert.insertId;

    // 5. Save individual question answers for review
    processedAnswers.forEach((ans) => {
      db.query(
        `INSERT INTO student_answers (attempt_id, question_id, selected_options, is_correct, marks_obtained)
         VALUES (?, ?, ?, ?, ?)`,
        [
          attemptId,
          ans.question_id,
          ans.selected_options,
          ans.is_correct,
          ans.marks_obtained
        ]
      );
    });

    res.status(201).json({
      message: 'Attempt submitted successfully',
      attemptId,
      score: parseFloat(score.toFixed(2)),
      totalQuestions,
      correctCount,
      wrongCount,
      unattemptedCount,
      accuracy
    });
  } catch (error) {
    console.error('Error submitting attempt:', error);
    res.status(500).json({ error: 'Failed to submit attempt' });
  }
};

// Get detailed result of an attempt for review
exports.getAttemptDetails = (req, res) => {
  const { id } = req.params;
  try {
    const attemptResult = db.query(
      `SELECT sa.*, t.name as test_name, t.duration as test_duration
       FROM student_attempts sa
       JOIN tests t ON sa.test_id = t.id
       WHERE sa.id = ?`,
      [id]
    );

    if (attemptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Attempt details not found' });
    }

    const attempt = attemptResult.rows[0];

    // Fetch the list of student answers along with full question details (correct answers and explanations)
    const answersResult = db.query(
      `SELECT sa.selected_options, sa.is_correct, sa.marks_obtained,
              q.id as question_id, q.question_text, q.question_type, q.options, q.image_url, q.correct_answer, q.explanation, q.marks, q.negative_marks
       FROM student_answers sa
       JOIN questions q ON sa.question_id = q.id
       WHERE sa.attempt_id = ?
       ORDER BY sa.id ASC`,
      [id]
    );

    const review = answersResult.rows.map(row => ({
      question_id: row.question_id,
      question_text: row.question_text,
      question_type: row.question_type,
      options: JSON.parse(row.options),
      image_url: row.image_url,
      correct_answer: JSON.parse(row.correct_answer),
      explanation: row.explanation,
      marks: row.marks,
      negative_marks: row.negative_marks,
      selected_options: JSON.parse(row.selected_options),
      is_correct: row.is_correct === 1,
      marks_obtained: row.marks_obtained
    }));

    res.json({
      attempt,
      review
    });
  } catch (error) {
    console.error('Error fetching attempt review:', error);
    res.status(500).json({ error: 'Failed to fetch attempt details' });
  }
};

// Get all attempts for a specific test (Teacher Dashboard)
exports.getAttemptsByTest = (req, res) => {
  const { testId } = req.params;
  try {
    const result = db.query(
      'SELECT * FROM student_attempts WHERE test_id = ? ORDER BY submitted_at DESC',
      [testId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching attempts for test:', error);
    res.status(500).json({ error: 'Failed to fetch attempts' });
  }
};
