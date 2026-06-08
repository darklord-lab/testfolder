import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Clock, ChevronLeft, ChevronRight, User } from 'lucide-react';


interface Question {
  id: number;
  test_id: number;
  question_text: string;
  question_type: 'SINGLE' | 'MULTIPLE' | 'NUMERICAL';
  options: string[];
  image_url: string | null;
  marks: number;
  negative_marks: number;
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

  // Student name passed from state, fallback to guest
  const studentName = (location.state as any)?.studentName || 'Guest Student';

  const [test, setTest] = useState<TestDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  // Answers state: { [questionId]: [selectedOptionIndexes] or [numericalAnswerText] }
  const [answers, setAnswers] = useState<Record<number, any>>({});
  
  // Track visual state of question status in palette
  const [qStates, setQStates] = useState<Record<number, QuestionState>>({});

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
      setTest(data);
      setTimeLeft(data.duration * 60);

      // Initialize states for questions
      const initialStates: Record<number, QuestionState> = {};
      data.questions.forEach((q, index) => {
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

  const handleOptionSelect = (qId: number, optionIndex: number, type: 'SINGLE' | 'MULTIPLE') => {
    const currentSelection = answers[qId] || [];

    if (type === 'SINGLE') {
      setAnswers({ ...answers, [qId]: [optionIndex] });
    } else {
      // Multiple Selection toggle
      if (currentSelection.includes(optionIndex)) {
        setAnswers({
          ...answers,
          [qId]: currentSelection.filter((i: number) => i !== optionIndex)
        });
      } else {
        setAnswers({
          ...answers,
          [qId]: [...currentSelection, optionIndex]
        });
      }
    }
  };

  const handleNumericalChange = (qId: number, value: string) => {
    setAnswers({ ...answers, [qId]: [value] });
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
        // Leave it as visited (which resolves to NOT_ANSWERED)
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
        answers // Dictionary: { [qId]: [selectedValues] }
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
    <div className="min-h-screen bg-[#f1f3f6] flex flex-col unselectable">
      {/* Top Banner (NTA / webapple Header Style) */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="font-extrabold text-gray-800 text-base md:text-lg tracking-tight uppercase">
            {test.name}
          </h1>
          <p className="text-xs text-gray-500 font-medium">Mock Test CBT Portal</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2 bg-blue-50 text-blue-700 px-3.5 py-1.5 rounded-lg border border-blue-100">
            <User className="w-4 h-4" />
            <span className="text-xs font-semibold">{studentName}</span>
          </div>
          <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3.5 py-1.5 rounded-lg border border-red-100 font-bold">
            <Clock className="w-4.5 h-4.5 animate-pulse" />
            <span className="text-sm tracking-wide">{formatTime(timeLeft)}</span>
          </div>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Area: Question Paper Pane */}
        <div className="flex-1 flex flex-col justify-between bg-white border-r border-gray-200 overflow-y-auto">
          {/* Question Meta Bar */}
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-3.5 flex justify-between items-center text-xs text-gray-600 font-semibold">
            <div className="flex items-center gap-3">
              <span className="bg-blue-600 text-white px-2.5 py-1 rounded text-[11px] font-bold">
                Question {currentIndex + 1}
              </span>
              <span className="text-gray-500">|</span>
              <span className="uppercase text-gray-700">
                {currentQuestion.question_type === 'SINGLE' && 'Single Correct Options (MCQ)'}
                {currentQuestion.question_type === 'MULTIPLE' && 'One or More Options Correct (MCQ)'}
                {currentQuestion.question_type === 'NUMERICAL' && 'Numerical Value Answer'}
              </span>
            </div>
            <div className="flex gap-4">
              <span className="text-green-700">Correct: +{currentQuestion.marks}</span>
              <span className="text-red-700">Wrong: {currentQuestion.negative_marks}</span>
            </div>
          </div>

          {/* Question Text Area */}
          <div className="p-6 md:p-8 flex-1 overflow-y-auto">
            <div className="prose max-w-none text-gray-800 text-sm md:text-base leading-relaxed mb-6 font-medium whitespace-pre-line">
              {currentQuestion.question_text}
            </div>

            {/* Question Image if exists */}
            {currentQuestion.image_url && (
              <div className="my-6 max-h-64 border border-gray-100 rounded-xl overflow-hidden shadow-sm inline-block">
                <img
                  src={currentQuestion.image_url}
                  alt="Question Diagram"
                  className="object-contain max-w-full max-h-64"
                />
              </div>
            )}

            {/* Answers Selection */}
            <div className="mt-8 border-t border-gray-100 pt-6">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Select Option</h4>
              
              {currentQuestion.question_type === 'SINGLE' && (
                <div className="space-y-3">
                  {currentQuestion.options.map((opt, idx) => (
                    <label
                      key={idx}
                      onClick={() => handleOptionSelect(currentQuestion.id, idx, 'SINGLE')}
                      className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        selectedAnswer.includes(idx)
                          ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-semibold'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        selectedAnswer.includes(idx) ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                      }`}>
                        {selectedAnswer.includes(idx) && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {currentQuestion.question_type === 'MULTIPLE' && (
                <div className="space-y-3">
                  {currentQuestion.options.map((opt, idx) => (
                    <label
                      key={idx}
                      onClick={() => handleOptionSelect(currentQuestion.id, idx, 'MULTIPLE')}
                      className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        selectedAnswer.includes(idx)
                          ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-semibold'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        selectedAnswer.includes(idx) ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                      }`}>
                        {selectedAnswer.includes(idx) && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
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

          {/* Bottom Control Bar */}
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex flex-wrap gap-3 justify-between items-center shadow-inner">
            <div className="flex gap-3">
              <button
                onClick={handleMarkForReviewAndNext}
                className="px-4 py-2.5 border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs md:text-sm font-semibold rounded-lg transition-colors"
              >
                Mark for Review & Next
              </button>
              <button
                onClick={handleClearResponse}
                className="px-4 py-2.5 border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs md:text-sm font-semibold rounded-lg transition-colors"
              >
                Clear Response
              </button>
            </div>

            <div className="flex gap-3">
              <button
                disabled={currentIndex === 0}
                onClick={() => goToQuestion(currentIndex - 1)}
                className="px-3.5 py-2.5 bg-white border border-gray-200 hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-white text-gray-600 rounded-lg transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  if (currentIndex < test.questions.length - 1) {
                    goToQuestion(currentIndex + 1);
                  }
                }}
                className="px-3.5 py-2.5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-600 rounded-lg transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={handleSaveAndNext}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs md:text-sm font-bold rounded-lg transition-colors shadow-sm"
              >
                Save & Next
              </button>
            </div>
          </div>
        </div>

        {/* Right Area: Status Palette and Submit Panel */}
        <div className="w-full lg:w-80 bg-white border-t lg:border-t-0 flex flex-col justify-between overflow-y-auto">
          <div>
            {/* Candidate Header */}
            <div className="border-b border-gray-150 p-4 bg-gray-50 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200 flex-shrink-0">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div className="truncate">
                <p className="text-[11px] text-gray-400 font-bold uppercase">Candidate</p>
                <p className="font-bold text-gray-700 text-sm truncate">{studentName}</p>
              </div>
            </div>

            {/* Status Indicators Grid */}
            <div className="p-4 border-b border-gray-100 grid grid-cols-2 gap-3 text-[11px] font-semibold text-gray-600">
              <div className="flex items-center gap-2">
                <div className="palette-btn w-6 h-6 shape-not-visited flex-shrink-0">0</div>
                <span>Not Visited</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="palette-btn w-6 h-6 shape-not-answered flex-shrink-0">0</div>
                <span>Not Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="palette-btn w-6 h-6 shape-answered flex-shrink-0">0</div>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="palette-btn w-6 h-6 shape-marked flex-shrink-0">0</div>
                <span>Marked for Review</span>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <div className="palette-btn w-6 h-6 shape-marked-answered flex-shrink-0">0</div>
                <span>Answered & Marked for Review</span>
              </div>
            </div>

            {/* Summary Panel counts */}
            <div className="bg-blue-50/50 p-3.5 border-b border-gray-100 flex justify-around text-center text-xs font-semibold text-gray-700">
              <div>
                <p className="text-green-700 font-bold text-sm">{summary.answered}</p>
                <p className="text-[10px] text-gray-400">Answered</p>
              </div>
              <div>
                <p className="text-red-700 font-bold text-sm">{summary.notAnswered}</p>
                <p className="text-[10px] text-gray-400">Not Ans</p>
              </div>
              <div>
                <p className="text-purple-700 font-bold text-sm">{summary.marked + summary.markedAnswered}</p>
                <p className="text-[10px] text-gray-400">Marked</p>
              </div>
              <div>
                <p className="text-gray-600 font-bold text-sm">{summary.notVisited}</p>
                <p className="text-[10px] text-gray-400">Not Visited</p>
              </div>
            </div>

            {/* Question Palette Grid */}
            <div className="p-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Question Palette</h3>
              <div className="grid grid-cols-5 gap-2 max-h-56 overflow-y-auto pr-1">
                {test.questions.map((q, idx) => {
                  const status = getQStatus(q.id);
                  let shapeClass = 'shape-not-visited';
                  if (status === 'NOT_ANSWERED') shapeClass = 'shape-not-answered';
                  else if (status === 'ANSWERED') shapeClass = 'shape-answered';
                  else if (status === 'MARKED') shapeClass = 'shape-marked';
                  else if (status === 'MARKED_ANSWERED') shapeClass = 'shape-marked-answered';

                  const isActive = idx === currentIndex;

                  return (
                    <button
                      key={q.id}
                      onClick={() => goToQuestion(idx)}
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
          </div>

          {/* Submission Area */}
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
