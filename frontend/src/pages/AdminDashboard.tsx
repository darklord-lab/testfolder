import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Shield, GraduationCap, Plus, Trash2, LogOut, BookOpen, UserCheck, Key, Eye, EyeOff, UploadCloud, RefreshCw, X, Check, CheckCircle2, AlertTriangle, FileSpreadsheet } from 'lucide-react';

interface Teacher {
  id: number;
  name: string;
  username: string;
  password?: string;
  created_at: string;
}

interface Student {
  id: number;
  name: string;
  roll_number: string;
  username: string;
  password?: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'teachers' | 'students' | 'question_bank'>('teachers');
  
  // Lists
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [chapterSets, setChapterSets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSets, setLoadingSets] = useState(false);

  // Teacher Form State
  const [tName, setTName] = useState('');
  const [tUsername, setTUsername] = useState('');
  const [tPassword, setTPassword] = useState('');
  const [tError, setTError] = useState('');
  const [tSuccess, setTSuccess] = useState('');

  // Student Form State
  const [sName, setSName] = useState('');
  const [sRollNumber, setSRollNumber] = useState('');
  const [sUsername, setSUsername] = useState('');
  const [sPassword, setSPassword] = useState('');
  const [sError, setSError] = useState('');
  const [sSuccess, setSSuccess] = useState('');

  // Password visibility states
  const [showTPassword, setShowTPassword] = useState(false);
  const [showSPassword, setShowSPassword] = useState(false);

  const navigate = useNavigate();

  // Category bank selection state
  const [bankCategory, setBankCategory] = useState<'JEE' | 'NEET'>('JEE');

