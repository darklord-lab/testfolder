import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { GraduationCap, LayoutDashboard, Landmark, LogOut } from 'lucide-react';
import Login from './pages/Login';
import StudentPortal from './pages/StudentPortal';
import TestAttempt from './pages/TestAttempt';
import ResultReview from './pages/ResultReview';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ImportQuestions from './pages/ImportQuestions';

// Authentication Guard Wrapper
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const cached = localStorage.getItem('currentUser');
  if (!cached) {
    return <Navigate to="/" replace />;
  }
  const user = JSON.parse(cached);
  if (!allowedRoles.includes(user.role)) {
    // Redirect unauthorized roles back to landing login
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function LoginRedirect({ children }: { children: React.ReactNode }) {
  const cached = localStorage.getItem('currentUser');
  if (cached) {
    const user = JSON.parse(cached);
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'teacher') return <Navigate to="/dashboard" replace />;
    if (user.role === 'student') return <Navigate to="/student" replace />;
  }
  return <>{children}</>;
}

// Layout to selectively render and style navigation bar
function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const isExamPage = location.pathname.startsWith('/attempt/');
  const isLoginPage = location.pathname === '/';
  const isAdminPage = location.pathname.startsWith('/admin');

  // Read current user
  const cached = localStorage.getItem('currentUser');
  const currentUser = cached ? JSON.parse(cached) : null;

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    navigate('/');
  };

  // Hide Navbar for Login, Exam, and Admin pages
  const shouldHideNavbar = isLoginPage || isExamPage || isAdminPage;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {!shouldHideNavbar && (
        <nav className="bg-white border-b border-gray-150 shadow-sm sticky top-0 z-40 select-none">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center gap-2">
                <div className="bg-blue-600 p-2 rounded-xl text-white shadow-md shadow-blue-200">
                  <Landmark className="w-5.5 h-5.5" />
                </div>
                <div>
                  <span className="font-extrabold text-gray-800 text-lg tracking-tight uppercase">webapple</span>
                  <span className="text-blue-600 font-bold text-xs ml-1 bg-blue-50 px-2 py-0.5 rounded-md">PORTAL</span>
                </div>
              </div>

              {/* Navigation Links & User Logout */}
              <div className="flex items-center gap-5">
                {currentUser && currentUser.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-blue-100 uppercase"
                  >
                    Admin panel
                  </Link>
                )}
                
                {currentUser && (currentUser.role === 'student' || currentUser.role === 'admin') && (
                  <Link
                    to="/student"
                    className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-gray-600 hover:text-blue-600 rounded-xl hover:bg-gray-50 transition-all"
                  >
                    <GraduationCap className="w-4.5 h-4.5" />
                    <span>Student Portal</span>
                  </Link>
                )}
                
                {currentUser && (currentUser.role === 'teacher' || currentUser.role === 'admin') && (
                  <Link
                    to="/dashboard"
                    className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-gray-600 hover:text-blue-600 rounded-xl hover:bg-gray-50 transition-all border border-gray-100 bg-gray-50/50"
                  >
                    <LayoutDashboard className="w-4.5 h-4.5" />
                    <span>Teacher Dashboard</span>
                  </Link>
                )}

                {currentUser && (
                  <div className="h-6 w-px bg-gray-200"></div>
                )}

                {currentUser && (
                  <div className="flex items-center gap-4">
                    <div className="text-right leading-none hidden sm:block">
                      <p className="text-xs font-bold text-gray-800">{currentUser.name}</p>
                      <span className="text-[9px] font-black text-blue-600 uppercase mt-0.5 inline-block bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                        {currentUser.role}
                      </span>
                    </div>
                    
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-red-650 hover:bg-red-50 text-red-600 hover:text-red-700 rounded-xl transition-all border border-transparent hover:border-red-100 cursor-pointer uppercase tracking-wide"
                      title="Logout Account"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="hidden sm:inline">Logout</span>
                    </button>
                  </div>
                )}
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
          {/* Landing Login Page */}
          <Route path="/" element={<LoginRedirect><Login /></LoginRedirect>} />

          {/* Student Portal (guarded) */}
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={['student', 'admin']}>
                <StudentPortal />
              </ProtectedRoute>
            }
          />

          {/* Exam attempt (guarded) */}
          <Route
            path="/attempt/:testId"
            element={
              <ProtectedRoute allowedRoles={['student', 'admin']}>
                <TestAttempt />
              </ProtectedRoute>
            }
          />

          {/* Review result (guarded) */}
          <Route
            path="/results/:attemptId"
            element={
              <ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}>
                <ResultReview />
              </ProtectedRoute>
            }
          />

          {/* Teacher dashboard (guarded) */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin control panel (guarded) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Import Questions (guarded for admin & teacher) */}
          <Route
            path="/admin/import"
            element={
              <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                <ImportQuestions />
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect to login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}
