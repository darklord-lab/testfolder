import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, HelpCircle, Award, ChevronRight, User, Star, Layers, FileText, X } from 'lucide-react';

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
  const [rollNumber, setRollNumber] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchTests();
  }, []);

  useEffect(() => {
    if (selectedTest) {
      const cached = localStorage.getItem('currentUser');
      if (cached) {
        const user = JSON.parse(cached);
        if (user.role === 'student') {
          setStudentName(user.name || '');
          setRollNumber(user.rollNumber || '');
        } else if (user.role === 'admin') {
          setStudentName('Admin Preview');
          setRollNumber('VU1FADMIN');
        }
      }
    }
  }, [selectedTest]);

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
      // Redirect to test attempt page, passing studentName and rollNumber
      navigate(`/attempt/${selectedTest.id}`, { 
        state: { 
          studentName: studentName.trim(),
          rollNumber: rollNumber.trim() || 'VU1F2122'
        } 
      });
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in select-none">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 animate-slide-up">
            {/* Header Banner */}
            <div className="bg-[#0f294a] text-white px-6 py-4 flex items-center justify-between border-b border-blue-950">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center border-2 border-white/20 bg-blue-600/30 rounded text-[#fbbf24] rotate-180 flex-shrink-0">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 3l10 18H2L12 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base md:text-lg tracking-tight uppercase flex items-center gap-2">
                    <span className="text-[#fbbf24] font-black">{selectedTest.name}</span>
                  </h3>
                  <p className="text-[10px] text-gray-300 font-bold uppercase tracking-wider">Mock Test — 2025</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedTest(null);
                  setStudentName('');
                  setRollNumber('');
                }}
                className="text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Metadata Stats Row */}
            <div className="bg-[#f8fafc] border-b border-gray-150 py-3 px-6 grid grid-cols-4 text-center divide-x divide-gray-200 select-none">
              <div>
                <div className="flex items-center justify-center gap-1.5 text-[#0f294a] text-xs font-black">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span>{selectedTest.duration >= 60 ? `${Math.floor(selectedTest.duration / 60)} Hours` : `${selectedTest.duration} Mins`}</span>
                </div>
                <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">DURATION</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1.5 text-[#0f294a] text-xs font-black">
                  <FileText className="w-3.5 h-3.5 text-gray-400" />
                  <span>{selectedTest.question_count} Qs</span>
                </div>
                <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">QUESTIONS</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1.5 text-[#0f294a] text-xs font-black">
                  <Star className="w-3.5 h-3.5 text-gray-400" />
                  <span>{selectedTest.question_count * 4} Marks</span>
                </div>
                <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">MAX MARKS</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1.5 text-[#0f294a] text-xs font-black">
                  <Layers className="w-3.5 h-3.5 text-gray-400" />
                  <span>3 Subjects</span>
                </div>
                <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">SECTIONS</p>
              </div>
            </div>

            <form onSubmit={handleStartTest} className="mt-4">
              {/* Form Title */}
              <div className="px-6">
                <h4 className="text-[#0f294a] text-base font-black tracking-tight">Student Login</h4>
                <p className="text-[11px] text-gray-400 font-medium">Enter your details to begin the test. These will be shown throughout the exam.</p>
              </div>

              {/* Input Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 mt-4">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 mb-2">
                    <User className="w-4 h-4 text-purple-600" />
                    <span>Full Name</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Soham Nandanwar"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-800 text-sm bg-white"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 mb-2">
                    <span className="w-4 h-4 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-black font-mono">ID</span>
                    <span>Roll Number</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VU1F2122"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-800 text-sm bg-white"
                  />
                </div>
              </div>

              {/* Instructions Yellow Panel */}
              <div className="bg-amber-50/75 border border-amber-200/60 p-4 rounded-xl text-xs text-amber-800 mx-6 mt-6">
                <p className="font-bold flex items-center gap-1.5 mb-2">
                  <span>⚠️</span> Before you begin:
                </p>
                <ul className="space-y-1.5 pl-3 font-semibold text-[11px] text-amber-700/90">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">&rsaquo;</span>
                    <span>Ensure a stable internet connection.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">&rsaquo;</span>
                    <span>Do <strong className="underline text-red-700">not</strong> refresh or close the browser during the test.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">&rsaquo;</span>
                    <span>The timer starts as soon as you click Start Test.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">&rsaquo;</span>
                    <span>Mark answers carefully — negative marking applies.</span>
                  </li>
                </ul>
              </div>

              {/* Action Button */}
              <div className="px-6 py-6">
                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#0f294a] hover:bg-[#153a66] text-white font-extrabold text-sm rounded-xl tracking-wider transition-colors shadow-md uppercase cursor-pointer"
                >
                  Start Test &rarr;
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
