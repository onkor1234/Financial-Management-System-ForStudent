import React, { useState, useEffect } from 'react';
import { api, Section } from '../lib/api';
import { Plus } from 'lucide-react';

export function Sections() {
  const [sections, setSections]         = useState<Section[]>([]);
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [name, setName]                 = useState('');
  const [loading, setLoading]           = useState(false);

  useEffect(() => { loadSections(); }, []);

  const loadSections = async () => {
    try {
      setSections(await api.sections.list());
    } catch (err) {
      alert(err instanceof Error ? err.message : 'โหลดข้อมูลล้มเหลว');
    }
  };

  const handleOpenModal = (section?: Section) => {
    if (section) {
      setEditingSection(section);
      setName(section.name);
    } else {
      setEditingSection(null);
      setName('');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingSection) {
        await api.sections.update(editingSection.id, name);
      } else {
        await api.sections.create(name);
      }
      await loadSections();
      handleCloseModal();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'บันทึกข้อมูลล้มเหลว');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, sectionName: string) => {
    if (!confirm(`ยืนยันการลบกลุ่มเรียน "${sectionName}"?`)) return;
    try {
      await api.sections.delete(id);
      await loadSections();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ลบข้อมูลล้มเหลว');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">จัดการกลุ่มเรียน</h1>
        <button onClick={() => handleOpenModal()}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-blue-600 shadow-blue-200 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> เพิ่มกลุ่มเรียนใหม่
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left">
            <thead className="text-xs font-bold text-slate-500 uppercase bg-slate-50">
              <tr>
                <th className="px-6 py-3 border-b border-slate-100">ลำดับ</th>
                <th className="px-6 py-3 border-b border-slate-100">ชื่อกลุ่มเรียน</th>
                <th className="px-6 py-3 border-b border-slate-100 text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {sections.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-4 text-center text-slate-500">ไม่พบข้อมูลกลุ่มเรียน</td></tr>
              ) : sections.map(section => (
                <tr key={section.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-slate-900 font-medium">{section.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-700">{section.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                    <button onClick={() => handleOpenModal(section)} className="text-blue-600 hover:text-blue-800 font-bold text-xs mr-3">แก้ไข</button>
                    <button onClick={() => handleDelete(section.id, section.name)} className="text-slate-400 hover:text-slate-600 font-bold text-xs">ลบ</button>
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
                {editingSection ? 'แก้ไขกลุ่มเรียน' : 'เพิ่มกลุ่มเรียนใหม่'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700">ชื่อกลุ่มเรียน</label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 text-slate-800" />
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
