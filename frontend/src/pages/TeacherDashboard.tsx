import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Eye, X, BookOpen, Clock, HelpCircle, FileText, CheckCircle } from 'lucide-react';


interface Question {
  id: number;
  test_id: number;
  question_text: string;
  question_type: 'SINGLE' | 'MULTIPLE' | 'NUMERICAL';
  options: string[];
  image_url: string | null;
  correct_answer: any[];
  explanation: string;
  marks: number;
  negative_marks: number;
}

interface Test {
  id: number;
  name: string;
  duration: number;
  is_published: number;
  question_count: number;
  attempt_count: number;
  questions?: Question[];
}

interface Attempt {
  id: number;
  student_name: string;
  score: number;
  total_questions: number;
  correct_count: number;
  wrong_count: number;
  unattempted_count: number;
  time_taken: number;
  accuracy: number;
  submitted_at: string;
}

export default function TeacherDashboard() {
  // Tests List
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [loadingTests, setLoadingTests] = useState(true);
  const [activeTab, setActiveTab] = useState<'questions' | 'results'>('questions');

  // Test creation modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTestName, setNewTestName] = useState('');
  const [newTestDuration, setNewTestDuration] = useState('180');

  // Question editing/adding state
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  
  // Question Form State
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState<'SINGLE' | 'MULTIPLE' | 'NUMERICAL'>('SINGLE');
  const [qOptions, setQOptions] = useState<string[]>(['Option A', 'Option B', 'Option C', 'Option D']);
  const [qCorrect, setQCorrect] = useState<number[]>([]); // indexes for MCQs
  const [qNumericalAns, setQNumericalAns] = useState(''); // text for numerical
  const [qImageUrl, setQImageUrl] = useState('');
  const [qExplanation, setQExplanation] = useState('');
  const [qMarks, setQMarks] = useState('4');
  const [qNegMarks, setQNegMarks] = useState('-1');

  // Student Attempts Logs
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  useEffect(() => {
    fetchTests();
  }, []);

  useEffect(() => {
    if (selectedTest) {
      fetchTestDetails(selectedTest.id);
      if (activeTab === 'results') {
        fetchAttempts(selectedTest.id);
      }
    }
  }, [selectedTest?.id, activeTab]);

  const fetchTests = async () => {
    try {
      setLoadingTests(true);
      const response = await fetch('http://localhost:5000/api/tests');
      if (!response.ok) throw new Error('Failed to fetch tests');
      const data = await response.json();
      setTests(data);
    } catch (error) {
      console.error(error);
      alert('Failed to load tests.');
    } finally {
      setLoadingTests(false);
    }
  };

  const fetchTestDetails = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:5000/api/tests/${id}`);
      if (!response.ok) throw new Error('Failed to fetch test details');
      const data = await response.json();
      setSelectedTest(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAttempts = async (testId: number) => {
    try {
      setLoadingAttempts(true);
      const response = await fetch(`http://localhost:5000/api/attempts/test/${testId}`);
      if (!response.ok) throw new Error('Failed to fetch attempts');
      const data = await response.json();
      setAttempts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingAttempts(false);
    }
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestName.trim() || !newTestDuration) return;

    try {
      const response = await fetch('http://localhost:5000/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTestName.trim(), duration: parseInt(newTestDuration, 10) }),
      });

      if (!response.ok) throw new Error('Failed to create test');
      const data = await response.json();

      setShowCreateModal(false);
      setNewTestName('');
      fetchTests();
      // Auto-select the newly created test
      fetchTestDetails(data.testId);
    } catch (error) {
      alert('Error creating test');
    }
  };

  const handleDeleteTest = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this test? All questions and student attempts will be deleted.')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/tests/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete test');
      
      if (selectedTest?.id === id) {
        setSelectedTest(null);
      }
      fetchTests();
    } catch (error) {
      alert('Error deleting test');
    }
  };

  const handlePublishToggle = async (test: Test) => {
    const isPublished = test.is_published === 1;
    
    // If publishing, ensure there's at least 1 question
    if (!isPublished && test.question_count === 0) {
      alert('Please add at least one question before publishing.');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/tests/${test.id}/publish`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !isPublished }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update publish state');
      }

      fetchTests();
      if (selectedTest?.id === test.id) {
        setSelectedTest(prev => prev ? { ...prev, is_published: !isPublished ? 1 : 0 } : null);
      }
    } catch (error: any) {
      alert(error.message || 'Error publishing test');
    }
  };

  // Question Form Management
  const openAddQuestion = () => {
    setEditingQuestion(null);
    setQText('');
    setQType('SINGLE');
    setQOptions(['Option A', 'Option B', 'Option C', 'Option D']);
    setQCorrect([]);
    setQNumericalAns('');
    setQImageUrl('');
    setQExplanation('');
    setQMarks('4');
    setQNegMarks('-1');
    setShowQuestionModal(true);
  };

  const openEditQuestion = (q: Question) => {
    setEditingQuestion(q);
    setQText(q.question_text);
    setQType(q.question_type);
    setQOptions(q.options);
    setQImageUrl(q.image_url || '');
    setQExplanation(q.explanation);
    setQMarks(q.marks.toString());
    setQNegMarks(q.negative_marks.toString());

    if (q.question_type === 'NUMERICAL') {
      setQNumericalAns(q.correct_answer[0] || '');
      setQCorrect([]);
    } else {
      setQCorrect(q.correct_answer);
      setQNumericalAns('');
    }
    setShowQuestionModal(true);
  };

  const handleOptionChange = (index: number, val: string) => {
    const updated = [...qOptions];
    updated[index] = val;
    setQOptions(updated);
  };

  const handleCorrectOptionToggle = (index: number) => {
    if (qType === 'SINGLE') {
      setQCorrect([index]);
    } else {
      if (qCorrect.includes(index)) {
        setQCorrect(qCorrect.filter(i => i !== index));
      } else {
        setQCorrect([...qCorrect, index]);
      }
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qText.trim()) return;
    if (qType !== 'NUMERICAL' && qCorrect.length === 0) {
      alert('Please select at least one correct option.');
      return;
    }
    if (qType === 'NUMERICAL' && !qNumericalAns.trim()) {
      alert('Please enter a correct numerical answer.');
      return;
    }

    const correct_answer = qType === 'NUMERICAL' ? [qNumericalAns.trim()] : qCorrect;

    const questionBody = {
      question_text: qText.trim(),
      question_type: qType,
      options: qOptions,
      image_url: qImageUrl.trim() || null,
      correct_answer,
      explanation: qExplanation.trim(),
      marks: parseFloat(qMarks),
      negative_marks: parseFloat(qNegMarks),
    };

    try {
      let url = `http://localhost:5000/api/tests/${selectedTest!.id}/questions`;
      let method = 'POST';

      if (editingQuestion) {
        url += `/${editingQuestion.id}`;
        method = 'PUT';
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questionBody),
      });

      if (!response.ok) throw new Error('Failed to save question');
      
      setShowQuestionModal(false);
      fetchTestDetails(selectedTest!.id);
      fetchTests(); // Refresh test question counts
    } catch (error) {
      alert('Error saving question');
    }
  };

  const handleDeleteQuestion = async (qId: number) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/tests/${selectedTest!.id}/questions/${qId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete question');
      
      fetchTestDetails(selectedTest!.id);
      fetchTests(); // Refresh test question counts
    } catch (error) {
      alert('Error deleting question');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">Teacher Dashboard</h1>
          <p className="text-gray-500">Create tests, manage questions, and review student attempt performance.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-xl transition-all shadow-md hover:shadow-lg"
        >
          <Plus className="w-5 h-5" /> Create Mock Test
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Mock Tests List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-bold text-gray-700 border-b border-gray-150 pb-2">Active Mock Tests</h2>
          {loadingTests ? (
            <div className="space-y-3">
              {[1, 2].map(n => (
                <div key={n} className="bg-white border rounded-2xl h-24 animate-pulse"></div>
              ))}
            </div>
          ) : tests.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center text-gray-500 shadow-sm">
              <BookOpen className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-semibold">No tests created yet.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold mt-2 inline-block"
              >
                Create one now &rarr;
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {tests.map(test => {
                const isSelected = selectedTest?.id === test.id;
                return (
                  <div
                    key={test.id}
                    className={`bg-white border rounded-2xl p-4 transition-all shadow-sm flex flex-col justify-between cursor-pointer ${
                      isSelected ? 'border-blue-600 ring-2 ring-blue-50/50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedTest(test)}
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-gray-800 text-sm line-clamp-2">{test.name}</h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTest(test.id);
                        }}
                        className="text-gray-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="flex justify-between items-center mt-4 text-xs text-gray-500 font-semibold border-t border-gray-50 pt-3">
                      <div className="flex gap-3">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{test.duration}m</span>
                        <span className="flex items-center gap-1"><HelpCircle className="w-3.5 h-3.5" />{test.question_count} Qs</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePublishToggle(test);
                        }}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-colors uppercase ${
                          test.is_published === 1
                            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                            : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'
                        }`}
                      >
                        {test.is_published === 1 ? 'Published' : 'Draft'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Selected Test Details */}
        <div className="lg:col-span-2">
          {selectedTest ? (
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm min-h-[500px] flex flex-col justify-between">
              <div>
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-5 mb-6">
                  <div>
                    <h2 className="text-xl font-extrabold text-gray-800">{selectedTest.name}</h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Duration: <strong className="text-gray-700">{selectedTest.duration} minutes</strong> • Total Questions:{' '}
                      <strong className="text-gray-700">{selectedTest.questions?.length || 0}</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePublishToggle(selectedTest)}
                      className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors uppercase ${
                        selectedTest.is_published === 1
                          ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                          : 'bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500'
                      }`}
                    >
                      {selectedTest.is_published === 1 ? 'Unpublish Test' : 'Publish Test'}
                    </button>
                  </div>
                </div>

                {/* Tabs selection */}
                <div className="flex border-b border-gray-150 mb-6 text-sm font-semibold">
                  <button
                    onClick={() => setActiveTab('questions')}
                    className={`py-3 px-4 border-b-2 -mb-px transition-all ${
                      activeTab === 'questions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Questions ({selectedTest.questions?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab('results')}
                    className={`py-3 px-4 border-b-2 -mb-px transition-all ${
                      activeTab === 'results' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Student Attempts
                  </button>
                </div>

                {/* Tab content: Questions List */}
                {activeTab === 'questions' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-extrabold text-gray-700 text-base">Questions List</h3>
                      <button
                        onClick={openAddQuestion}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-bold border-2 border-blue-100 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Question
                      </button>
                    </div>

                    {!selectedTest.questions || selectedTest.questions.length === 0 ? (
                      <div className="border border-dashed border-gray-250 rounded-2xl p-12 text-center text-gray-400">
                        <FileText className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                        <p className="text-sm font-semibold">No questions added yet.</p>
                        <p className="text-xs mt-1">Add single MCQs, multiple MCQs, or numericals.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {selectedTest.questions.map((q, idx) => (
                          <div key={q.id} className="border border-gray-150 rounded-2xl p-5 hover:border-gray-300 transition-colors">
                            <div className="flex justify-between items-start gap-4">
                              <span className="bg-gray-100 text-gray-700 text-[10px] font-extrabold px-2.5 py-1 rounded-md uppercase">
                                Q{idx + 1} - {q.question_type}
                              </span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => openEditQuestion(q)}
                                  className="text-gray-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteQuestion(q.id)}
                                  className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            
                            <p className="text-sm text-gray-800 font-semibold mt-3 whitespace-pre-line leading-relaxed">
                              {q.question_text}
                            </p>

                            {q.image_url && (
                              <div className="mt-3 max-h-40 overflow-hidden border border-gray-100 rounded-lg inline-block">
                                <img src={q.image_url} alt="Question" className="object-contain max-h-40 max-w-full" />
                              </div>
                            )}

                            {/* Correct options description */}
                            <div className="mt-4 pt-3 border-t border-gray-50 flex flex-wrap gap-4 text-xs font-semibold">
                              <div className="text-green-700">
                                Correct Answer:{' '}
                                <span className="font-extrabold">
                                  {q.question_type === 'NUMERICAL'
                                    ? q.correct_answer[0]
                                    : q.correct_answer.map(idx => String.fromCharCode(65 + idx)).join(', ')}
                                </span>
                              </div>
                              <div className="text-gray-500">Marks: +{q.marks} / {q.negative_marks}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab content: Student Attempts */}
                {activeTab === 'results' && (
                  <div className="space-y-4">
                    <h3 className="font-extrabold text-gray-700 text-base">Student Attempts History</h3>
                    
                    {loadingAttempts ? (
                      <div className="text-center py-12 text-gray-500 font-semibold">
                        Loading student logs...
                      </div>
                    ) : attempts.length === 0 ? (
                      <div className="border border-dashed border-gray-250 rounded-2xl p-12 text-center text-gray-400">
                        <CheckCircle className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                        <p className="text-sm font-semibold">No student attempts recorded yet.</p>
                        <p className="text-xs mt-1">Publish the test and share it with students!</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-gray-150 rounded-2xl">
                        <table className="w-full text-left border-collapse text-xs md:text-sm">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-150 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                              <th className="p-4">Student Name</th>
                              <th className="p-4">Score</th>
                              <th className="p-4">Accuracy</th>
                              <th className="p-4">Time Taken</th>
                              <th className="p-4">Date</th>
                              <th className="p-4">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                            {attempts.map((att) => (
                              <tr key={att.id} className="hover:bg-gray-50/50">
                                <td className="p-4 font-bold text-gray-900">{att.student_name}</td>
                                <td className="p-4 text-blue-600 font-extrabold">{att.score}</td>
                                <td className="p-4">{att.accuracy}%</td>
                                <td className="p-4">{formatTime(att.time_taken)}</td>
                                <td className="p-4 text-gray-500">{new Date(att.submitted_at).toLocaleDateString()}</td>
                                <td className="p-4">
                                  <a
                                    href={`/results/${att.id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                                  >
                                    <Eye className="w-3.5 h-3.5" /> Review
                                  </a>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 border-dashed rounded-3xl p-12 text-center text-gray-400 min-h-[500px] flex flex-col justify-center items-center">
              <BookOpen className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-lg font-bold text-gray-700">No Test Selected</p>
              <p className="text-sm mt-1 max-w-sm">
                Select an existing mock test from the left panel, or click "Create Mock Test" to build a new one.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Test Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-gray-100 animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">Create New Mock Test</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTest} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Test Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. webapple Mock Physics Test 01"
                  value={newTestName}
                  onChange={(e) => setNewTestName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Duration (in Minutes)</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 180"
                  value={newTestDuration}
                  onChange={(e) => setNewTestDuration(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-50">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 px-4 border border-gray-205 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm text-sm"
                >
                  Create Test
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Question Modal */}
      {showQuestionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl border border-gray-100 my-8 animate-slide-up">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-3">
              <h3 className="text-xl font-bold text-gray-800">
                {editingQuestion ? 'Edit Question' : 'Add New Question'}
              </h3>
              <button
                onClick={() => setShowQuestionModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-5">
              {/* Question Text */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Question Description (Text)</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Enter the question contents here. Supports multi-line formatting..."
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium"
                />
              </div>

              {/* Question Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Question Type</label>
                  <select
                    value={qType}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setQType(val);
                      if (val === 'NUMERICAL') {
                        setQCorrect([]);
                      } else {
                        setQCorrect([]);
                        setQNumericalAns('');
                      }
                    }}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                  >
                    <option value="SINGLE">Single Correct MCQ</option>
                    <option value="MULTIPLE">Multiple Correct MCQ</option>
                    <option value="NUMERICAL">Numerical Answer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Positive Marks</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.5"
                    value={qMarks}
                    onChange={(e) => setQMarks(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Negative Marking</label>
                  <input
                    type="number"
                    required
                    step="0.5"
                    value={qNegMarks}
                    onChange={(e) => setQNegMarks(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                  />
                </div>
              </div>

              {/* Image URL Optional */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Question Image URL (Optional)</label>
                <input
                  type="text"
                  placeholder="https://example.com/question-graph.png"
                  value={qImageUrl}
                  onChange={(e) => setQImageUrl(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Options Setup (MCQs only) */}
              {qType !== 'NUMERICAL' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-semibold text-gray-700">Options & Correct Selection</label>
                    <p className="text-[10px] text-gray-400 font-bold">CLICK BULLET TO MARK CORRECT</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {qOptions.map((opt, idx) => {
                      const isCorrect = qCorrect.includes(idx);
                      return (
                        <div key={idx} className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleCorrectOptionToggle(idx)}
                            className={`w-6 h-6 flex items-center justify-center rounded-full border-2 font-bold text-xs flex-shrink-0 transition-colors ${
                              isCorrect 
                                ? 'bg-green-600 text-white border-green-600' 
                                : 'border-gray-300 hover:border-gray-400 text-gray-500'
                            }`}
                          >
                            {String.fromCharCode(65 + idx)}
                          </button>
                          <input
                            type="text"
                            required
                            placeholder={`Option ${String.fromCharCode(65 + idx)} description`}
                            value={opt}
                            onChange={(e) => handleOptionChange(idx, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Correct answer text (Numerical only) */}
              {qType === 'NUMERICAL' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Correct Numerical Answer</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 15.5 or -4"
                    value={qNumericalAns}
                    onChange={(e) => setQNumericalAns(e.target.value)}
                    className="max-w-xs w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold text-gray-800"
                  />
                </div>
              )}

              {/* Detailed Explanation */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Detailed Solution & Explanation</label>
                <textarea
                  rows={3}
                  placeholder="Explain how to solve this question. Displayed on results page..."
                  value={qExplanation}
                  onChange={(e) => setQExplanation(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                />
              </div>

              {/* Footer */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(false)}
                  className="flex-1 py-2.5 px-4 border border-gray-205 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm text-sm"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


