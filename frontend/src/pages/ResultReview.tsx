import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Award, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';


interface AttemptSummary {
  id: number;
  test_id: number;
  student_name: string;
  score: number;
  total_questions: number;
  correct_count: number;
  wrong_count: number;
  unattempted_count: number;
  time_taken: number;
  accuracy: number;
  submitted_at: string;
  test_name: string;
  test_duration: number;
}

interface QuestionReview {
  question_id: number;
  question_text: string;
  question_type: 'SINGLE' | 'MULTIPLE' | 'NUMERICAL';
  options: string[];
  image_url: string | null;
  correct_answer: any[];
  explanation: string;
  marks: number;
  negative_marks: number;
  selected_options: any[];
  is_correct: boolean;
  marks_obtained: number;
}

interface AttemptDetails {
  attempt: AttemptSummary;
  review: QuestionReview[];
}

export default function ResultReview() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [details, setDetails] = useState<AttemptDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAttemptDetails();
  }, [attemptId]);

  const fetchAttemptDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/attempts/${attemptId}`);
      if (!response.ok) throw new Error('Attempt details not found');
      const data = await response.json();
      setDetails(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Generating Result Analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="max-w-md mx-auto mt-20 bg-white p-6 rounded-2xl border border-red-100 text-center shadow-lg">
        <h3 className="text-xl font-bold text-red-600 mb-2">Error Loading Results</h3>
        <p className="text-gray-600 mb-6">{error || 'Invalid attempt details'}</p>
        <button
          onClick={() => navigate('/')}
          className="bg-blue-600 text-white font-semibold py-2 px-6 rounded-xl hover:bg-blue-700 transition-colors"
        >
          Return Home
        </button>
      </div>
    );
  }

  const { attempt, review } = details;
  const maxScore = review.reduce((acc, curr) => acc + curr.marks, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back navigation */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm font-semibold mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Test Portal
      </button>

      {/* Result Card Hero */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-150 shadow-sm mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-6 mb-6">
          <div>
            <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Test Completed
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 mt-2">{attempt.test_name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Candidate: <strong className="text-gray-700">{attempt.student_name}</strong> • Attempted on:{' '}
              {new Date(attempt.submitted_at).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 font-bold uppercase">Score Obtained</p>
            <p className="text-4xl font-black text-blue-600">
              {attempt.score} <span className="text-lg text-gray-400 font-normal">/ {maxScore}</span>
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-500 font-semibold uppercase">Accuracy</span>
              <Award className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-700">{attempt.accuracy}%</p>
            <p className="text-xs text-gray-400 mt-1">Correct / Attempted</p>
          </div>

          <div className="bg-green-50/50 p-4 rounded-2xl border border-green-100/50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-500 font-semibold uppercase">Correct Answers</span>
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-700">{attempt.correct_count}</p>
            <p className="text-xs text-gray-400 mt-1">{review.filter(r => r.marks_obtained > 0 && r.marks_obtained < r.marks).length} partially correct</p>
          </div>

          <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100/50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-500 font-semibold uppercase">Wrong Answers</span>
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-700">{attempt.wrong_count}</p>
            <p className="text-xs text-gray-400 mt-1">Negative marks applied</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-150">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-500 font-semibold uppercase">Time Taken</span>
              <Clock className="w-5 h-5 text-gray-600" />
            </div>
            <p className="text-2xl font-bold text-gray-700">{formatTime(attempt.time_taken)}</p>
            <p className="text-xs text-gray-400 mt-1">Allowed: {attempt.test_duration} mins</p>
          </div>
        </div>

        {/* Bar breakdown */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="flex justify-between text-xs text-gray-500 font-bold mb-2">
            <span>ANSWER PALETTE BREAKDOWN</span>
            <span>{attempt.total_questions} TOTAL QUESTIONS</span>
          </div>
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${(attempt.correct_count / attempt.total_questions) * 100}%` }}
              className="bg-green-600 h-full"
              title="Correct"
            />
            <div
              style={{ width: `${(attempt.wrong_count / attempt.total_questions) * 100}%` }}
              className="bg-red-600 h-full"
              title="Wrong"
            />
            <div
              style={{ width: `${(attempt.unattempted_count / attempt.total_questions) * 100}%` }}
              className="bg-gray-400 h-full"
              title="Unattempted"
            />
          </div>
          <div className="flex justify-start gap-4 mt-2.5 text-xs font-semibold text-gray-500">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-green-600 rounded-full" />
              <span>Correct ({attempt.correct_count})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-red-600 rounded-full" />
              <span>Wrong ({attempt.wrong_count})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-gray-400 rounded-full" />
              <span>Unattempted ({attempt.unattempted_count})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Solutions Section */}
      <h2 className="text-xl font-extrabold text-gray-800 mb-6">Question Review & Explanations</h2>
      <div className="space-y-6">
        {review.map((q, index) => {
          const isSelected = q.selected_options.length > 0;
          const statusText = q.marks_obtained > 0 
            ? (q.marks_obtained === q.marks ? 'Correct' : 'Partially Correct')
            : (isSelected ? 'Incorrect' : 'Unattempted');

          const statusColorClass = q.marks_obtained > 0 
            ? 'bg-green-50 text-green-700 border-green-200' 
            : (isSelected ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-500 border-gray-200');

          return (
            <div
              key={q.question_id}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                q.marks_obtained > 0 
                  ? 'border-green-200' 
                  : (isSelected ? 'border-red-200' : 'border-gray-200')
              }`}
            >
              {/* Question Header Card */}
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex flex-wrap justify-between items-center gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-gray-800 text-sm">Question {index + 1}</span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${statusColorClass}`}>
                    {statusText}
                  </span>
                  <span className="text-xs text-gray-400 uppercase font-bold">{q.question_type}</span>
                </div>
                <div className="text-xs font-bold text-gray-600">
                  Marks Obtained:{' '}
                  <span className={q.marks_obtained > 0 ? 'text-green-600' : (q.marks_obtained < 0 ? 'text-red-600' : 'text-gray-500')}>
                    {q.marks_obtained}
                  </span>{' '}
                  / {q.marks}
                </div>
              </div>

              {/* Question content */}
              <div className="p-6 md:p-8">
                <div className="prose max-w-none text-gray-800 font-medium leading-relaxed mb-4 whitespace-pre-line">
                  {q.question_text}
                </div>

                {q.image_url && (
                  <div className="my-4 max-h-64 border border-gray-100 rounded-xl overflow-hidden shadow-sm inline-block bg-white">
                    <img src={q.image_url} alt="Question" className="object-contain max-h-64 max-w-full" />
                  </div>
                )}

                {/* Options display */}
                {q.question_type !== 'NUMERICAL' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                    {q.options.map((opt, idx) => {
                      const isCorrectChoice = q.correct_answer.includes(idx);
                      const isStudentChoice = q.selected_options.includes(idx);
                      
                      let optionStyle = 'border-gray-200 text-gray-700 bg-white';
                      if (isCorrectChoice) {
                        // Highlight correct answer in green
                        optionStyle = 'border-green-600 bg-green-50 text-green-950 font-semibold';
                      } else if (isStudentChoice && !isCorrectChoice) {
                        // Highlight wrong choice selected by student in red
                        optionStyle = 'border-red-500 bg-red-50 text-red-950';
                      }

                      return (
                        <div key={idx} className={`p-4 rounded-xl border-2 flex items-start gap-3 text-sm ${optionStyle}`}>
                          <span className="w-5 h-5 flex items-center justify-center bg-gray-100 rounded-full font-bold text-xs text-gray-500 mt-0.5 border border-gray-200">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <div className="flex-1">
                            <p>{opt}</p>
                            <div className="flex items-center gap-1.5 mt-2.5 text-[10px] font-bold">
                              {isCorrectChoice && <span className="text-green-700">✓ CORRECT ANSWER</span>}
                              {isStudentChoice && (
                                <span className={isCorrectChoice ? 'text-green-700' : 'text-red-700'}>
                                  ● YOUR CHOICE
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Numerical display */}
                {q.question_type === 'NUMERICAL' && (
                  <div className="mt-4 p-4 rounded-xl border bg-gray-50 border-gray-200 flex flex-col md:flex-row gap-6 md:gap-12">
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase">Correct Answer</p>
                      <p className="text-lg font-extrabold text-green-600 mt-0.5">{q.correct_answer[0]}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase">Your Input</p>
                      <p className={`text-lg font-extrabold mt-0.5 ${q.is_correct ? 'text-green-600' : 'text-red-600'}`}>
                        {q.selected_options[0] !== undefined ? q.selected_options[0] : 'No answer'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Detailed Solution Explanation */}
                <div className="mt-8 border-t border-gray-100 pt-6">
                  <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm mb-3">
                    <AlertCircle className="w-4.5 h-4.5" />
                    <span>Detailed Solution & Explanation</span>
                  </div>
                  <div className="bg-indigo-50/30 border border-indigo-100 rounded-xl p-5 text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                    {q.explanation || 'No detailed explanation provided for this question.'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Simple left icon helper
function ChevronLeft(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
