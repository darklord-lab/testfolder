import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit, Eye, X, BookOpen, Clock, HelpCircle, FileText, CheckCircle, UploadCloud, RefreshCw, AlertTriangle, FileSpreadsheet } from 'lucide-react';


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
  exam?: string;
  section?: string;
  subject?: string;
  chapter?: string;
  difficulty?: string;
  year?: number | string;
  correct_option?: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
}

interface Test {
  id: number;
  name: string;
  duration: number;
  is_published: number;
  question_count: number;
  attempt_count: number;
  questions?: Question[];
  marks?: number;
  negative_marks?: number;
  randomize_questions?: number;
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
  
  // Question Bank State
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [bankQuestions, setBankQuestions] = useState<Question[]>([]);
  const [loadingBank, setLoadingBank] = useState(false);
  const [bankFilterSubject, setBankFilterSubject] = useState('All');
  const [bankFilterExam, setBankFilterExam] = useState('');
  
  // Direct bulk import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [modalFile, setModalFile] = useState<File | null>(null);
  const [modalSubject, setModalSubject] = useState('Physics');
  const [modalChapter, setModalChapter] = useState('General');
  const [modalDifficulty, setModalDifficulty] = useState('medium');
  const [modalYear, setModalYear] = useState(new Date().getFullYear().toString());
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalResult, setModalResult] = useState<{
    success: boolean;
    inserted: number;
    skipped: number;
    errors: string[];
    message: string;
  } | null>(null);

  // Custom Generator state
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customExam, setCustomExam] = useState<'JEE' | 'NEET'>('JEE');
  const [customSubject, setCustomSubject] = useState<string>('Physics');
  const [customChapters, setCustomChapters] = useState<string[]>([]);
  const [customTotalQuestions, setCustomTotalQuestions] = useState('30');
  const [customLoading, setCustomLoading] = useState(false);
  const [customError, setCustomError] = useState('');
  const [dbChapterSets, setDbChapterSets] = useState<any[]>([]);

  const fetchDbChapterSets = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/chapter-sets');
      if (response.ok) {
        const data = await response.json();
        setDbChapterSets(data);
      }
    } catch (err) {
      console.error('Failed to fetch database chapter sets:', err);
    }
  };

  const subjectChaptersMap: Record<string, string[]> = {
    'Physics': ['Mechanics', 'Electromagnetism', 'Thermodynamics', 'Optics', 'Modern Physics'],
    'Chemistry': [
      'Some Basic Concepts of Chemistry',
      'Structure of Atom',
      'Classification of Elements & Periodicity',
      'Chemical Bonding & Molecular Structure',
      'States of Matter',
      'Thermodynamics',
      'Equilibrium',
      'Redox Reactions',
      'Hydrogen',
      's-Block Elements',
      'p-Block Elements (Group 13 & 14)',
      'Organic Chemistry - Basic Principles',
      'Hydrocarbons',
      'Environmental Chemistry',
      'Solid State',
      'Solutions',
      'Electrochemistry',
      'Chemical Kinetics',
      'Surface Chemistry',
      'p-Block Elements (Group 15-18)',
      'd & f Block Elements',
      'Coordination Compounds',
      'Haloalkanes & Haloarenes',
      'Alcohols, Phenols & Ethers',
      'Aldehydes, Ketones & Carboxylic Acids',
      'Amines',
      'Biomolecules',
      'Polymers',
      'Chemistry in Everyday Life'
    ],
    'Mathematics': ['Algebra', 'Calculus', 'Coordinate Geometry', 'Trigonometry'],
    'Biology': ['Botany', 'Zoology']
  };

  const getAvailableChapters = () => {
    const staticChapters = subjectChaptersMap[customSubject] || [];
    
    // Filter database chapter sets matching customExam and customSubject
    const dbChapters = dbChapterSets
      .filter((set) => {
        const examMatch = set.exam?.toUpperCase() === customExam.toUpperCase();
        
        // Subject match mapping logic
        let subjectMatch = false;
        const setSubLower = set.subject?.toLowerCase() || '';
        const curSubLower = customSubject.toLowerCase();
        
        if (setSubLower === curSubLower) {
          subjectMatch = true;
        } else if (customSubject === 'Mathematics' && setSubLower.includes('math')) {
          subjectMatch = true;
        } else if (customSubject === 'Biology' && (setSubLower.includes('bio') || setSubLower.includes('botany') || setSubLower.includes('zoology'))) {
          subjectMatch = true;
        }
        
        return examMatch && subjectMatch;
      })
      .map((set) => set.chapter);

    // Combine and remove duplicates, maintaining order
    const combined = [...staticChapters];
    dbChapters.forEach((ch) => {
      if (ch && !combined.includes(ch)) {
        combined.push(ch);
      }
    });
    
    return combined;
  };

  const [loadingTests, setLoadingTests] = useState(true);
  const [activeTab, setActiveTab] = useState<'questions' | 'results'>('questions');

  // Test creation modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTestName, setNewTestName] = useState('');
  const [newTestDuration, setNewTestDuration] = useState('180');
  const [newTestMarks, setNewTestMarks] = useState('4');
  const [newTestNegMarks, setNewTestNegMarks] = useState('-1');

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
  const [qSection, setQSection] = useState<'Physics' | 'Chemistry' | 'Mathematics'>('Physics');

  // Image Upload State
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (png, jpg, jpeg, gif).');
      return;
    }

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setQImageUrl(data.imageUrl);
    } catch (err: any) {
      alert('Failed to upload image: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  // Student Attempts Logs
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  useEffect(() => {
    if (showQuestionBank) {
      fetchBankQuestions();
    }
  }, [showQuestionBank, bankFilterSubject, bankFilterExam]);

  const fetchBankQuestions = async () => {
    try {
      setLoadingBank(true);
      let url = 'http://localhost:5000/api/questions';
      const queryParams: string[] = [];
      if (bankFilterSubject !== 'All') {
        queryParams.push(`subject=${encodeURIComponent(bankFilterSubject)}`);
      }
      if (bankFilterExam) {
        queryParams.push(`exam=${encodeURIComponent(bankFilterExam)}`);
      }
      if (queryParams.length > 0) {
        url += '?' + queryParams.join('&');
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch question bank');
      const data = await response.json();
      setBankQuestions(data);
    } catch (err) {
      console.error(err);
      alert('Failed to load Question Bank.');
    } finally {
      setLoadingBank(false);
    }
  };

  const handleDeleteBankQuestion = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this question from the Question Bank?')) return;
    try {
      const response = await fetch(`http://localhost:5000/api/questions/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete');
      fetchBankQuestions();
    } catch (err) {
      console.error(err);
      alert('Error deleting question.');
    }
  };

  const handleAssignQuestionToTest = async (questionId: number, testId: number) => {
    if (!testId) return;
    try {
      const response = await fetch(`http://localhost:5000/api/questions/${questionId}/assign-test`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_id: testId })
      });
      if (!response.ok) throw new Error('Failed to assign');
      alert('Question assigned to mock test successfully!');
      fetchBankQuestions();
      fetchTests(); // Refresh test question counts
    } catch (err) {
      console.error(err);
      alert('Error assigning question.');
    }
  };

  const handleModalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      if (ext === 'xlsx' || ext === 'xls' || ext === 'pdf') {
        setModalFile(selectedFile);
        setModalError('');
        setModalResult(null);
      } else {
        setModalError('Unsupported format! Upload an Excel or PDF file.');
        setModalFile(null);
      }
    }
  };

  const handleModalUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalFile || !selectedTest) return;

    try {
      setModalLoading(true);
      setModalError('');
      setModalResult(null);

      const formData = new FormData();
      formData.append('file', modalFile);
      formData.append('testId', selectedTest.id.toString());
      formData.append('exam', selectedTest.name);
      formData.append('subject', modalSubject);
      formData.append('chapter', modalChapter);
      formData.append('difficulty', modalDifficulty);
      formData.append('year', modalYear);

      const response = await fetch('http://localhost:5000/api/import-questions', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to import questions');
      }

      setModalResult(data);
      if (data.success && data.inserted > 0) {
        fetchTestDetails(selectedTest.id);
        fetchTests();
      }
    } catch (err: any) {
      setModalError(err.message || 'An error occurred during import.');
    } finally {
      setModalLoading(false);
    }
  };

  const openCustomGenerator = () => {
    setCustomExam('JEE');
    setCustomSubject('Physics');
    setCustomChapters([]);
    setCustomTotalQuestions('30');
    setCustomError('');
    fetchDbChapterSets();
    setShowCustomModal(true);
  };

  const handleGenerateCustomTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTest) return;
    if (customChapters.length === 0) {
      setCustomError('Please select at least one chapter.');
      return;
    }
    const qCount = parseInt(customTotalQuestions, 10);
    if (isNaN(qCount) || qCount <= 0) {
      setCustomError('Please enter a valid number of questions.');
      return;
    }

    try {
      setCustomLoading(true);
      setCustomError('');

      const response = await fetch(`http://localhost:5000/api/tests/${selectedTest.id}/generate-custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam: customExam,
          subject: customSubject,
          chapters: customChapters,
          totalQuestions: qCount
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate custom test');
      }

      alert(data.message || 'Custom test generated successfully!');
      setShowCustomModal(false);
      fetchTestDetails(selectedTest.id);
      fetchTests();
    } catch (err: any) {
      setCustomError(err.message || 'An error occurred during generation.');
    } finally {
      setCustomLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
    fetchDbChapterSets();
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
        body: JSON.stringify({ 
          name: newTestName.trim(), 
          duration: parseInt(newTestDuration, 10),
          marks: parseFloat(newTestMarks),
          negative_marks: parseFloat(newTestNegMarks)
        }),
      });

      if (!response.ok) throw new Error('Failed to create test');
      const data = await response.json();

      setShowCreateModal(false);
      setNewTestName('');
      setNewTestDuration('180');
      setNewTestMarks('4');
      setNewTestNegMarks('-1');
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

  const handleToggleRandomize = async (test: Test, checked: boolean) => {
    try {
      const response = await fetch(`http://localhost:5000/api/tests/${test.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: test.name,
          duration: test.duration,
          randomize_questions: checked ? 1 : 0
        })
      });
      if (!response.ok) throw new Error('Failed to update test settings');
      
      fetchTests();
      if (selectedTest?.id === test.id) {
        setSelectedTest(prev => prev ? { ...prev, randomize_questions: checked ? 1 : 0 } : null);
      }
    } catch (error: any) {
      alert(error.message || 'Error updating settings');
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
    setQMarks(selectedTest?.marks !== undefined && selectedTest.marks !== null ? selectedTest.marks.toString() : '4');
    setQNegMarks(selectedTest?.negative_marks !== undefined && selectedTest.negative_marks !== null ? selectedTest.negative_marks.toString() : '-1');
    setQSection('Physics');
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
    setQSection((q as any).section || 'Physics');

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
      section: qSection,
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
        <div className="flex gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer"
          >
            <Plus className="w-5 h-5" /> Create Mock Test
          </button>
        </div>
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
                    onClick={() => {
                      setSelectedTest(test);
                      setShowQuestionBank(false);
                    }}
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
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer select-none bg-slate-50 border border-gray-200 px-3 py-2 rounded-xl">
                      <input
                        type="checkbox"
                        checked={selectedTest.randomize_questions === 1}
                        onChange={(e) => handleToggleRandomize(selectedTest, e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>Randomize Order</span>
                    </label>
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
                      <div className="flex gap-2">
                        <button
                          onClick={openCustomGenerator}
                          className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-bold border-2 border-indigo-100 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Custom Test
                        </button>
                        <button
                          onClick={() => {
                            setModalFile(null);
                            setModalResult(null);
                            setModalError('');
                            setShowImportModal(true);
                          }}
                          className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-800 font-bold border-2 border-emerald-100 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                        >
                          <UploadCloud className="w-3.5 h-3.5" /> Bulk Import
                        </button>
                        <button
                          onClick={openAddQuestion}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-bold border-2 border-blue-100 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Question
                        </button>
                      </div>
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
                              <div className="flex gap-2">
                                <span className="bg-gray-100 text-gray-700 text-[10px] font-extrabold px-2.5 py-1 rounded-md uppercase">
                                  Q{idx + 1} - {q.question_type}
                                </span>
                                <span className="bg-blue-50 text-blue-700 text-[10px] font-extrabold px-2.5 py-1 rounded-md uppercase">
                                  {(q as any).section || 'Physics'}
                                </span>
                              </div>
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
          ) : showQuestionBank ? (
            <div className="bg-white border border-gray-250 rounded-3xl p-6 shadow-sm min-h-[500px] flex flex-col justify-between">
              <div>
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-5 mb-6">
                  <div>
                    <h2 className="text-xl font-extrabold text-gray-800">General Question Bank</h2>
                    <p className="text-xs text-gray-500 mt-1">
                      View all bulk-imported questions and assign them to your mock tests.
                    </p>
                  </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 select-none bg-slate-50 p-4 rounded-2xl border border-gray-100">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Filter by Subject</label>
                    <select
                      value={bankFilterSubject}
                      onChange={(e) => setBankFilterSubject(e.target.value)}
                      className="w-full text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="All">All Subjects</option>
                      <option value="Physics">Physics</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="General">General / Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Search Exam</label>
                    <input
                      type="text"
                      placeholder="e.g. JEE Advanced"
                      value={bankFilterExam}
                      onChange={(e) => setBankFilterExam(e.target.value)}
                      className="w-full text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Questions List */}
                {loadingBank ? (
                  <div className="text-center py-12 text-gray-500 font-semibold flex items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                    <span>Loading Question Bank...</span>
                  </div>
                ) : bankQuestions.length === 0 ? (
                  <div className="border border-dashed border-gray-200 rounded-2xl p-12 text-center text-gray-400">
                    <FileText className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                    <p className="text-sm font-semibold">No questions found in the bank.</p>
                    <p className="text-xs mt-1">Upload a spreadsheet or PDF using the "Bulk Import" button at the top!</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                    {bankQuestions.map((q) => (
                      <div key={q.id} className="border border-gray-150 rounded-2xl p-5 hover:border-gray-300 transition-colors bg-white">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex flex-wrap gap-2">
                            {q.exam && (
                              <span className="bg-[#0f294a] text-blue-200 text-[9px] font-black px-2 py-0.5 rounded border border-blue-900 uppercase">
                                {q.exam}
                              </span>
                            )}
                            <span className="bg-blue-50 text-blue-700 text-[9px] font-black px-2 py-0.5 rounded uppercase">
                              {(q as any).subject || q.section || 'Physics'}
                            </span>
                            {q.chapter && (
                              <span className="bg-purple-50 text-purple-700 text-[9px] font-black px-2 py-0.5 rounded uppercase">
                                {q.chapter}
                              </span>
                            )}
                            {q.difficulty && (
                              <span className="bg-amber-50 text-amber-700 text-[9px] font-black px-2 py-0.5 rounded uppercase">
                                {q.difficulty}
                              </span>
                            )}
                            {q.year && (
                              <span className="bg-slate-100 text-slate-700 text-[9px] font-black px-2 py-0.5 rounded">
                                {q.year}
                              </span>
                            )}
                            {q.test_id && (
                              <span className="bg-emerald-50 text-emerald-700 text-[9px] font-black px-2 py-0.5 rounded uppercase">
                                Assigned to Test #{q.test_id}
                              </span>
                            )}
                          </div>
                          
                          <button
                            onClick={() => handleDeleteBankQuestion(q.id)}
                            className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete from Bank"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <p className="text-sm text-gray-800 font-semibold mt-3 whitespace-pre-line leading-relaxed">
                          {q.question_text}
                        </p>

                        {/* Options */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 text-xs text-gray-600 font-medium">
                          <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100"><span className="font-bold text-gray-700">A.</span> {q.options[0] || (q as any).option_a}</div>
                          <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100"><span className="font-bold text-gray-700">B.</span> {q.options[1] || (q as any).option_b}</div>
                          <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100"><span className="font-bold text-gray-700">C.</span> {q.options[2] || (q as any).option_c}</div>
                          <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100"><span className="font-bold text-gray-700">D.</span> {q.options[3] || (q as any).option_d}</div>
                        </div>

                        {/* Correct option & assign to test */}
                        <div className="mt-4 pt-3 border-t border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs font-semibold font-sans">
                          <div className="text-green-700">
                            Correct Option:{' '}
                            <span className="font-black uppercase">
                              {(q as any).correct_option || (q.correct_answer && q.correct_answer.length > 0 ? String.fromCharCode(65 + q.correct_answer[0]) : '')}
                            </span>
                          </div>

                          {/* Quick Assign Dropdown */}
                          <div className="flex items-center gap-2 select-none" onClick={e => e.stopPropagation()}>
                            <span className="text-gray-400 font-bold text-[10px] uppercase">Assign to Test:</span>
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleAssignQuestionToTest(q.id, parseInt(e.target.value, 10));
                                  e.target.value = "";
                                }
                              }}
                              className="text-[11px] font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
                            >
                              <option value="" disabled>Select Test...</option>
                              {tests.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {q.explanation && (
                          <div className="mt-3 bg-blue-50/30 border border-blue-50/50 rounded-xl p-3 text-xs text-blue-900 leading-relaxed font-semibold">
                            <span className="font-bold block text-blue-950 mb-0.5 text-[10px] uppercase tracking-wider">Solution:</span>
                            {q.explanation}
                          </div>
                        )}
                      </div>
                    ))}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Positive Marks</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.5"
                    value={newTestMarks}
                    onChange={(e) => setNewTestMarks(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Negative Marks</label>
                  <input
                    type="number"
                    required
                    step="0.5"
                    value={newTestNegMarks}
                    onChange={(e) => setNewTestNegMarks(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Section / Subject</label>
                  <select
                    value={qSection}
                    onChange={(e) => setQSection(e.target.value as any)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                  >
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Mathematics">Mathematics</option>
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

              {/* Image URL Optional & Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Question Image (Optional)</label>
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://example.com/question-graph.png"
                      value={qImageUrl}
                      onChange={(e) => setQImageUrl(e.target.value)}
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={uploadingImage}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2.5 bg-blue-50 hover:bg-blue-600 border border-blue-600/10 text-blue-700 hover:text-white disabled:opacity-50 text-sm font-bold rounded-xl transition-all shadow-sm flex items-center justify-center cursor-pointer"
                    >
                      {uploadingImage ? 'Uploading...' : 'Upload File'}
                    </button>
                  </div>
                  
                  {qImageUrl && (
                    <div className="relative border border-gray-100 rounded-xl overflow-hidden shadow-sm bg-slate-50 p-2 inline-block max-w-xs group">
                      <img
                        src={qImageUrl}
                        alt="Question Preview"
                        className="object-contain max-h-32 max-w-full rounded"
                      />
                      <button
                        type="button"
                        onClick={() => setQImageUrl('')}
                        className="absolute top-1.5 right-1.5 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full shadow transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Remove Image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
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

      {/* Bulk Import Questions Modal */}
      {showImportModal && selectedTest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-black text-[#0f294a]">Bulk Import to {selectedTest.name}</h3>
                <p className="text-xs text-gray-400 font-semibold mt-0.5">Upload questions directly to this mock test.</p>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setModalFile(null);
                  setModalResult(null);
                  setModalError('');
                }}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleModalUpload} className="space-y-6">
              {/* Optional override metadata */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Default Subject</label>
                  <select
                    value={modalSubject}
                    onChange={(e) => setModalSubject(e.target.value)}
                    className="w-full text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Default Chapter</label>
                  <input
                    type="text"
                    value={modalChapter}
                    onChange={(e) => setModalChapter(e.target.value)}
                    className="w-full text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500"
                    placeholder="e.g. Mechanics"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Default Difficulty</label>
                  <select
                    value={modalDifficulty}
                    onChange={(e) => setModalDifficulty(e.target.value)}
                    className="w-full text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Default Year</label>
                  <input
                    type="number"
                    value={modalYear}
                    onChange={(e) => setModalYear(e.target.value)}
                    className="w-full text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Upload Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#0f294a] uppercase tracking-wide">Select File</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-slate-50/50"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.pdf"
                    onChange={handleModalFileChange}
                    className="hidden"
                  />
                  {modalFile ? (
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                      {modalFile.name.endsWith('.pdf') ? <FileText className="w-5 h-5 text-rose-500" /> : <FileSpreadsheet className="w-5 h-5 text-emerald-500" />}
                      <span>{modalFile.name} ({(modalFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-gray-505">
                      <UploadCloud className="w-8 h-8 text-blue-500" />
                      <p className="text-xs font-black text-gray-700">Click to browse or drop Excel/PDF here</p>
                      <p className="text-[10px] font-semibold text-gray-400">Excel must follow headers: Exam, Subject, Chapter, Question Text, Option A-D, Correct Option...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Warnings/Error Alerts */}
              {modalError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-3 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Result Summary */}
              {modalResult && (
                <div className="bg-slate-50 border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-gray-700">
                    <span className="flex items-center gap-1.5 text-emerald-600">
                      <CheckCircle className="w-4 h-4" /> Successfully Imported: {modalResult.inserted}
                    </span>
                    {modalResult.skipped > 0 && (
                      <span className="flex items-center gap-1.5 text-amber-600">
                        <AlertTriangle className="w-4 h-4" /> Skipped/Errors: {modalResult.skipped}
                      </span>
                    )}
                  </div>
                  {modalResult.errors.length > 0 && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 max-h-[140px] overflow-y-auto text-[10px] font-medium text-amber-800 space-y-1">
                      {modalResult.errors.map((err, i) => (
                        <div key={i}>• {err}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setModalFile(null);
                    setModalResult(null);
                    setModalError('');
                  }}
                  className="flex-1 py-2.5 px-4 border border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors text-xs cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={!modalFile || modalLoading}
                  className={`flex-1 py-2.5 px-4 font-bold text-xs rounded-xl shadow-sm transition-colors uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer ${
                    modalFile && !modalLoading
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {modalLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    <span>Import Questions</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Test Generator Modal */}
      {showCustomModal && selectedTest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-black text-[#0f294a]">Generate Custom Mock Test</h3>
                <p className="text-xs text-gray-400 font-semibold mt-0.5">Auto-generate questions from the difficult pool.</p>
              </div>
              <button
                onClick={() => setShowCustomModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {customError && (
              <div className="bg-red-50 text-red-700 text-xs font-semibold p-3.5 rounded-xl border border-red-200 mb-4 animate-shake">
                {customError}
              </div>
            )}

            <form onSubmit={handleGenerateCustomTest} className="space-y-4">
              {/* Exam Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Target Exam</label>
                <div className="flex gap-4">
                  {['JEE', 'NEET'].map((exam) => (
                    <label key={exam} className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700">
                      <input
                        type="radio"
                        name="customExam"
                        value={exam}
                        checked={customExam === exam}
                        onChange={() => {
                          setCustomExam(exam as 'JEE' | 'NEET');
                          setCustomSubject('Physics');
                          setCustomChapters([]);
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span>{exam}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Subject Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Subject</label>
                <select
                  value={customSubject}
                  onChange={(e) => {
                    setCustomSubject(e.target.value);
                    setCustomChapters([]);
                  }}
                  className="w-full text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {(customExam === 'JEE' ? ['Physics', 'Chemistry', 'Mathematics'] : ['Physics', 'Chemistry', 'Biology']).map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              {/* Chapters Selection */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase">Select Chapters</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomChapters(getAvailableChapters())}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold uppercase tracking-wider"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300 text-xs font-bold">|</span>
                    <button
                      type="button"
                      onClick={() => setCustomChapters([])}
                      className="text-[10px] text-gray-400 hover:text-gray-600 font-bold uppercase tracking-wider"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="border border-gray-150 rounded-xl p-3.5 max-h-[160px] overflow-y-auto space-y-2 bg-slate-50/50">
                  {getAvailableChapters().map((chapter) => {
                    const isChecked = customChapters.includes(chapter);
                    return (
                      <label key={chapter} className="flex items-start gap-2.5 text-xs font-semibold text-gray-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setCustomChapters(customChapters.filter((c) => c !== chapter));
                            } else {
                              setCustomChapters([...customChapters, chapter]);
                            }
                          }}
                          className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 mt-0.5"
                        />
                        <span>{chapter}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Total Questions count */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Total Questions to Generate</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="100"
                  value={customTotalQuestions}
                  onChange={(e) => setCustomTotalQuestions(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-sm text-gray-850"
                  placeholder="e.g. 30"
                />
                <p className="text-[10px] text-gray-400 font-medium mt-1">Questions will be randomly picked from the difficult pool matching your chapters.</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-100 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="flex-1 py-2.5 px-4 border border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={customLoading}
                  className={`flex-1 py-2.5 px-4 font-bold text-xs rounded-xl shadow-sm transition-colors uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer ${
                    !customLoading
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {customLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <span>Generate Questions</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