  // Modal states for Add Set
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalExam, setModalExam] = useState<'JEE' | 'NEET'>('JEE');
  const [modalSubject, setModalSubject] = useState<string>('Physics');
  const [modalChapter, setModalChapter] = useState('');
  const [modalDifficulty, setModalDifficulty] = useState('hard');
  const [modalYear, setModalYear] = useState(new Date().getFullYear().toString());
  const [modalFile, setModalFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // View questions modal states
  const [selectedSetQuestions, setSelectedSetQuestions] = useState<{ exam: string; subject: string; chapter: string } | null>(null);
  const [questionsList, setQuestionsList] = useState<any[]>([]);
  const [loadingQuestionsList, setLoadingQuestionsList] = useState(false);
  const [questionsListError, setQuestionsListError] = useState('');

  const fetchSetQuestions = async (exam: string, subject: string, chapter: string) => {
    try {
      setLoadingQuestionsList(true);
      setQuestionsListError('');
      const response = await fetch(`http://localhost:5000/api/questions?exam=${encodeURIComponent(exam)}&subject=${encodeURIComponent(subject)}&chapter=${encodeURIComponent(chapter)}`);
      if (!response.ok) throw new Error('Failed to fetch questions for this chapter');
      const data = await response.json();
      
      // Filter only general questions (test_id is null)
      const filtered = data.filter((q: any) => q.test_id === null || q.test_id === undefined);
      setQuestionsList(filtered);
    } catch (err: any) {
      setQuestionsListError(err.message || 'Error fetching questions.');
    } finally {
      setLoadingQuestionsList(false);
    }
  };

  const handleOpenQuestionsModal = (exam: string, subject: string, chapter: string) => {
    setSelectedSetQuestions({ exam, subject, chapter });
    fetchSetQuestions(exam, subject, chapter);
  };

  const handleDeleteQuestionFromSet = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      const response = await fetch(`http://localhost:5000/api/questions/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete question');
      
      // Remove from state
      setQuestionsList(prev => prev.filter(q => q.id !== id));
      
      // Refresh general sets count on dashboard
      fetchChapterSets();
    } catch (err: any) {
      alert(err.message || 'Error deleting question');
    }
  };

  const openAddModal = (exam: 'JEE' | 'NEET', subject: string) => {
    setModalExam(exam);
    setModalSubject(subject === 'Math' || subject === 'Mathematics' ? 'Mathematics' : subject);
    setModalChapter('');
    setModalFile(null);
    setUploadError('');
    setUploadSuccess('');
    setIsAddModalOpen(true);
  };

  const handleModalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      if (ext === 'xlsx' || ext === 'xls' || ext === 'pdf') {
        setModalFile(selectedFile);
        setUploadError('');
      } else {
        setUploadError('Unsupported format! Please upload Excel (.xlsx, .xls) or PDF (.pdf).');
        setModalFile(null);
      }
    }
  };

  const handleUploadSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalFile) {
      setUploadError('Please select an Excel or PDF file to upload.');
      return;
    }
    if (!modalChapter.trim()) {
      setUploadError('Please enter a Chapter Name.');
      return;
    }

    try {
      setUploadLoading(true);
      setUploadError('');
      setUploadSuccess('');

      const formData = new FormData();
      formData.append('file', modalFile);
      formData.append('exam', modalExam);
      formData.append('subject', modalSubject);
      formData.append('chapter', modalChapter.trim());
      formData.append('difficulty', modalDifficulty);
      formData.append('year', modalYear);
      formData.append('forceMetadata', 'true');

      const response = await fetch('http://localhost:5000/api/import-questions', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload and save question set.');
      }

      setUploadSuccess(`Successfully imported ${data.inserted} questions for ${modalExam} - ${modalSubject} - ${modalChapter.trim()}!`);
      
      // Refresh the sets list
      fetchChapterSets();
      
      // Close modal after a short delay
      setTimeout(() => {
        setIsAddModalOpen(false);
        setModalFile(null);
        setModalChapter('');
        setUploadSuccess('');
      }, 1500);

    } catch (err: any) {
      setUploadError(err.message || 'Something went wrong during file upload.');
    } finally {
      setUploadLoading(false);
    }
  };

  // Route security check
  useEffect(() => {
    const cached = localStorage.getItem('currentUser');
    if (!cached) {
      navigate('/');
      return;
    }
    const user = JSON.parse(cached);
    if (user.role !== 'admin') {
      navigate('/');
    } else {
      fetchData();
    }
  }, [navigate]);

  useEffect(() => {
    if (activeTab === 'question_bank') {
      fetchChapterSets();
    }
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchTeachers(), fetchStudents()]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchChapterSets = async () => {
    try {
      setLoadingSets(true);
      const response = await fetch('http://localhost:5000/api/admin/chapter-sets');
      if (!response.ok) throw new Error('Failed to fetch chapter sets');
      const data = await response.json();
      setChapterSets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSets(false);
    }
  };

  const handleDeleteChapterSet = async (exam: string, subject: string, chapter: string) => {
    if (!window.confirm(`Are you sure you want to delete the entire question set for ${exam} - ${subject} - ${chapter}?`)) return;
    try {
      const response = await fetch(
        `http://localhost:5000/api/admin/chapter-sets?exam=${encodeURIComponent(exam)}&subject=${encodeURIComponent(subject)}&chapter=${encodeURIComponent(chapter)}`,
        { method: 'DELETE' }
      );
      if (!response.ok) throw new Error('Failed to delete chapter set');
      const data = await response.json();
      alert(data.message || 'Chapter question set deleted successfully.');
      fetchChapterSets();
    } catch (err: any) {
      alert(err.message || 'Error deleting chapter set.');
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/teachers');
      if (!response.ok) throw new Error('Failed to fetch teachers');
      const data = await response.json();
      setTeachers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/students');
      if (!response.ok) throw new Error('Failed to fetch students');
      const data = await response.json();
      setStudents(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setTError('');
    setTSuccess('');

    if (!tName.trim() || !tUsername.trim() || !tPassword) return;

    try {
      const response = await fetch('http://localhost:5000/api/admin/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tName.trim(), username: tUsername.trim(), password: tPassword }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add teacher');

      setTSuccess('Teacher added successfully!');
      setTName('');
      setTUsername('');
      setTPassword('');
      fetchTeachers();
    } catch (err: any) {
      setTError(err.message || 'Error occurred');
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSError('');
    setSSuccess('');

    if (!sName.trim() || !sRollNumber.trim() || !sUsername.trim() || !sPassword) return;

    try {
      const response = await fetch('http://localhost:5000/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sName.trim(),
          roll_number: sRollNumber.trim(),
          username: sUsername.trim(),
          password: sPassword
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add student');

      setSSuccess('Student added successfully!');
      setSName('');
      setSRollNumber('');
      setSUsername('');
      setSPassword('');
      fetchStudents();
    } catch (err: any) {
      setSError(err.message || 'Error occurred');
    }
  };

  const handleDeleteTeacher = async (id: number) => {
    if (!window.confirm('Are you sure you want to remove this teacher?')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/admin/teachers/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete teacher');
      fetchTeachers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteStudent = async (id: number) => {
    if (!window.confirm('Are you sure you want to remove this student?')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/admin/students/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete student');
      fetchStudents();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans select-none">
      {/* Top Header */}
      <header className="bg-[#0f294a] text-white px-6 py-4 flex justify-between items-center shadow-md border-b border-blue-950">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600/30 p-2 rounded-xl border border-blue-400/30 text-white flex items-center justify-center">
            <Shield className="w-5.5 h-5.5" />
          </div>
          <div>
            <h1 className="font-extrabold text-white text-base md:text-lg tracking-tight uppercase flex items-center gap-2">
              <span>Admin Dashboard</span>
              <span className="bg-[#1d3d63] text-blue-300 text-[10px] normal-case font-black px-2.5 py-0.5 rounded border border-blue-800">
                Control Center
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/import')}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-650 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow hover:shadow-lg transition-all cursor-pointer uppercase tracking-wider border border-blue-500/20"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Import Questions</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-4.5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow hover:shadow-lg transition-all cursor-pointer uppercase tracking-wider"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main content grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 select-none">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
            <div>
              <p className="text-xs text-gray-400 font-extrabold uppercase tracking-widest">Active Teachers</p>
              <h3 className="text-3xl font-black text-[#0f294a] mt-1">{loading ? '...' : teachers.length}</h3>
            </div>
            <div className="bg-blue-50 text-blue-600 p-4 rounded-2xl">
              <UserCheck className="w-8 h-8" />
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
            <div>
              <p className="text-xs text-gray-400 font-extrabold uppercase tracking-widest">Enrolled Students</p>
              <h3 className="text-3xl font-black text-[#0f294a] mt-1">{loading ? '...' : students.length}</h3>
            </div>
            <div className="bg-purple-50 text-purple-600 p-4 rounded-2xl">
              <GraduationCap className="w-8 h-8" />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-250 mb-8 text-sm font-bold select-none">
          <button
            onClick={() => setActiveTab('teachers')}
            className={`flex items-center gap-1.5 py-3.5 px-5 border-b-2 -mb-px transition-all cursor-pointer ${
              activeTab === 'teachers'
                ? 'border-blue-600 text-blue-600 font-black'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <UserCheck className="w-4.5 h-4.5" />
            <span>Teachers Directory ({teachers.length})</span>
          </button>
          
          <button
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-1.5 py-3.5 px-5 border-b-2 -mb-px transition-all cursor-pointer ${
              activeTab === 'students'
                ? 'border-blue-600 text-blue-600 font-black'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <GraduationCap className="w-4.5 h-4.5" />
            <span>Students Directory ({students.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('question_bank')}
            className={`flex items-center gap-1.5 py-3.5 px-5 border-b-2 -mb-px transition-all cursor-pointer ${
              activeTab === 'question_bank'
                ? 'border-blue-600 text-blue-600 font-black'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BookOpen className="w-4.5 h-4.5" />
            <span>Question Bank Sets</span>
          </button>
        </div>

        {/* Tab Contents: Manage Teachers */}
        {activeTab === 'teachers' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Add Teacher form */}
            <div className="lg:col-span-1">
              <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
                <h3 className="text-lg font-black text-gray-800 mb-5 flex items-center gap-1.5">
                  <Plus className="w-5 h-5 text-blue-600" /> Add New Teacher
                </h3>

                {tError && (
                  <div className="bg-red-50 text-red-700 text-xs font-semibold p-3.5 rounded-xl border border-red-200 mb-4 animate-shake">
                    {tError}
                  </div>
                )}
                {tSuccess && (
                  <div className="bg-green-50 text-green-700 text-xs font-semibold p-3.5 rounded-xl border border-green-200 mb-4">
                    {tSuccess}
                  </div>
                )}

                <form onSubmit={handleAddTeacher} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Teacher Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Rajesh Kumar"
                      value={tName}
                      onChange={(e) => setTName(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-sm text-gray-850"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Username</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                      <input
                        type="text"
                        required
                        placeholder="rajesh_teacher"
                        value={tUsername}
                        onChange={(e) => setTUsername(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-sm text-gray-850"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Password</label>
                    <div className="relative">
                      <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                      <input
                        type={showTPassword ? 'text' : 'password'}
                        required
                        placeholder="Create password"
                        value={tPassword}
                        onChange={(e) => setTPassword(e.target.value)}
                        className="w-full pl-11 pr-10 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-sm text-gray-855"
                      />
                      <button
                        type="button"
                        onClick={() => setShowTPassword(!showTPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer flex items-center justify-center"
                        title={showTPassword ? 'Hide Password' : 'Show Password'}
                      >
                        {showTPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#0f294a] hover:bg-[#153a66] text-white font-extrabold text-xs rounded-xl uppercase tracking-wider shadow transition-colors cursor-pointer mt-4"
                  >
                    Add Teacher Account
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: Teachers list */}
            <div className="lg:col-span-2">
              <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
                <h3 className="text-lg font-black text-gray-800 mb-5 flex items-center gap-1.5">
                  <BookOpen className="w-5 h-5 text-blue-600" /> Teachers Directory
                </h3>

                {loading ? (
                  <div className="text-center py-12 text-gray-500 font-semibold">Loading teachers directory...</div>
                ) : teachers.length === 0 ? (
                  <div className="border border-dashed border-gray-200 rounded-2xl p-12 text-center text-gray-400">
                    <User className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                    <p className="text-sm font-semibold">No teachers added yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-gray-150 rounded-2xl">
                    <table className="w-full text-left border-collapse text-xs md:text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-150 text-gray-500 font-bold uppercase text-[10px] tracking-wider select-none">
                          <th className="p-4">Teacher Name</th>
                          <th className="p-4">Username</th>
                          <th className="p-4">Password</th>
                          <th className="p-4">Date Added</th>
                          <th className="p-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                        {teachers.map((teacher) => (
                          <tr key={teacher.id} className="hover:bg-gray-50/50">
                            <td className="p-4 font-bold text-gray-900">{teacher.name}</td>
                            <td className="p-4 text-blue-600 font-semibold">{teacher.username}</td>
                            <td className="p-4 font-mono text-gray-600 font-bold bg-slate-50/30">{teacher.password || '—'}</td>
                            <td className="p-4 text-gray-500">{new Date(teacher.created_at).toLocaleDateString()}</td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => handleDeleteTeacher(teacher.id)}
                                className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                title="Remove Teacher"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab Contents: Manage Students */}
        {activeTab === 'students' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Add Student form */}
            <div className="lg:col-span-1">
              <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
                <h3 className="text-lg font-black text-gray-800 mb-5 flex items-center gap-1.5">
                  <Plus className="w-5 h-5 text-purple-600" /> Add New Student
                </h3>

                {sError && (
                  <div className="bg-red-50 text-red-700 text-xs font-semibold p-3.5 rounded-xl border border-red-200 mb-4 animate-shake">
                    {sError}
                  </div>
                )}
                {sSuccess && (
                  <div className="bg-green-50 text-green-700 text-xs font-semibold p-3.5 rounded-xl border border-green-200 mb-4">
                    {sSuccess}
                  </div>
                )}

                <form onSubmit={handleAddStudent} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Student Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Soham Nandanwar"
                      value={sName}
                      onChange={(e) => setSName(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-sm text-gray-850"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Roll Number</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. VU1F2122"
                      value={sRollNumber}
                      onChange={(e) => setSRollNumber(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-sm text-gray-855"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Username</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                      <input
                        type="text"
                        required
                        placeholder="soham_student"
                        value={sUsername}
                        onChange={(e) => setSUsername(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-sm text-gray-850"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Password</label>
                    <div className="relative">
                      <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                      <input
                        type={showSPassword ? 'text' : 'password'}
                        required
                        placeholder="Create password"
                        value={sPassword}
                        onChange={(e) => setSPassword(e.target.value)}
                        className="w-full pl-11 pr-10 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-sm text-gray-855"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSPassword(!showSPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-650 cursor-pointer flex items-center justify-center"
                        title={showSPassword ? 'Hide Password' : 'Show Password'}
                      >
                        {showSPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#0f294a] hover:bg-[#153a66] text-white font-extrabold text-xs rounded-xl uppercase tracking-wider shadow transition-colors cursor-pointer mt-4"
                  >
                    Add Student Account
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: Students list */}
            <div className="lg:col-span-2">
              <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
                <h3 className="text-lg font-black text-gray-800 mb-5 flex items-center gap-1.5">
                  <GraduationCap className="w-5.5 h-5.5 text-purple-650 text-blue-600" /> Students Directory
                </h3>

                {loading ? (
                  <div className="text-center py-12 text-gray-500 font-semibold">Loading students directory...</div>
                ) : students.length === 0 ? (
                  <div className="border border-dashed border-gray-200 rounded-2xl p-12 text-center text-gray-400">
                    <GraduationCap className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                    <p className="text-sm font-semibold">No students added yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-gray-150 rounded-2xl">
                    <table className="w-full text-left border-collapse text-xs md:text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-150 text-gray-500 font-bold uppercase text-[10px] tracking-wider select-none">
                          <th className="p-4">Student Name</th>
                          <th className="p-4">Roll Number</th>
                          <th className="p-4">Username</th>
                          <th className="p-4">Password</th>
                          <th className="p-4">Date Enrolled</th>
                          <th className="p-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                        {students.map((student) => (
                          <tr key={student.id} className="hover:bg-gray-50/50">
                            <td className="p-4 font-bold text-gray-900">{student.name}</td>
                            <td className="p-4 text-slate-600 font-bold">{student.roll_number}</td>
                            <td className="p-4 text-blue-600 font-semibold">{student.username}</td>
                            <td className="p-4 font-mono text-gray-600 font-bold bg-slate-50/30">{student.password || '—'}</td>
                            <td className="p-4 text-gray-500">{new Date(student.created_at).toLocaleDateString()}</td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => handleDeleteStudent(student.id)}
                                className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                title="Remove Student"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab Contents: Question Bank Sets */}
        {activeTab === 'question_bank' && (() => {
          const categorySubjects = {
            JEE: ['Physics', 'Chemistry', 'Math'],
            NEET: ['Physics', 'Chemistry', 'Biology']
          };
          const activeSubjects = categorySubjects[bankCategory];
          const getFilteredSets = (subject: string) => {
            return chapterSets.filter(
              (set) => 
                (set.exam?.toUpperCase() === bankCategory) && 
                (set.subject?.toLowerCase() === subject.toLowerCase() ||
                 (subject === 'Math' && (set.subject?.toLowerCase()?.includes('math') || set.subject?.toLowerCase()?.includes('mathematics'))) ||
                 (subject === 'Biology' && (set.subject?.toLowerCase()?.includes('bio') || set.subject?.toLowerCase()?.includes('botany') || set.subject?.toLowerCase()?.includes('zoology'))))
            );
          };

          return (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              {/* Question Bank Header and Controls */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 border-b border-slate-100 pb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <BookOpen className="w-5.5 h-5.5 text-blue-600" />
                    <span>Question Bank Repository</span>
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold mt-1">
                    Manage and upload chapter-wise question sets loaded in the general pool.
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                  {/* Category Tabs */}
                  <div className="bg-slate-100/80 p-1 rounded-2xl flex border border-slate-200 shadow-inner w-full sm:w-auto">
                    <button
                      onClick={() => {
                        setBankCategory('JEE');
                        if (modalSubject === 'Biology') setModalSubject('Physics');
                      }}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                        bankCategory === 'JEE'
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${bankCategory === 'JEE' ? 'bg-blue-300' : 'bg-slate-400'}`} />
                      JEE Bank
                    </button>
                    <button
                      onClick={() => {
                        setBankCategory('NEET');
                        if (modalSubject === 'Mathematics') setModalSubject('Physics');
                      }}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                        bankCategory === 'NEET'
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/10'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${bankCategory === 'NEET' ? 'bg-emerald-300' : 'bg-slate-400'}`} />
                      NEET Bank
                    </button>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => openAddModal(bankCategory, 'Physics')}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-905 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer uppercase tracking-wider border border-slate-700/10"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Sets</span>
                    </button>

                    <button
                      onClick={fetchChapterSets}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer bg-white"
                      title="Refresh lists"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingSets ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  </div>
                </div>
              </div>

              {loadingSets ? (
                <div className="text-center py-24 text-slate-500 font-semibold flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="text-sm font-bold tracking-wide">Retrieving Question Bank sets...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {activeSubjects.map((subject) => {
                    const sets = getFilteredSets(subject);
                    // Determine subject theme color
                    const isJEE = bankCategory === 'JEE';
                    const themeColor = isJEE ? 'blue' : 'emerald';
                    
                    return (
                      <div key={subject} className="bg-slate-50/50 border border-slate-200/80 rounded-3xl p-5 flex flex-col h-[540px]">
                        {/* Subject Column Header */}
                        <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-200">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-3 h-3 rounded-full ${
                              isJEE ? 'bg-blue-600' : 'bg-emerald-600'
                            }`} />
                            <h4 className="font-black text-slate-800 text-sm uppercase tracking-wider">
                              {subject}
                            </h4>
                            <span className="text-[10px] bg-slate-200 text-slate-650 font-black px-2.5 py-0.5 rounded-full border border-slate-300/40">
                              {sets.length} {sets.length === 1 ? 'Set' : 'Sets'}
                            </span>
                          </div>
                          
                          <button
                            onClick={() => openAddModal(bankCategory, subject)}
                            className={`flex items-center gap-1 px-3 py-1.5 text-white font-extrabold text-[10px] uppercase rounded-xl shadow-sm hover:shadow transition-all cursor-pointer ${
                              isJEE ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                            title={`Add new ${subject} set`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Set</span>
                          </button>
                        </div>

                        {/* Sets list scrollable area */}
                        <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 custom-scrollbar">
                          {sets.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-white/50">
                              <BookOpen className="w-9 h-9 text-slate-300 mb-2" />
                              <p className="text-xs font-black text-slate-500">No question sets uploaded</p>
                              <p className="text-[10px] text-slate-400 mt-0.5 max-w-[180px]">Upload an Excel file to get started with this subject.</p>
                              <button
                                onClick={() => openAddModal(bankCategory, subject)}
                                className={`text-[10px] font-black mt-3 hover:underline cursor-pointer ${
                                  isJEE ? 'text-blue-600' : 'text-emerald-600'
                                }`}
                              >
                                Upload First Set
                              </button>
                            </div>
                          ) : (
                            sets.map((set, idx) => (
                              <div
                                key={idx}
                                onClick={() => handleOpenQuestionsModal(set.exam, set.subject, set.chapter)}
                                className="bg-white border border-slate-150 hover:border-slate-350 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow transition-all group cursor-pointer hover:bg-slate-50/40"
                              >
                                <div className="flex-1 min-w-0 pr-3">
                                  <p className="font-extrabold text-slate-800 text-xs truncate" title={set.chapter}>
                                    {set.chapter}
                                  </p>
                                  <div className="flex items-center gap-2.5 mt-1.5">
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${
                                      isJEE 
                                        ? 'bg-blue-50 text-blue-700 border-blue-100' 
                                        : 'bg-emerald-50 text-emerald-750 border-emerald-100'
                                    }`}>
                                      {set.question_count} Qs
                                    </span>
                                    {set.year && (
                                      <span className="text-[9px] text-slate-400 font-bold bg-slate-50 px-1.5 py-0.5 rounded border border-slate-150/50">
                                        Yr {set.year}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteChapterSet(set.exam, set.subject, set.chapter);
                                  }}
                                  className="text-slate-400 hover:text-red-650 hover:bg-red-50 p-2 rounded-xl transition-colors cursor-pointer opacity-80 group-hover:opacity-100"
                                  title="Delete Set"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </main>

      {/* Add Set Modal Overlay */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#0f294a] text-white px-6 py-4.5 flex justify-between items-center border-b border-blue-950">
              <div className="flex items-center gap-2.5">
                <div className="bg-blue-600/30 p-2 rounded-xl border border-blue-400/30 text-white flex items-center justify-center">
                  <UploadCloud className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-white">
                    Add Question Set
                  </h3>
                  <p className="text-[9px] text-blue-300/80 font-bold uppercase tracking-widest mt-0.5">Bulk Excel Upload</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <form onSubmit={handleUploadSet} className="p-6 space-y-4">
              {uploadError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl flex items-start gap-2.5 text-xs font-semibold animate-shake">
                  <AlertTriangle className="w-4.5 h-4.5 text-red-500 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-start gap-2.5 text-xs font-semibold animate-pulse">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 flex-shrink-0" />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              {/* Exam Category */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Category (Exam)
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setModalExam('JEE');
                      if (modalSubject === 'Biology') setModalSubject('Physics');
                    }}
                    className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                      modalExam === 'JEE'
                        ? 'bg-blue-600 text-white shadow shadow-blue-500/10'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                    }`}
                  >
                    JEE
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalExam('NEET');
                      if (modalSubject === 'Mathematics') setModalSubject('Physics');
                    }}
                    className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                      modalExam === 'NEET'
                        ? 'bg-emerald-600 text-white shadow shadow-emerald-500/10'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                    }`}
                  >
                    NEET
                  </button>
                </div>
              </div>

              {/* Subject Selector */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Subject
                </label>
                <select
                  value={modalSubject}
                  onChange={(e) => setModalSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  {modalExam === 'JEE' ? (
                    <>
                      <option value="Physics">Physics</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Mathematics">Math</option>
                    </>
                  ) : (
                    <>
                      <option value="Physics">Physics</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Biology">Biology</option>
                    </>
                  )}
                </select>
              </div>

              {/* Chapter Name */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Chapter Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Optics, Electrochemistry"
                  value={modalChapter}
                  onChange={(e) => setModalChapter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder-slate-400 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Difficulty */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Difficulty
                  </label>
                  <select
                    value={modalDifficulty}
                    onChange={(e) => setModalDifficulty(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    <option value="hard">Hard (Mock Default)</option>
                    <option value="medium">Medium</option>
                    <option value="easy">Easy</option>
                  </select>
                </div>

                {/* Year */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Year
                  </label>
                  <input
                    type="number"
                    required
                    value={modalYear}
                    onChange={(e) => setModalYear(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                  />
                </div>
              </div>

              {/* File Upload Zone */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Questions File (Excel/PDF)
                </label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                    modalFile 
                      ? 'border-emerald-500 bg-emerald-50/10' 
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-350'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".xlsx,.xls,.pdf"
                    onChange={handleModalFileChange}
                  />
                  {modalFile ? (
                    <>
                      <FileSpreadsheet className="w-9 h-9 text-emerald-600 mb-1" />
                      <p className="text-xs font-black text-emerald-700 truncate max-w-full">
                        {modalFile.name}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1 font-bold">
                        {(modalFile.size / 1024).toFixed(1)} KB • Click to change file
                      </p>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-9 h-9 text-slate-400 mb-1" />
                      <p className="text-xs font-extrabold text-slate-700">
                        Click to select Excel sheet
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                        Accepts .xlsx, .xls or .pdf format templates
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-150 mt-5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={uploadLoading}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xs rounded-xl uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-55"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadLoading || !modalFile || !modalChapter.trim()}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  {uploadLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving Set...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save & Return</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Questions Modal Overlay */}
      {selectedSetQuestions && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-3xl h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-[#0f294a] text-white px-6 py-4.5 flex justify-between items-center border-b border-blue-950 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="bg-blue-600/30 p-2 rounded-xl border border-blue-400/30 text-white flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-white">
                    Questions in {selectedSetQuestions.chapter}
                  </h3>
                  <p className="text-[9px] text-blue-300/80 font-bold uppercase tracking-widest mt-0.5">
                    {selectedSetQuestions.exam} • {selectedSetQuestions.subject}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSetQuestions(null)}
                className="text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Questions Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/50">
              {loadingQuestionsList ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500 font-semibold">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                  <span>Loading questions from set...</span>
                </div>
              ) : questionsListError ? (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl flex items-start gap-2.5 text-xs font-semibold animate-shake">
                  <AlertTriangle className="w-4.5 h-4.5 text-red-500 flex-shrink-0" />
                  <span>{questionsListError}</span>
                </div>
              ) : questionsList.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                  <BookOpen className="w-12 h-12 mx-auto mb-2 text-slate-350" />
                  <p className="font-bold">No questions found in this set.</p>
                </div>
              ) : (
                questionsList.map((q, idx) => {
                  const correctOpt = q.correct_option?.toLowerCase();
                  
                  // Helper to parse options
                  let options = [q.option_a, q.option_b, q.option_c, q.option_d];
                  if (q.options) {
                    try {
                      const parsed = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
                      if (Array.isArray(parsed) && parsed.length >= 4) {
                        options = parsed;
                      }
                    } catch (e) {}
                  }

                  return (
                    <div key={q.id} className="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm hover:shadow transition-all relative group/q">
                      {/* Top Bar for Question Details and Delete */}
                      <div className="flex justify-between items-start gap-4 mb-3 border-b border-slate-100 pb-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="bg-[#0f294a] text-white text-[10px] font-black px-2.5 py-0.5 rounded-md">
                            Q {idx + 1}
                          </span>
                          {q.difficulty && (
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${
                              q.difficulty === 'hard'
                                ? 'bg-red-50 text-red-650 border-red-100'
                                : q.difficulty === 'medium'
                                  ? 'bg-amber-50 text-amber-700 border-amber-100'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            }`}>
                              {q.difficulty}
                            </span>
                          )}
                          {q.year && (
                            <span className="text-[9px] text-slate-400 font-bold bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                              Yr {q.year}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestionFromSet(q.id)}
                          className="text-slate-355 text-slate-400 hover:text-red-600 p-1.5 rounded-xl hover:bg-red-50 transition-colors cursor-pointer opacity-0 group-hover/q:opacity-100"
                          title="Delete Question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Question Text */}
                      <p className="text-slate-800 text-sm font-bold leading-relaxed mb-4 whitespace-pre-wrap">
                        {q.question_text}
                      </p>

                      {/* Options Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                        {[
                          { key: 'a', val: options[0] || '' },
                          { key: 'b', val: options[1] || '' },
                          { key: 'c', val: options[2] || '' },
                          { key: 'd', val: options[3] || '' }
                        ].map((opt) => {
                          const isCorrect = correctOpt === opt.key;
                          return (
                            <div 
                              key={opt.key}
                              className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs font-semibold leading-relaxed transition-all ${
                                isCorrect 
                                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-800 font-bold' 
                                  : 'bg-slate-50/30 border-slate-150 text-slate-700'
                              }`}
                            >
                              <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black uppercase flex-shrink-0 ${
                                isCorrect 
                                  ? 'bg-emerald-600 text-white' 
                                  : 'bg-slate-150 text-slate-500 border border-slate-250'
                              }`}>
                                {opt.key}
                              </span>
                              <span className="break-words">{opt.val}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation */}
                      {q.explanation && (
                        <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-3.5 text-xs text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">
                          <p className="font-extrabold text-[#0f294a] text-[10px] uppercase tracking-wide mb-1 flex items-center gap-1">
                            <span>💡</span> Explanation
                          </p>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-150 px-6 py-4.5 flex justify-end flex-shrink-0">
              <button
                type="button"
                onClick={() => setSelectedSetQuestions(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl uppercase tracking-wider shadow transition-colors cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
