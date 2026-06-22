import React, { useState, useEffect } from 'react';
import { api, Section, Major, Department } from '../lib/api';
import { Plus, Layers, BookOpen, Building2 } from 'lucide-react';

type Tab = 'sections' | 'majors' | 'departments';

interface Item { id: number; name: string; }

const TAB_META: Record<Tab, { label: string; empty: string; icon: React.ElementType }> = {
  sections:    { label: 'กลุ่มเรียน', empty: 'ไม่พบข้อมูลกลุ่มเรียน', icon: Layers },
  majors:      { label: 'สาขาวิชา',  empty: 'ไม่พบข้อมูลสาขาวิชา',  icon: BookOpen },
  departments: { label: 'ตำแหน่ง',   empty: 'ไม่พบข้อมูลตำแหน่ง',   icon: Building2 },
};

function ItemTable({
  items, label, emptyText,
  onAdd, onEdit, onDelete,
}: {
  items: Item[]; label: string; emptyText: string;
  onAdd: () => void; onEdit: (item: Item) => void; onDelete: (item: Item) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={onAdd}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-blue-600 shadow-blue-200 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" /> เพิ่ม{label}ใหม่
        </button>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="text-xs font-bold text-slate-500 uppercase bg-slate-50">
            <tr>
              <th className="px-6 py-3 border-b border-slate-100">ลำดับ</th>
              <th className="px-6 py-3 border-b border-slate-100">ชื่อ{label}</th>
              <th className="px-6 py-3 border-b border-slate-100 text-right">ดำเนินการ</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr><td colSpan={3} className="px-6 py-4 text-center text-slate-500">{emptyText}</td></tr>
            ) : items.map((item, idx) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-slate-900 font-medium">{idx + 1}</td>
                <td className="px-6 py-4 whitespace-nowrap text-slate-700">{item.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                  <button onClick={() => onEdit(item)} className="text-blue-600 hover:text-blue-800 font-bold text-xs mr-3">แก้ไข</button>
                  <button onClick={() => onDelete(item)} className="text-slate-400 hover:text-slate-600 font-bold text-xs">ลบ</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function MasterData() {
  const [activeTab, setActiveTab] = useState<Tab>('sections');
  const [sections, setSections]       = useState<Section[]>([]);
  const [majors, setMajors]           = useState<Major[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab]       = useState<Tab>('sections');
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [name, setName]               = useState('');
  const [loading, setLoading]         = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [s, m, d] = await Promise.all([
        api.sections.list(),
        api.majors.list(),
        api.departments.list(),
      ]);
      setSections(s);
      setMajors(m);
      setDepartments(d);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'โหลดข้อมูลล้มเหลว');
    }
  };

  const openModal = (tab: Tab, item?: Item) => {
    setModalTab(tab);
    setEditingItem(item ?? null);
    setName(item?.name ?? '');
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (modalTab === 'sections') {
        editingItem ? await api.sections.update(editingItem.id, name) : await api.sections.create(name);
      } else if (modalTab === 'majors') {
        editingItem ? await api.majors.update(editingItem.id, name) : await api.majors.create(name);
      } else {
        editingItem ? await api.departments.update(editingItem.id, name) : await api.departments.create(name);
      }
      await loadAll();
      closeModal();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'บันทึกข้อมูลล้มเหลว');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (tab: Tab, item: Item) => {
    if (!confirm(`ยืนยันการลบ${TAB_META[tab].label} "${item.name}"?`)) return;
    try {
      if (tab === 'sections') await api.sections.delete(item.id);
      else if (tab === 'majors') await api.majors.delete(item.id);
      else await api.departments.delete(item.id);
      await loadAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ลบข้อมูลล้มเหลว');
    }
  };

  const tabs: { key: Tab }[] = [{ key: 'sections' }, { key: 'majors' }, { key: 'departments' }];

  const currentItems: Item[] =
    activeTab === 'sections' ? sections :
    activeTab === 'majors'   ? majors   : departments;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Master Data</h1>
        <p className="text-sm text-slate-500 mt-1">จัดการข้อมูลพื้นฐานของระบบ</p>
      </div>

      {/* Tab bar */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-6">
          {tabs.map(({ key }) => {
            const meta = TAB_META[key];
            const Icon = meta.icon;
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {meta.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <ItemTable
        items={currentItems}
        label={TAB_META[activeTab].label}
        emptyText={TAB_META[activeTab].empty}
        onAdd={() => openModal(activeTab)}
        onEdit={item => openModal(activeTab, item)}
        onDelete={item => handleDelete(activeTab, item)}
      />

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-slate-900/10 backdrop-blur-sm" onClick={closeModal} />
            <div className="relative inline-block w-full max-w-md p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-xl border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                {editingItem ? `แก้ไข${TAB_META[modalTab].label}` : `เพิ่ม${TAB_META[modalTab].label}ใหม่`}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700">ชื่อ{TAB_META[modalTab].label}</label>
                  <input
                    type="text" required value={name} onChange={e => setName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 text-slate-800"
                  />
                </div>
                <div className="mt-5 sm:mt-6 flex justify-end space-x-3">
                  <button type="button" onClick={closeModal} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-md text-sm font-bold hover:bg-slate-200">ยกเลิก</button>
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
