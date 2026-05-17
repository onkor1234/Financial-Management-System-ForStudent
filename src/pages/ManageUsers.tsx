import React, { useState, useEffect } from 'react';
import { db, User, Role } from '../lib/mockDb';
import { Plus } from 'lucide-react';

const AVAILABLE_PAGES = [
  { path: '/', label: 'แดชบอร์ด' },
  { path: '/payments', label: 'รายการเรียกเก็บ' },
  { path: '/expenses', label: 'รายการเบิกจ่าย' },
  { path: '/budget', label: 'งบประมาณระบบ' },
  { path: '/students', label: 'รายชื่อนักศึกษา' },
  { path: '/sections', label: 'จัดการกลุ่มเรียน' },
  { path: '/majors', label: 'จัดการสาขาวิชา' },
  { path: '/users', label: 'จัดการสมาชิก' },
];

export function ManageUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Form state
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<Role>('operation');
  const [allowedPages, setAllowedPages] = useState<string[]>(AVAILABLE_PAGES.map(p => p.path));

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    setUsers([...db.users]);
  };

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setUsername(user.username);
      setRole(user.role);
      setAllowedPages(user.allowedPages || AVAILABLE_PAGES.map(p => p.path));
    } else {
      setEditingUser(null);
      setUsername('');
      setRole('operation');
      setAllowedPages(AVAILABLE_PAGES.map(p => p.path));
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleTogglePage = (path: string) => {
    setAllowedPages(prev => 
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      const idx = db.users.findIndex(u => u.id === editingUser.id);
      if (idx !== -1) {
        db.users[idx] = { ...editingUser, username, role, allowedPages };
      }
    } else {
      const newId = db.users.length > 0 ? Math.max(...db.users.map(u => u.id)) + 1 : 1;
      db.users.push({
        id: newId,
        username,
        role,
        allowedPages
      });
    }
    loadUsers();
    handleCloseModal();
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this user?')) {
      db.users = db.users.filter(u => u.id !== id);
      loadUsers();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">จัดการสมาชิก</h1>
          <p className="text-sm text-slate-500 mt-1">จำนวนสมาชิกทั้งหมด {users.length} คน</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => handleOpenModal()} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-blue-600 shadow-blue-200 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> เพิ่มสมาชิก
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left">
            <thead className="text-xs font-bold text-slate-500 uppercase bg-slate-50">
              <tr>
                <th className="px-6 py-3 border-b border-slate-100">ชื่อผู้ใช้</th>
                <th className="px-6 py-3 border-b border-slate-100">บทบาท</th>
                <th className="px-6 py-3 border-b border-slate-100 text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-4 text-center text-slate-500">ไม่พบข้อมูลสมาชิก</td></tr>
              ) : users.map(user => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-slate-900 font-medium">{user.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                    {user.role === 'admin' ? 'ผู้ดูแลระบบ' : user.role === 'operation' ? 'พนักงาน/ฝ่ายปฏิบัติการ' : user.role}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                    <button onClick={() => handleOpenModal(user)} className="text-blue-600 hover:text-blue-800 font-bold text-xs mr-3">
                      แก้ไข
                    </button>
                    {user.id !== 1 && (
                      <button onClick={() => handleDelete(user.id)} className="text-slate-400 hover:text-slate-600 font-bold text-xs">
                        ลบ
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-slate-900 bg-opacity-75" onClick={handleCloseModal} />
            <div className="relative inline-block w-full max-w-md p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-xl border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">{editingUser ? 'แก้ไขข้อมูลสมาชิก' : 'เพิ่มสมาชิกใหม่'}</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700">ชื่อผู้ใช้</label>
                  <input type="text" required value={username} onChange={e => setUsername(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 text-slate-800" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700">บทบาท</label>
                  <select required value={role} onChange={e => setRole(e.target.value as Role)} className="mt-1 block w-full px-3 py-2 border border-slate-300 bg-white rounded-md shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 text-slate-800">
                    <option value="admin">ผู้ดูแลระบบ</option>
                    <option value="operation">พนักงาน/ฝ่ายปฏิบัติการ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">สิทธิ์การเข้าถึงเมนู</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-md p-3">
                    {AVAILABLE_PAGES.map(page => (
                      <label key={page.path} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allowedPages.includes(page.path)}
                          onChange={() => handleTogglePage(page.path)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                        />
                        <span className="text-sm text-slate-700">{page.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 flex justify-end space-x-3">
                  <button type="button" onClick={handleCloseModal} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-md text-sm font-bold hover:bg-slate-200">ยกเลิก</button>
                  <button type="submit" className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-blue-600 shadow-blue-200 hover:bg-blue-700">บันทึกข้อมูล</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
