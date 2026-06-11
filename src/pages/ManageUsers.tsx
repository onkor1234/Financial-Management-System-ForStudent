import React, { useState, useEffect } from 'react';
import { api, User, Role, Department } from '../lib/api';
import { Plus } from 'lucide-react';

const AVAILABLE_PAGES = [
  { path: '/',             label: 'แดชบอร์ด' },
  { path: '/payments',     label: 'รายการเรียกเก็บ' },
  { path: '/expenses',     label: 'รายการเบิกจ่าย' },
  { path: '/budget',       label: 'งบประมาณระบบ' },
  { path: '/students',     label: 'รายชื่อนักศึกษา' },
  { path: '/master-data',  label: 'Master Data' },
  { path: '/users',        label: 'จัดการสมาชิก' },
];

export function ManageUsers() {
  const [users, setUsers]               = useState<User[]>([]);
  const [departments, setDepartments]   = useState<Department[]>([]);
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [editingUser, setEditingUser]   = useState<User | null>(null);
  const [loading, setLoading]           = useState(false);

  // Form state
  const [username, setUsername]               = useState('');
  const [password, setPassword]               = useState('');
  const [name, setName]                       = useState('');
  const [studentId, setStudentId]             = useState('');
  const [role, setRole]                       = useState<Role>('operation');
  const [departmentId, setDepartmentId]       = useState<number | null>(null);
  const [allowedPages, setAllowedPages]       = useState<string[]>(AVAILABLE_PAGES.map(p => p.path));
  const [canApprove, setCanApprove]           = useState(false);

  useEffect(() => {
    loadUsers();
    loadDepartments();
  }, []);

  const loadUsers = async () => {
    try {
      setUsers(await api.users.list());
    } catch (err) {
      alert(err instanceof Error ? err.message : 'โหลดข้อมูลล้มเหลว');
    }
  };

  const loadDepartments = async () => {
    try {
      setDepartments(await api.departments.list());
    } catch (err) {
      // non-critical — departments may be empty
    }
  };

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setUsername(user.username);
      setPassword('');
      setName(user.name);
      setStudentId(user.student_id ?? '');
      setRole(user.role);
      setDepartmentId(user.department_id ?? null);
      setAllowedPages(user.allowed_pages ?? AVAILABLE_PAGES.map(p => p.path));
      setCanApprove(user.can_approve_expenses ?? false);
    } else {
      setEditingUser(null);
      setUsername('');
      setPassword('');
      setName('');
      setStudentId('');
      setRole('operation');
      setDepartmentId(null);
      setAllowedPages(AVAILABLE_PAGES.map(p => p.path));
      setCanApprove(false);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleTogglePage = (path: string) => {
    setAllowedPages(prev =>
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingUser) {
        await api.users.update(editingUser.id, {
          username,
          ...(password ? { password } : {}),
          name,
          student_id: studentId || null,
          role,
          department_id: departmentId,
          allowed_pages: allowedPages,
          can_approve_expenses: canApprove,
        });
      } else {
        if (!password) { alert('กรุณากรอกรหัสผ่าน'); return; }
        await api.users.create({
          username, password, name,
          student_id: studentId || undefined,
          role,
          department_id: departmentId,
          allowed_pages: allowedPages,
          can_approve_expenses: canApprove,
        });
      }
      await loadUsers();
      handleCloseModal();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'บันทึกข้อมูลล้มเหลว');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('ยืนยันการลบสมาชิกนี้?')) return;
    try {
      await api.users.delete(id);
      await loadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ลบข้อมูลล้มเหลว');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">จัดการสมาชิก</h1>
          <p className="text-sm text-slate-500 mt-1">จำนวนสมาชิกทั้งหมด {users.length} คน</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-blue-600 shadow-blue-200 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" /> เพิ่มสมาชิก
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left">
            <thead className="text-xs font-bold text-slate-500 uppercase bg-slate-50">
              <tr>
                <th className="px-6 py-3 border-b border-slate-100">ชื่อผู้ใช้</th>
                <th className="px-6 py-3 border-b border-slate-100">ชื่อ-นามสกุล</th>
                <th className="px-6 py-3 border-b border-slate-100">รหัสนักศึกษา</th>
                <th className="px-6 py-3 border-b border-slate-100">ตำแหน่ง</th>
                <th className="px-6 py-3 border-b border-slate-100">บทบาท</th>
                <th className="px-6 py-3 border-b border-slate-100 text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-4 text-center text-slate-500">ไม่พบข้อมูลสมาชิก</td></tr>
              ) : users.map(user => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-slate-900 font-medium">{user.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-700">{user.name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-600">{user.student_id || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-600">{user.department_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                    {user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'พนักงาน/ฝ่ายปฏิบัติการ'}
                    {user.can_approve_expenses && (
                      <span className="ml-2 inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">อนุมัติได้</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                    <button onClick={() => handleOpenModal(user)} className="text-blue-600 hover:text-blue-800 font-bold text-xs mr-3">แก้ไข</button>
                    {user.id !== 1 && (
                      <button onClick={() => handleDelete(user.id)} className="text-slate-400 hover:text-slate-600 font-bold text-xs">ลบ</button>
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
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                {editingUser ? 'แก้ไขข้อมูลสมาชิก' : 'เพิ่มสมาชิกใหม่'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700">ชื่อผู้ใช้</label>
                  <input
                    type="text" required value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700">
                    รหัสผ่าน {editingUser && <span className="text-slate-400 font-normal">(เว้นว่างหากไม่ต้องการเปลี่ยน)</span>}
                  </label>
                  <input
                    type="password" value={password}
                    required={!editingUser}
                    onChange={e => setPassword(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 text-slate-800"
                    placeholder={editingUser ? 'กรอกเพื่อเปลี่ยนรหัสผ่าน' : ''}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700">ชื่อ-นามสกุล</label>
                  <input
                    type="text" required value={name}
                    onChange={e => setName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700">รหัสนักศึกษา <span className="text-slate-400 font-normal">(ถ้ามี)</span></label>
                  <input
                    type="text" value={studentId}
                    onChange={e => setStudentId(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700">ตำแหน่ง <span className="text-slate-400 font-normal">(ถ้ามี)</span></label>
                  <select
                    value={departmentId ?? ''}
                    onChange={e => setDepartmentId(e.target.value ? Number(e.target.value) : null)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 bg-white rounded-md shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 text-slate-800"
                  >
                    <option value="">— ไม่ระบุ —</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700">บทบาท</label>
                  <select
                    required value={role}
                    onChange={e => setRole(e.target.value as Role)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 bg-white rounded-md shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 text-slate-800"
                  >
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
                <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div>
                    <p className="text-sm font-bold text-slate-800">สิทธิ์อนุมัติรายการเบิกจ่าย</p>
                    <p className="text-xs text-slate-500 mt-0.5">ผู้ใช้นี้สามารถอนุมัติ/ปฏิเสธรายการเบิกจ่ายได้</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCanApprove(v => !v)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${canApprove ? 'bg-blue-600' : 'bg-slate-300'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${canApprove ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
                <div className="mt-5 sm:mt-6 flex justify-end space-x-3">
                  <button type="button" onClick={handleCloseModal} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-md text-sm font-bold hover:bg-slate-200">ยกเลิก</button>
                  <button type="submit" disabled={loading} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-blue-600 shadow-blue-200 hover:bg-blue-700 disabled:opacity-60">
                    {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
