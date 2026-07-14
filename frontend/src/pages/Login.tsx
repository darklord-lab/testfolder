import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Shield, GraduationCap, Key, AlertCircle, Landmark } from 'lucide-react';

export default function Login() {
  const [role, setRole] = useState<'student' | 'teacher' | 'admin'>('student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    const cached = localStorage.getItem('currentUser');
    if (cached) {
      const user = JSON.parse(cached);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'teacher') navigate('/dashboard');
      else if (user.role === 'student') navigate('/student');
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store in localStorage
      localStorage.setItem('currentUser', JSON.stringify(data.user));

      // Redirect based on role
      if (data.user.role === 'admin') {
        navigate('/admin');
      } else if (data.user.role === 'teacher') {
        navigate('/dashboard');
      } else {
        navigate('/student');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07111e] flex items-center justify-center p-4 font-sans select-none">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-[#07111e] to-[#07111e] z-0"></div>

      <div className="relative z-10 w-full max-w-lg bg-[#0f1e31]/80 backdrop-blur-md rounded-3xl border border-slate-800 p-8 shadow-2xl overflow-hidden">
        
        {/* Brand/Logo Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 p-3.5 rounded-2xl text-white shadow-xl shadow-blue-500/20 mb-3.5">
            <Landmark className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-wider flex items-center">
            webapple <span className="text-blue-500 font-extrabold text-xs ml-1.5 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">CBT</span>
          </h2>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mt-1.5">Mock Test Examination Portal</p>
        </div>

        {/* Role Select Tabs */}
        <div className="bg-[#0b1624] p-1.5 rounded-2xl grid grid-cols-3 gap-1 mb-8 border border-slate-800/60">
          <button
            type="button"
            onClick={() => {
              setRole('student');
              setError('');
            }}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              role === 'student'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15 font-black scale-102'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GraduationCap className="w-4.5 h-4.5" />
            <span>Student</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setRole('teacher');
              setError('');
            }}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              role === 'teacher'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15 font-black scale-102'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4.5 h-4.5" />
            <span>Teacher</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setRole('admin');
              setError('');
            }}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              role === 'admin'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15 font-black scale-102'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-4.5 h-4.5" />
            <span>Admin</span>
          </button>
        </div>

        {/* Display Errors */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-xl flex items-start gap-3 text-xs font-semibold mb-6 animate-shake">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-2.5">
              {role === 'admin' ? 'Admin ID' : 'Username'}
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                required
                placeholder={role === 'admin' ? 'mahakal' : 'Enter your username'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-[#0a1320] border border-slate-800 focus:border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold text-slate-100 text-sm placeholder-slate-650/80 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-2.5">Password</label>
            <div className="relative">
              <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="password"
                required
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-[#0a1320] border border-slate-800 focus:border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold text-slate-100 text-sm placeholder-slate-650/80 transition-all"
              />
            </div>
          </div>

          {role === 'admin' && (
            <div className="text-[10px] text-slate-500 bg-[#0b1624]/60 border border-slate-800/40 p-2.5 rounded-lg font-medium">
              💡 Use ID: <strong className="text-slate-450 font-bold">mahakal</strong> and Password: <strong className="text-slate-450 font-bold">mahakal@123</strong> to login as admin.
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl tracking-wider uppercase transition-all shadow-lg shadow-blue-600/10 hover:shadow-blue-600/25 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-6"
          >
            {loading ? (
              <>
                <div className="w-4.5 h-4.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
