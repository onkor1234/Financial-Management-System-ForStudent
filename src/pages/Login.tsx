import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogIn } from 'lucide-react';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const { login }               = useAuth();
  const navigate                = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เข้าสู่ระบบล้มเหลว');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-[#f1f5f9]">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex justify-center items-center gap-1">
            <span className="text-blue-600 font-bold">CMRU Finance</span>Pro
          </h2>
          <p className="text-sm text-slate-500 mt-2">กรุณากรอกชื่อผู้ใช้และรหัสผ่านเพื่อเข้าสู่ระบบ</p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="username" className="block text-sm font-bold text-slate-700">
              ชื่อผู้ใช้
            </label>
            <div className="mt-1">
              <input
                id="username"
                name="username"
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-800 transition-colors"
                placeholder="ระบุชื่อผู้ใช้"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-bold text-slate-700">
              รหัสผ่าน
            </label>
            <div className="mt-1">
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-800 transition-colors"
                placeholder="ระบุรหัสผ่าน"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 rounded-md shadow-sm shadow-blue-200 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  กำลังเข้าสู่ระบบ...
                </span>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  เข้าสู่ระบบ
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
