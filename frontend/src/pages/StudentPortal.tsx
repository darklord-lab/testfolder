import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, HelpCircle, Award, ChevronRight, User } from 'lucide-react';

interface Test {
  id: number;
  name: string;
  duration: number;
  question_count: number;
  attempt_count: number;
}

export default function StudentPortal() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [studentName, setStudentName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/tests?published=true');
      if (!response.ok) throw new Error('Failed to fetch tests');
      const data = await response.json();
      setTests(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) return;
    if (selectedTest) {
      // Redirect to test attempt page, passing the student name in state
      navigate(`/attempt/${selectedTest.id}`, { state: { studentName: studentName.trim() } });
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-3xl p-8 md:p-12 text-white shadow-xl mb-12 relative overflow-hidden">
        <div className="relative z-10 md:max-w-2xl">
          <span className="bg-blue-500/30 text-blue-200 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
            Student Portal
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold mt-4 mb-4 tracking-tight">
            Crack Your webapple Exams with Real-Time Mock Tests
          </h1>
          <p className="text-blue-100 text-base md:text-lg mb-6 leading-relaxed">
            Experience the real NTA webapple Computer Based Test (CBT) environment. Build speed, accuracy, and confidence.
          </p>
          <div className="flex flex-wrap gap-4 text-sm text-blue-100">
            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg">
              <Clock className="w-4 h-4" /> Real Exam Timer
            </span>
            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg">
              <HelpCircle className="w-4 h-4" /> Multi-Type Questions
            </span>
            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg">
              <Award className="w-4 h-4" /> Detailed Analytics
            </span>
          </div>
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-15 hidden md:block bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-400 via-indigo-500 to-transparent"></div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Available Mock Tests</h2>
        <p className="text-gray-500">Select a mock test below to test your preparation. No registration or login required.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white rounded-2xl p-6 border border-gray-100 animate-pulse h-48"></div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          Failed to load mock tests. Please check if backend is running. Error: {error}
        </div>
      ) : tests.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-12 text-center text-gray-500">
          <BookOpen className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className="text-lg font-semibold text-gray-700">No Tests Available</p>
          <p className="text-sm mt-1">Ask the teacher to publish mock tests from the dashboard!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests.map((test) => (
            <div
              key={test.id}
              className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                <h3 className="font-bold text-lg text-gray-800 group-hover:text-blue-600 transition-colors mb-3">
                  {test.name}
                </h3>
                <div className="space-y-2 mb-6 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>Duration: <strong className="text-gray-700">{test.duration} Minutes</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-gray-400" />
                    <span>Questions: <strong className="text-gray-700">{test.question_count} Qs</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-gray-400" />
                    <span>Attempts: <strong className="text-gray-700">{test.attempt_count} times</strong></span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedTest(test)}
                className="w-full flex items-center justify-center gap-1 bg-gray-50 hover:bg-blue-600 text-gray-700 hover:text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 group-hover:bg-blue-50 group-hover:text-blue-700 group-hover:hover:bg-blue-600 group-hover:hover:text-white"
              >
                Attempt Test <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Start Test Name Modal */}
      {selectedTest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-gray-100 animate-slide-up">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Prepare for Mock Test</h3>
            <p className="text-sm text-gray-500 mb-6">
              You are about to start <strong className="text-gray-700">"{selectedTest.name}"</strong>. Please enter your name to track your attempt.
            </p>

            <form onSubmit={handleStartTest} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Your Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                    autoFocus
                  />
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 text-xs text-blue-800 space-y-1">
                <p className="font-semibold">Test Instructions:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Total duration is {selectedTest.duration} minutes.</li>
                  <li>Questions can be MCQ (Single/Multiple Correct) or Numerical.</li>
                  <li>Do not close or refresh the window while taking the test.</li>
                  <li>The test will automatically submit when the timer ends.</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTest(null);
                    setStudentName('');
                  }}
                  className="flex-1 py-3 px-4 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-sm"
                >
                  Start Test
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
