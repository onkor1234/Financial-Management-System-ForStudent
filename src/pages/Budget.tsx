import React, { useState, useEffect } from 'react';
import { api, BudgetAddition, formatMoney } from '../lib/api';
import { format } from 'date-fns';
import { Plus, Wallet } from 'lucide-react';

export function Budget() {
  const [additions, setAdditions]     = useState<BudgetAddition[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amount, setAmount]           = useState(0);
  const [description, setDescription] = useState('');
  const [loading, setLoading]         = useState(false);

  useEffect(() => { loadAdditions(); }, []);

  const loadAdditions = async () => {
    try {
      setAdditions(await api.budget.list());
    } catch (err) {
      alert(err instanceof Error ? err.message : 'โหลดข้อมูลล้มเหลว');
    }
  };

  const handleOpenModal = () => {
    setAmount(0);
    setDescription('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) { alert('จำนวนเงินต้องมากกว่า 0'); return; }
    setLoading(true);
    try {
      await api.budget.create({ amount, description });
      await loadAdditions();
      handleCloseModal();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'บันทึกข้อมูลล้มเหลว');
    } finally {
      setLoading(false);
    }
  };

  const totalAdded = additions.reduce((sum, a) => sum + a.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">รายการเติมงบประมาณเข้าระบบ</h1>
        <button onClick={handleOpenModal}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-green-600 shadow-green-200 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" /> เติมงบประมาณ
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">งบประมาณรวมที่เติมเข้าระบบ</p>
          <h2 className="text-3xl font-bold text-slate-900 mt-1">฿{formatMoney(totalAdded)}</h2>
        </div>
        <div className="p-4 bg-green-100 text-green-600 rounded-full">
          <Wallet className="w-8 h-8" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 font-bold text-slate-800">ประวัติการทำรายการ</div>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left">
            <thead className="text-xs font-bold text-slate-500 uppercase bg-slate-50">
              <tr>
                <th className="px-6 py-3 border-b border-slate-100">ลำดับ</th>
                <th className="px-6 py-3 border-b border-slate-100">รายละเอียด</th>
                <th className="px-6 py-3 border-b border-slate-100">จำนวนเงิน</th>
                <th className="px-6 py-3 border-b border-slate-100">วันที่เติม</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {additions.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-4 text-center text-slate-500">ไม่พบประวัติการเติมงบประมาณ</td></tr>
              ) : additions.map(addition => (
                <tr key={addition.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-slate-900 font-medium">{addition.id}</td>
                  <td className="px-6 py-4 text-slate-700">{addition.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-green-600 font-bold">+฿{formatMoney(addition.amount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                    {format(new Date(addition.created_at), 'dd MMM yyyy HH:mm')}
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
            <div className="fixed inset-0 transition-opacity bg-slate-900/10 backdrop-blur-sm" onClick={handleCloseModal} />
            <div className="relative inline-block w-full max-w-md p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-xl border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">เติมงบประมาณเข้าระบบ</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700">จำนวนเงิน (฿)</label>
                  <input type="number" required min="0.01" step="0.01" value={amount || ''}
                    onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm focus:ring-green-500 focus:border-green-500 text-slate-800" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700">รายละเอียด</label>
                  <input type="text" required value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="เช่น เงินสนับสนุนจากคณะ"
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm focus:ring-green-500 focus:border-green-500 text-slate-800" />
                </div>
                <div className="mt-5 sm:mt-6 flex justify-end space-x-3">
                  <button type="button" onClick={handleCloseModal} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-md text-sm font-bold hover:bg-slate-200">ยกเลิก</button>
                  <button type="submit" disabled={loading} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-green-600 shadow-green-200 hover:bg-green-700 disabled:opacity-60">
                    {loading ? 'กำลังบันทึก...' : 'เติมงบประมาณ'}
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
