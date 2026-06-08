import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { GraduationCap, LayoutDashboard, Landmark } from 'lucide-react';
import StudentPortal from './pages/StudentPortal';
import TestAttempt from './pages/TestAttempt';
import ResultReview from './pages/ResultReview';
import TeacherDashboard from './pages/TeacherDashboard';

// Navigation wrapper to selectively hide Navbar on test attempt page
function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isExamPage = location.pathname.startsWith('/attempt/');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {!isExamPage && (
        <nav className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center gap-2">
                <div className="bg-blue-600 p-2 rounded-xl text-white shadow-md shadow-blue-200">
                  <Landmark className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-extrabold text-gray-800 text-lg tracking-tight uppercase">webapple</span>
                  <span className="text-blue-600 font-bold text-xs ml-1 bg-blue-50 px-2 py-0.5 rounded-md">PORTAL</span>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="flex items-center gap-4">
                <Link
                  to="/"
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-600 hover:text-blue-600 rounded-xl hover:bg-gray-50 transition-all"
                >
                  <GraduationCap className="w-4.5 h-4.5" />
                  <span>Student Portal</span>
                </Link>
                <Link
                  to="/dashboard"
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-600 hover:text-blue-600 rounded-xl hover:bg-gray-50 transition-all border border-gray-100 bg-gray-50/50"
                >
                  <LayoutDashboard className="w-4.5 h-4.5" />
                  <span>Teacher Dashboard</span>
                </Link>
              </div>
            </div>
          </div>
        </nav>
      )}
      <main className="flex-1">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<StudentPortal />} />
          <Route path="/attempt/:testId" element={<TestAttempt />} />
          <Route path="/results/:attemptId" element={<ResultReview />} />
          <Route path="/dashboard" element={<TeacherDashboard />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}
