import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Atom, FlaskConical, Calculator, Bookmark, Dna } from 'lucide-react';

interface Question {
  id: number;
  test_id: number;
  question_text: string;
  question_type: 'SINGLE' | 'MULTIPLE' | 'NUMERICAL';
  options: string[];
  image_url: string | null;
  marks: number;
  negative_marks: number;
  section: string;
}

interface TestDetails {
  id: number;
  name: string;
  duration: number;
  questions: Question[];
}

// Question Status Enum
type QuestionStatus = 'NOT_VISITED' | 'NOT_ANSWERED' | 'ANSWERED' | 'MARKED' | 'MARKED_ANSWERED';

interface QuestionState {
  visited: boolean;
  answered: boolean;
  markedForReview: boolean;
}

export default function TestAttempt() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve student name and roll number from state, or fallback to cached user details
  const getStudentInfo = () => {
    if (location.state && (location.state as any).studentName) {
      return {
        name: (location.state as any).studentName,
        roll: (location.state as any).rollNumber || 'VU1F2122'
      };
    }
    const cached = localStorage.getItem('currentUser');
    if (cached) {
      const user = JSON.parse(cached);
      return {
        name: user.name || 'Guest Student',
        roll: user.rollNumber || 'VU1F2122'
      };
    }
    return { name: 'Guest Student', roll: 'VU1F2122' };
  };

  const studentInfo = getStudentInfo();
  const studentName = studentInfo.name;
  const rollNumber = studentInfo.roll;

  const [test, setTest] = useState<TestDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  // Answers state: { [questionId]: [selectedOptionIndexes] or [numericalAnswerText] }
  const [answers, setAnswers] = useState<Record<number, any>>({});
  
  // Track visual state of question status in palette
  const [qStates, setQStates] = useState<Record<number, QuestionState>>({});

  // Active section tab index
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);

  // Timer: remaining time in seconds
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<any>(null);
  const timeSpentRef = useRef<number>(0);

  useEffect(() => {
    fetchTestDetails();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [testId]);

  const fetchTestDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/tests/${testId}/start`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start test');
      }
      const data: TestDetails = await response.json();

      // Sort questions so they are contiguous: Physics -> Chemistry -> Mathematics -> Biology -> others
      const sortedQuestions = [...data.questions].sort((a: any, b: any) => {
        const orderMap: Record<string, number> = { 'Physics': 0, 'Chemistry': 1, 'Mathematics': 2, 'Biology': 3 };
        const secA = a.section || 'Physics';
        const secB = b.section || 'Physics';
        const orderA = orderMap[secA] ?? 999;
        const orderB = orderMap[secB] ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return secA.localeCompare(secB);
      });
      const sortedTestData = { ...data, questions: sortedQuestions };

      setTest(sortedTestData);
      setTimeLeft(sortedTestData.duration * 60);

      // Initialize states for questions
      const initialStates: Record<number, QuestionState> = {};
      sortedTestData.questions.forEach((q, index) => {
        initialStates[q.id] = {
          visited: index === 0, // First question is visited initially
          answered: false,
          markedForReview: false,
        };
      });
      setQStates(initialStates);

      // Start timer
      startTimer();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prevTime) => {
        timeSpentRef.current += 1;
        if (prevTime <= 1) {
          clearInterval(timerRef.current!);
          // Trigger Auto-Submit
          autoSubmitTest();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
  };

  const autoSubmitTest = () => {
    alert("Time's up! Your test is being submitted automatically.");
    handleSubmit(true);
  };

  // Format time remaining as HH:MM:SS
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Dynamically group questions by section
  const availableSections = Array.from(
    new Set(test ? test.questions.map((q: any) => q.section || 'Physics') : [])
  );
  
  const sectionOrder = ['Physics', 'Chemistry', 'Mathematics', 'Biology'];
  const sections = [...availableSections].sort((a, b) => {
    const idxA = sectionOrder.indexOf(a);
    const idxB = sectionOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  let offset = 0;
  const sectionsInfo = sections.map((secName) => {
    const qs = test ? test.questions.filter((q: any) => (q.section || 'Physics') === secName) : [];
    const info = {
      name: secName,
      count: qs.length,
      startIndex: offset,
      endIndex: offset + qs.length,
      questions: qs
    };
    offset += qs.length;
    return info;
  });

  // Switch section tab when navigating questions
  useEffect(() => {
    if (!test || sectionsInfo.length === 0) return;
    const secIdx = sectionsInfo.findIndex(
      sec => currentIndex >= sec.startIndex && currentIndex < sec.endIndex
    );
    if (secIdx !== -1 && secIdx !== activeSectionIndex) {
      setActiveSectionIndex(secIdx);
    }
  }, [currentIndex, test]);

  const handleSectionClick = (secIdx: number) => {
    setActiveSectionIndex(secIdx);
    goToQuestion(sectionsInfo[secIdx].startIndex);
  };

  const getSectionAnsweredCount = (secName: string) => {
    if (!test) return 0;
    const qs = test.questions.filter((q: any) => (q.section || 'Physics') === secName);
    return qs.filter(q => {
      const status = getQStatus(q.id);
      return status === 'ANSWERED' || status === 'MARKED_ANSWERED';
    }).length;
  };

  const handleOptionSelect = (qId: number, optionIndex: number, type: 'SINGLE' | 'MULTIPLE') => {
    const currentSelection = answers[qId] || [];
    let updatedSelection: number[] = [];

    if (type === 'SINGLE') {
      updatedSelection = [optionIndex];
    } else {
      // Multiple Selection toggle
      if (currentSelection.includes(optionIndex)) {
        updatedSelection = currentSelection.filter((i: number) => i !== optionIndex);
      } else {
        updatedSelection = [...currentSelection, optionIndex];
      }
    }

    setAnswers({ ...answers, [qId]: updatedSelection });

    // Automatically update question state to answered: true (or false if cleared)
    setQStates((prev) => {
      const hasAnswer = updatedSelection.length > 0;
      return {
        ...prev,
        [qId]: {
          ...prev[qId],
          visited: true,
          answered: hasAnswer
        }
      };
    });
  };

  const handleNumericalChange = (qId: number, value: string) => {
    const hasAnswer = value.trim() !== '';
    setAnswers({ ...answers, [qId]: hasAnswer ? [value] : [] });

    setQStates((prev) => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        visited: true,
        answered: hasAnswer
      }
    }));
  };

  // Navigations
  const goToQuestion = (index: number) => {
    if (!test) return;

    // Update current question's state if we leave it
    const currentQ = test.questions[currentIndex];
    const nextQ = test.questions[index];

    setQStates((prev) => {
      const nextStates = { ...prev };
      
      // If we are leaving the current question, and it was visited but not saved/marked, it is "Not Answered"
      if (!nextStates[currentQ.id].answered && !nextStates[currentQ.id].markedForReview) {
        nextStates[currentQ.id].visited = true;
      }

      // Mark the target question as visited
      nextStates[nextQ.id] = {
        ...nextStates[nextQ.id],
        visited: true
      };
      
      return nextStates;
    });

    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (!test) return;
    const currentQ = test.questions[currentIndex];

    setQStates((prev) => {
      const nextStates = { ...prev };
      // Just mark as visited if not already saved/marked
      if (!nextStates[currentQ.id].answered && !nextStates[currentQ.id].markedForReview) {
        nextStates[currentQ.id].visited = true;
      }
      return nextStates;
    });

    if (currentIndex < test.questions.length - 1) {
      goToQuestion(currentIndex + 1);
    }
  };

  const handleSaveAndNext = () => {
    if (!test) return;
    const currentQ = test.questions[currentIndex];
    const currentAns = answers[currentQ.id];
    const hasAnswer = currentAns && currentAns.length > 0 && currentAns[0] !== '';

    if (!hasAnswer) {
      alert("Please select an option or input an answer before saving.");
      return;
    }

    setQStates((prev) => ({
      ...prev,
      [currentQ.id]: {
        visited: true,
        answered: true,
        markedForReview: false
      }
    }));

    if (currentIndex < test.questions.length - 1) {
      goToQuestion(currentIndex + 1);
    }
  };

  const handleMarkForReviewAndNext = () => {
    if (!test) return;
    const currentQ = test.questions[currentIndex];
    const currentAns = answers[currentQ.id];
    const hasAnswer = currentAns && currentAns.length > 0 && currentAns[0] !== '';

    setQStates((prev) => ({
      ...prev,
      [currentQ.id]: {
        visited: true,
        answered: hasAnswer,
        markedForReview: true
      }
    }));

    if (currentIndex < test.questions.length - 1) {
      goToQuestion(currentIndex + 1);
    }
  };

  const handleClearResponse = () => {
    if (!test) return;
    const currentQ = test.questions[currentIndex];
    
    // Clear selection
    const updatedAnswers = { ...answers };
    delete updatedAnswers[currentQ.id];
    setAnswers(updatedAnswers);

    // Reset state in palette
    setQStates((prev) => ({
      ...prev,
      [currentQ.id]: {
        visited: true,
        answered: false,
        markedForReview: false
      }
    }));
  };

  const handleSubmit = async (isAuto = false) => {
    if (!test) return;

    if (!isAuto) {
      const confirmSubmit = window.confirm("Are you sure you want to submit the mock test?");
      if (!confirmSubmit) return;
    }

    // Stop timer
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      setLoading(true);
      const submissionData = {
        testId: test.id,
        studentName,
        timeTaken: timeSpentRef.current,
        answers, // Dictionary: { [qId]: [selectedValues] }
        questionOrder: test.questions.map((q) => q.id)
      };

      const response = await fetch('http://localhost:5000/api/attempts/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit test attempt');
      }

      const result = await response.json();
      // Redirect to review page with the attempt ID
      navigate(`/results/${result.attemptId}`);
    } catch (err: any) {
      alert("Error submitting test: " + err.message);
      setLoading(false);
    }
  };

  // Get question status for CSS styling
  const getQStatus = (qId: number): QuestionStatus => {
    const state = qStates[qId];
    if (!state) return 'NOT_VISITED';
    
    if (state.markedForReview && state.answered) return 'MARKED_ANSWERED';
    if (state.markedForReview) return 'MARKED';
    if (state.answered) return 'ANSWERED';
    if (state.visited) return 'NOT_ANSWERED';
    return 'NOT_VISITED';
  };

  // Count question stats for summary
  const getSummaryCounts = () => {
    if (!test) return { answered: 0, notAnswered: 0, marked: 0, markedAnswered: 0, notVisited: 0 };
    
    let stats = { answered: 0, notAnswered: 0, marked: 0, markedAnswered: 0, notVisited: 0 };
    test.questions.forEach((q) => {
      const status = getQStatus(q.id);
      if (status === 'ANSWERED') stats.answered++;
      else if (status === 'NOT_ANSWERED') stats.notAnswered++;
      else if (status === 'MARKED') stats.marked++;
      else if (status === 'MARKED_ANSWERED') stats.markedAnswered++;
      else stats.notVisited++;
    });
    return stats;
  };

  if (loading && !test) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading Test Panel...</p>
        </div>
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="max-w-md mx-auto mt-20 bg-white p-6 rounded-2xl border border-red-100 text-center shadow-lg">
        <h3 className="text-xl font-bold text-red-600 mb-2">Error Loading Test</h3>
        <p className="text-gray-600 mb-6">{error || 'Invalid test details'}</p>
        <button
          onClick={() => navigate('/')}
          className="bg-blue-600 text-white font-semibold py-2 px-6 rounded-xl hover:bg-blue-700 transition-colors"
        >
          Return Home
        </button>
      </div>
    );
  }

  const currentQuestion = test.questions[currentIndex];
  const selectedAnswer = answers[currentQuestion.id] || [];
  const summary = getSummaryCounts();

  return (
    <div className="min-h-screen bg-[#f1f3f6] flex flex-col unselectable select-none">
      {/* Top Banner (JEE Advanced Mock Style) */}
      <header className="bg-[#0f294a] text-white px-6 py-3 flex justify-between items-center shadow-md border-b border-blue-950">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600/35 p-1.5 rounded-lg border border-blue-400/30 text-[#fbbf24] animate-pulse flex items-center justify-center">
            <Atom className="w-5.5 h-5.5" />
          </div>
          <div>
            <h1 className="font-extrabold text-white text-base md:text-lg tracking-tight uppercase flex items-center gap-2">
              <span className="text-[#fbbf24] font-black">{test.name}</span>
              <span className="bg-[#1d3d63] text-gray-300 text-[10px] normal-case font-semibold px-2 py-0.5 rounded border border-blue-800 hidden sm:inline-block">
                CBT Mock Portal
              </span>
            </h1>
          </div>
        </div>

        {/* Center: White Timer display card */}
        <div className="flex flex-col items-center bg-white border border-gray-300 rounded px-5 py-1 text-center shadow-sm select-none">
          <span className="text-[9px] text-gray-500 font-extrabold uppercase tracking-wider">TIME REMAINING</span>
          <span className="text-lg font-black text-[#0f294a] font-mono tracking-widest leading-none mt-0.5">{formatTime(timeLeft)}</span>
        </div>

        {/* Right Candidate Details */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-100/10 border border-white/20 text-[#fbbf24] flex items-center justify-center font-bold text-sm shadow-inner uppercase">
            {studentName.slice(0, 2)}
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-xs font-black tracking-wide text-white leading-tight">{studentName}</p>
            <p className="text-[10px] text-gray-400 font-medium">Roll: {rollNumber}</p>
          </div>
        </div>
      </header>

      {/* Subject Selector Tab Bar */}
      <div className="bg-[#eef2f5] px-6 py-1 flex items-center justify-between border-b border-gray-250 select-none shadow-sm">
        <div className="flex gap-1.5">
          {sectionsInfo.map((sec, idx) => {
            const isActive = idx === activeSectionIndex;
            return (
              <button
                key={sec.name}
                onClick={() => handleSectionClick(idx)}
                className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-all duration-150 ${
                  isActive
                    ? 'bg-[#0f294a] text-white shadow-md border-b-2 border-[#fbbf24] scale-102 font-black'
                    : 'text-slate-700 hover:bg-slate-200 hover:text-slate-900 bg-[#edf2f6]/50'
                }`}
              >
                {sec.name === 'Physics' && <Atom className="w-4 h-4 text-blue-500" />}
                {sec.name === 'Chemistry' && <FlaskConical className="w-4 h-4 text-green-500" />}
                {sec.name === 'Mathematics' && <Calculator className="w-4 h-4 text-red-500" />}
                {sec.name === 'Biology' && <Dna className="w-4 h-4 text-purple-500" />}
                {!['Physics', 'Chemistry', 'Mathematics', 'Biology'].includes(sec.name) && <Bookmark className="w-4 h-4 text-slate-500" />}
                <span>
                  {sec.name} ({getSectionAnsweredCount(sec.name)}/{sec.count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Area: Question Details & Answers Option card */}
        <div className="flex-1 flex flex-col justify-between bg-white border-r border-gray-200 overflow-y-auto">
          
          <div className="p-6 md:p-8 flex-1 overflow-y-auto">
            {/* Header info inside the card itself (No dedicated top background bar) */}
            <div className="flex justify-between items-center pb-4 mb-6 border-b border-gray-150">
              <div className="flex items-center gap-2">
                <span className="text-[#0f294a] font-black text-xl">Q. {currentIndex + 1}</span>
                <span className="text-gray-300 font-bold">|</span>
                <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded font-semibold tracking-wide uppercase">
                  {currentQuestion.question_type === 'SINGLE' && 'Single Correct Options (MCQ)'}
                  {currentQuestion.question_type === 'MULTIPLE' && 'One or More Options Correct (MCQ)'}
                  {currentQuestion.question_type === 'NUMERICAL' && 'Numerical Value Answer'}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="bg-green-50 border border-green-200 text-green-700 text-xs px-2.5 py-1 rounded font-bold shadow-sm">
                  Correct: +{currentQuestion.marks}
                </span>
                <span className="bg-red-50 border border-red-200 text-red-700 text-xs px-2.5 py-1 rounded font-bold shadow-sm">
                  Wrong: {currentQuestion.negative_marks}
                </span>
              </div>
            </div>

            {/* Question Text Description */}
            <div className="prose max-w-none text-gray-800 text-sm md:text-base leading-relaxed mb-6 font-medium whitespace-pre-line">
              {currentQuestion.question_text}
            </div>

            {/* Question Diagram Image */}
            {currentQuestion.image_url && (
              <div className="my-6 max-h-64 border border-gray-100 rounded-xl overflow-hidden shadow-sm inline-block bg-white p-2">
                <img
                  src={currentQuestion.image_url}
                  alt="Question Diagram"
                  className="object-contain max-w-full max-h-64"
                />
              </div>
            )}

            {/* Answer Options Card Grid */}
            <div className="mt-8 border-t border-gray-100 pt-6">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Select Option</h4>
              
              {currentQuestion.question_type === 'SINGLE' && (
                <div className="space-y-3">
                  {currentQuestion.options.map((opt, idx) => {
                    const isSelected = selectedAnswer.includes(idx);
                    const letter = String.fromCharCode(65 + idx);
                    return (
                      <div
                        key={idx}
                        onClick={() => handleOptionSelect(currentQuestion.id, idx, 'SINGLE')}
                        className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer select-none ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-semibold shadow-sm animate-pulse-once'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-slate-50/50 bg-white text-gray-700'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}>
                          {letter}
                        </div>
                        <span className="text-sm font-medium mt-0.5">{opt}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {currentQuestion.question_type === 'MULTIPLE' && (
                <div className="space-y-3">
                  {currentQuestion.options.map((opt, idx) => {
                    const isSelected = selectedAnswer.includes(idx);
                    const letter = String.fromCharCode(65 + idx);
                    return (
                      <div
                        key={idx}
                        onClick={() => handleOptionSelect(currentQuestion.id, idx, 'MULTIPLE')}
                        className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer select-none ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-semibold shadow-sm'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-slate-50/50 bg-white text-gray-700'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}>
                          {isSelected ? (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : letter}
                        </div>
                        <span className="text-sm font-medium mt-0.5">{opt}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {currentQuestion.question_type === 'NUMERICAL' && (
                <div className="max-w-xs">
                  <input
                    type="text"
                    pattern="[0-9.-]*"
                    placeholder="Enter numerical value (e.g. 14.5)"
                    value={selectedAnswer[0] || ''}
                    onChange={(e) => handleNumericalChange(currentQuestion.id, e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 focus:border-blue-500 rounded-xl focus:outline-none font-bold text-lg text-gray-800"
                  />
                  <p className="text-xs text-gray-400 mt-2">Use decimal values if necessary. Negative values allowed.</p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex flex-wrap gap-3 justify-between items-center shadow-inner select-none">
            <div className="flex gap-3">
              <button
                onClick={handleMarkForReviewAndNext}
                className="px-5 py-2.5 bg-[#e28704] hover:bg-[#c67503] text-white text-xs md:text-sm font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Bookmark className="w-4 h-4" />
                Mark for Review & Next
              </button>
              <button
                onClick={handleClearResponse}
                className="px-5 py-2.5 border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs md:text-sm font-bold rounded-lg transition-colors bg-white shadow-sm"
              >
                Clear Response
              </button>
            </div>

            <div className="flex gap-3">
              <button
                disabled={currentIndex === 0}
                onClick={() => goToQuestion(currentIndex - 1)}
                className="px-5 py-2.5 bg-[#8b9ba8] hover:bg-[#72828f] disabled:opacity-50 text-white text-xs md:text-sm font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <button
                onClick={handleNext}
                className="px-6 py-2.5 bg-[#0f294a] hover:bg-[#153a66] text-white text-xs md:text-sm font-bold rounded-lg transition-colors flex items-center gap-1 shadow-md"
              >
                Next &gt;&gt;
              </button>
              <button
                onClick={handleSaveAndNext}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs md:text-sm font-bold rounded-lg transition-colors shadow-md flex items-center gap-1"
              >
                Save & Next
              </button>
            </div>
          </div>
        </div>

        {/* Right Area: Status Palette and Submit Panel */}
        <div className="w-full lg:w-80 bg-white border-t lg:border-t-0 flex flex-col justify-between overflow-y-auto select-none shadow-sm">
          <div>
            {/* Legend indicators */}
            <div className="p-4 border-b border-gray-150 grid grid-cols-2 gap-3 text-[10px] font-bold text-slate-500 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="palette-btn w-6 h-6 shape-answered flex-shrink-0 text-[10px]">{summary.answered}</div>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="palette-btn w-6 h-6 shape-not-answered flex-shrink-0 text-[10px]">{summary.notAnswered}</div>
                <span>Not Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="palette-btn w-6 h-6 shape-not-visited flex-shrink-0 text-[10px]">{summary.notVisited}</div>
                <span>Not Visited</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="palette-btn w-6 h-6 shape-marked flex-shrink-0 text-[10px]">{summary.marked}</div>
                <span>Marked for Review</span>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <div className="palette-btn w-6 h-6 shape-marked-answered flex-shrink-0 text-[10px]">{summary.markedAnswered}</div>
                <span>Answered & Marked (evaluated)</span>
              </div>
            </div>

            {/* Status summaries */}
            <div className="bg-blue-50/40 p-3.5 border-b border-gray-100 flex justify-around text-center text-xs font-bold text-gray-700">
              <div>
                <p className="text-green-700 font-extrabold text-sm">{summary.answered}</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase">Answered</p>
              </div>
              <div>
                <p className="text-red-700 font-extrabold text-sm">{summary.notAnswered}</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase">Not Ans</p>
              </div>
              <div>
                <p className="text-purple-700 font-extrabold text-sm">{summary.marked + summary.markedAnswered}</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase">Marked</p>
              </div>
              <div>
                <p className="text-gray-500 font-extrabold text-sm">{summary.notVisited}</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase">Not Visited</p>
              </div>
            </div>

            {/* Question Palette divided by sections present in the test */}
            <div className="p-4">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Question Palette</h3>
              
              {sectionsInfo.map((sec) => (
                <div key={sec.name} className="mb-5">
                  <h4 className="text-xs font-extrabold text-[#0f294a] bg-slate-100 border-l-4 border-[#0f294a] px-3 py-1.5 rounded-r uppercase tracking-wider mb-3 flex items-center justify-between">
                    <span>{sec.name}</span>
                    <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                      {sec.count} Qs
                    </span>
                  </h4>
                  <div className="grid grid-cols-5 gap-2 max-h-56 overflow-y-auto pr-1">
                    {test.questions.slice(sec.startIndex, sec.endIndex).map((q, idx) => {
                      const absoluteIdx = sec.startIndex + idx;
                      const status = getQStatus(q.id);
                      let shapeClass = 'shape-not-visited';
                      if (status === 'NOT_ANSWERED') shapeClass = 'shape-not-answered';
                      else if (status === 'ANSWERED') shapeClass = 'shape-answered';
                      else if (status === 'MARKED') shapeClass = 'shape-marked';
                      else if (status === 'MARKED_ANSWERED') shapeClass = 'shape-marked-answered';

                      const isActive = absoluteIdx === currentIndex;

                      return (
                        <button
                          key={q.id}
                          onClick={() => goToQuestion(absoluteIdx)}
                          className={`palette-btn ${shapeClass} ${
                            isActive ? 'ring-2 ring-blue-600 ring-offset-2 scale-105 z-10' : ''
                          }`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Action Card */}
          <div className="p-4 bg-gray-50 border-t border-gray-200">
            <button
              onClick={() => handleSubmit(false)}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm rounded-xl tracking-wider transition-colors shadow-md uppercase"
            >
              Submit Test
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
