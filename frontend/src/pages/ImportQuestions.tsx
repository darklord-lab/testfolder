import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowLeft, 
  RefreshCw, 
  Download, 
  HelpCircle,
  BookOpen,
  Check
} from 'lucide-react';

interface User {
  name: string;
  role: 'admin' | 'teacher' | 'student';
}

export default function ImportQuestions() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // File states
  const [file, setFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  
  // Default values form state
  const [exam, setExam] = useState('JEE Advanced');
  const [subject, setSubject] = useState('Physics');
  const [chapter, setChapter] = useState('General');
  const [difficulty, setDifficulty] = useState('medium');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  
  // Status states
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    inserted: number;
    skipped: number;
    errors: string[];
    message: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const cached = localStorage.getItem('currentUser');
    if (!cached) {
      navigate('/');
      return;
    }
    const user = JSON.parse(cached);
    if (user.role !== 'admin' && user.role !== 'teacher') {
      navigate('/');
    } else {
      setCurrentUser(user);
    }
  }, [navigate]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setResult(null);
    setErrorMessage('');
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (ext === 'xlsx' || ext === 'xls' || ext === 'pdf') {
      setFile(selectedFile);
    } else {
      setErrorMessage('Unsupported file format! Please upload an Excel (.xlsx, .xls) or PDF (.pdf) file.');
      setFile(null);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setResult(null);
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTemplateDownload = () => {
    window.open('http://localhost:5000/api/import-questions/template', '_blank');
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage('Please select a file to upload first.');
      return;
    }

    try {
      setLoading(true);
      setResult(null);
      setErrorMessage('');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('exam', exam.trim());
      formData.append('subject', subject.trim());
      formData.append('chapter', chapter.trim());
      formData.append('difficulty', difficulty);
      formData.append('year', year.trim());

      const response = await fetch('http://localhost:5000/api/import-questions', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload and parse questions file.');
      }

      setResult(data);
      if (data.success && data.inserted > 0) {
        // Reset file input on complete success
        if (data.skipped === 0) {
          setFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during import.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    if (currentUser?.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans select-none">
      {/* Top Header */}
      <header className="bg-[#0f294a] text-white px-6 py-4 flex justify-between items-center shadow-md border-b border-blue-950">
        <div className="flex items-center gap-3">
          <button
            onClick={handleGoBack}
            className="p-2 hover:bg-blue-800/40 rounded-xl transition-all text-white border border-transparent hover:border-blue-700/30 flex items-center justify-center cursor-pointer"
            title="Go Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-extrabold text-white text-base md:text-lg tracking-tight uppercase flex items-center gap-2">
              <span>Bulk Question Import</span>
              <span className="bg-[#1d3d63] text-blue-300 text-[10px] normal-case font-black px-2.5 py-0.5 rounded border border-blue-800 uppercase">
                Excel & PDF
              </span>
            </h1>
          </div>
        </div>

        {currentUser && (
          <div className="text-right leading-none hidden sm:block">
            <p className="text-xs font-bold text-gray-200">{currentUser.name}</p>
            <span className="text-[9px] font-black text-blue-300 uppercase mt-1 inline-block bg-blue-950/40 px-2 py-0.5 rounded border border-blue-800">
              {currentUser.role} portal
            </span>
          </div>
        )}
      </header>

      {/* Main Grid Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns (Inputs and Upload Zone) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Default Metadata Form */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
            <h2 className="text-base font-black text-[#0f294a] mb-4 uppercase tracking-wide flex items-center gap-2">
              <BookOpen className="w-4.5 h-4.5 text-blue-600" />
              <span>Default Questions Metadata</span>
            </h2>
            <p className="text-xs text-gray-400 font-semibold mb-6">
              These values will automatically fill any empty cells in your Excel upload, and will act as the metadata for all questions parsed from your PDF file.
            </p>

            <form onSubmit={handleUpload} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-[#0f294a] uppercase tracking-wide mb-1.5">Exam Name</label>
                <input
                  type="text"
                  value={exam}
                  onChange={(e) => setExam(e.target.value)}
                  placeholder="e.g. JEE Advanced, JEE Main"
                  className="w-full text-sm font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#0f294a] uppercase tracking-wide mb-1.5">Subject / Section</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full text-sm font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="General">General / Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-[#0f294a] uppercase tracking-wide mb-1.5">Chapter / Topic</label>
                <input
                  type="text"
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  placeholder="e.g. Electrostatics, Kinematics"
                  className="w-full text-sm font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-[#0f294a] uppercase tracking-wide mb-1.5">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full text-sm font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-[#0f294a] uppercase tracking-wide mb-1.5">Year</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="e.g. 2026"
                    className="w-full text-sm font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </form>
          </div>

          {/* Drag & Drop Zone */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm flex flex-col">
            <h2 className="text-base font-black text-[#0f294a] mb-4 uppercase tracking-wide flex items-center justify-between">
              <span>Upload Document</span>
              <button
                type="button"
                onClick={handleTemplateDownload}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 px-3 py-1.5 rounded-lg border border-transparent hover:border-blue-100 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Template</span>
              </button>
            </h2>

            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 min-h-[220px] select-none ${
                isDragActive 
                  ? 'border-blue-500 bg-blue-50/30' 
                  : file 
                    ? 'border-emerald-400 bg-emerald-50/10' 
                    : 'border-gray-300 hover:border-blue-400 hover:bg-slate-50/80'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              {file ? (
                <div className="flex flex-col items-center gap-3 animate-fade-in" onClick={e => e.stopPropagation()}>
                  <div className={`p-4 rounded-2xl ${file.name.endsWith('.pdf') ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                    {file.name.endsWith('.pdf') ? (
                      <FileText className="w-10 h-10" />
                    ) : (
                      <FileSpreadsheet className="w-10 h-10" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">{file.name}</p>
                    <p className="text-xs text-gray-400 font-semibold mt-0.5">
                      {(file.size / 1024).toFixed(1)} KB • {file.name.endsWith('.pdf') ? 'PDF Document' : 'Excel Spreadsheet'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="text-xs font-extrabold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100/80 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer mt-2"
                  >
                    Remove File
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="bg-blue-50 text-blue-500 p-4.5 rounded-2xl shadow-inner">
                    <UploadCloud className="w-10 h-10" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">Drag & drop your file here, or <span className="text-blue-600 underline">browse</span></p>
                    <p className="text-xs text-gray-400 font-semibold mt-1">Accepts Excel (.xlsx, .xls) and PDF (.pdf) questions sheets</p>
                  </div>
                </div>
              )}
            </div>

            {/* Error alerts */}
            {errorMessage && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-3 rounded-2xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleGoBack}
                className="px-5 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all cursor-pointer border border-transparent hover:border-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={!file || loading}
                className={`flex items-center gap-2 px-6 py-2.5 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer select-none uppercase tracking-wider ${
                  file && !loading
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 hover:shadow-lg'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                }`}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Parsing & Importing...</span>
                  </>
                ) : (
                  <span>Import Questions</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (Format Guidelines & Results) */}
        <div className="space-y-6">
          
          {/* Results Display */}
          {result && (
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm animate-fade-in">
              <h2 className="text-base font-black text-[#0f294a] mb-4 uppercase tracking-wide flex items-center gap-2">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
                <span>Import Summary</span>
              </h2>

              <div className="grid grid-cols-2 gap-4 mb-5 select-none">
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
                  <p className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-wider">Inserted</p>
                  <h3 className="text-2xl font-black text-emerald-700 mt-1">{result.inserted}</h3>
                </div>
                <div className={`rounded-2xl p-4 text-center border ${
                  result.skipped > 0 
                    ? 'bg-amber-50 border-amber-100 text-amber-700' 
                    : 'bg-gray-50 border-gray-100 text-gray-400'
                }`}>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider">Skipped</p>
                  <h3 className="text-2xl font-black mt-1">{result.skipped}</h3>
                </div>
              </div>

              {result.errors.length > 0 ? (
                <div>
                  <h4 className="text-xs font-black text-[#0f294a] uppercase tracking-wide mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span>Validation Warnings ({result.errors.length})</span>
                  </h4>
                  <div className="bg-amber-50/30 border border-amber-100 rounded-2xl p-3 max-h-[220px] overflow-y-auto text-[11px] font-semibold text-amber-800 space-y-1.5">
                    {result.errors.map((err, i) => (
                      <div key={i} className="flex items-start gap-1">
                        <span className="text-amber-500">•</span>
                        <span>{err}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-2.5 text-xs text-emerald-800 font-semibold">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>All questions were parsed and imported successfully with zero errors!</span>
                </div>
              )}
            </div>
          )}

          {/* Upload Instructions Helper */}
          <div className="bg-[#0f294a] text-blue-100 border border-blue-950 rounded-3xl p-6 shadow-md">
            <h2 className="text-base font-black text-white mb-4 uppercase tracking-wide flex items-center gap-2">
              <HelpCircle className="w-4.5 h-4.5 text-blue-300" />
              <span>Formatting Guidelines</span>
            </h2>

            <div className="space-y-5 text-xs">
              <div>
                <h3 className="font-extrabold text-white text-xs uppercase mb-1.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                  Excel Sheets Layout
                </h3>
                <p className="leading-relaxed font-medium text-blue-200">
                  Ensure your Excel file follows this strict structure:
                </p>
                <ul className="list-disc pl-4 mt-1.5 space-y-1 text-blue-200 font-medium">
                  <li><strong>Row 1</strong>: Header names (Exam, Subject, Chapter, Question Text, Option A, Option B, Option C, Option D, Correct Option, Difficulty, Year, Explanation)</li>
                  <li><strong>Row 2</strong>: Helper instructions (automatically skipped)</li>
                  <li><strong>Row 3+</strong>: Question rows. <code>correct_option</code> must be only: <code>a</code>, <code>b</code>, <code>c</code>, or <code>d</code>.</li>
                </ul>
              </div>

              <div className="border-t border-blue-900 pt-4">
                <h3 className="font-extrabold text-white text-xs uppercase mb-1.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-rose-400 rounded-full"></span>
                  PDF Text Format
                </h3>
                <p className="leading-relaxed font-medium text-blue-200">
                  Ensure the PDF text has recognizable patterns:
                </p>
                <ul className="list-disc pl-4 mt-1.5 space-y-1 text-blue-200 font-medium">
                  <li>Questions start with numbers: <code>1. What is...</code> or <code>Q2) ...</code></li>
                  <li>Options are lettered: <code>A) ...</code>, <code>B) ...</code>, <code>C) ...</code>, <code>D) ...</code> (on separate lines or inline)</li>
                  <li>Correct option: <code>Answer: A</code> or <code>Ans: c</code></li>
                  <li>Explanation: <code>Explanation: ...</code> or <code>Exp: ...</code></li>
                  <li>Set dynamic headers at the top: <code>Exam: JEE Advanced</code>, <code>Subject: Chemistry</code></li>
                </ul>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
