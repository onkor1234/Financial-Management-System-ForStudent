import React, { useState, useEffect } from 'react';
import { db, Major } from '../lib/mockDb';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export function Majors() {
  const [majors, setMajors] = useState<Major[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMajor, setEditingMajor] = useState<Major | null>(null);
  
  const [name, setName] = useState('');

  useEffect(() => {
    loadMajors();
  }, []);

  const loadMajors = () => {
    setMajors([...db.majors]);
  };

  const handleOpenModal = (major?: Major) => {
    if (major) {
      setEditingMajor(major);
      setName(major.name);
    } else {
      setEditingMajor(null);
      setName('');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMajor) {
      const idx = db.majors.findIndex(m => m.id === editingMajor.id);
      if (idx !== -1) {
        const oldName = db.majors[idx].name;
        db.majors[idx] = { ...editingMajor, name: name };
        
        db.students.forEach(s => {
          if (s.major === oldName) s.major = name;
        });
      }
    } else {
      const newId = db.majors.length > 0 ? Math.max(...db.majors.map(m => m.id)) + 1 : 1;
      db.majors.push({
        id: newId,
        name
      });
    }
    loadMajors();
    handleCloseModal();
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete major "${name}"?`)) {
      db.majors = db.majors.filter(m => m.id !== id);
      loadMajors();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">จัดการสาขาวิชา</h1>
        <button onClick={() => handleOpenModal()} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-blue-600 shadow-blue-200 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> เพิ่มสาขาวิชาใหม่
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left">
              <thead className="text-xs font-bold text-slate-500 uppercase bg-slate-50">
                <tr>
                  <th className="px-6 py-3 border-b border-slate-100">ลำดับ</th>
                  <th className="px-6 py-3 border-b border-slate-100">ชื่อสาขาวิชา</th>
                  <th className="px-6 py-3 border-b border-slate-100 text-right">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {majors.length === 0 ? (
                  <tr><td colSpan={3} className="px-6 py-4 text-center text-slate-500">ไม่พบข้อมูลสาขาวิชา</td></tr>
                ) : majors.map(major => (
                  <tr key={major.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-900 font-medium">{major.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-700">{major.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                      <button onClick={() => handleOpenModal(major)} className="text-blue-600 hover:text-blue-800 font-bold text-xs mr-3">
                        แก้ไข
                      </button>
                      <button onClick={() => handleDelete(major.id, major.name)} className="text-slate-400 hover:text-slate-600 font-bold text-xs">
                        ลบ
                      </button>
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
              <h3 className="text-lg font-bold text-slate-900 mb-4">{editingMajor ? 'แก้ไขสาขาวิชา' : 'เพิ่มสาขาวิชาใหม่'}</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700">ชื่อสาขาวิชา</label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 text-slate-800" />
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
