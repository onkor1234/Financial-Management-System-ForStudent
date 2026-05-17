import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogIn } from 'lucide-react';

export function Login() {
  const [username, setUsername] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(username);
    navigate('/');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-[#f1f5f9]">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex justify-center items-center gap-1">
             <span className="text-blue-600 font-bold">CMRU Finance</span>Pro
          </h2>
          <p className="text-sm text-slate-500 mt-2">กรุณากรอกชื่อผู้ใช้เพื่อดำเนินการต่อ</p>
          <p className="text-xs text-blue-600 mt-2 bg-blue-50 py-1.5 rounded inline-block px-3 font-semibold border border-blue-100">คำแนะนำ: ใช้ <strong>admin</strong> หรือ <strong>op1</strong></p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
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
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-800 transition-colors"
                placeholder="ระบุชื่อผู้ใช้"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-2.5 px-4 rounded-md shadow-sm shadow-blue-200 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <LogIn className="w-5 h-5 mr-2" />
              เข้าสู่ระบบ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
