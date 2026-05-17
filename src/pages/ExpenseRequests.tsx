import React, { useState, useEffect } from 'react';
import { db, ExpenseRequest, ExpenseItem } from '../lib/mockDb';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Check, X, Eye, Download, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

export function ExpenseRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ExpenseRequest[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
  // Create Request State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<{name: string; price: number}[]>([{ name: '', price: 0 }]);

  // Selected details
  const [selectedReq, setSelectedReq] = useState<ExpenseRequest | null>(null);
  const [selectedItems, setSelectedItems] = useState<ExpenseItem[]>([]);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = () => {
    setRequests([...db.expense_requests].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
  };

  const handleAddItem = () => {
    setItems([...items, { name: '', price: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: 'name' | 'price', value: string | number) => {
    const newItems = [...items];
    if (field === 'name') newItems[index].name = value as string;
    else newItems[index].price = value as number;
    setItems(newItems);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Filter out empty items
    const validItems = items.filter(i => i.name.trim() !== '' && i.price > 0);
    if (validItems.length === 0) {
      alert("Please add at least one valid item.");
      return;
    }

    const totalAmount = validItems.reduce((sum, item) => sum + item.price, 0);
    const newReqId = db.expense_requests.length > 0 ? Math.max(...db.expense_requests.map(r => r.id)) + 1 : 1;

    db.expense_requests.push({
      id: newReqId,
      title,
      description,
      total_amount: totalAmount,
      status: 'pending',
      created_by: user.id,
      approved_by: null,
      created_at: new Date().toISOString()
    });

    let itemId = db.expense_items.length > 0 ? Math.max(...db.expense_items.map(i => i.id)) + 1 : 1;
    validItems.forEach(item => {
      db.expense_items.push({
        id: itemId++,
        expense_request_id: newReqId,
        item_name: item.name,
        price: item.price
      });
    });

    loadRequests();
    setIsModalOpen(false);
    setTitle('');
    setDescription('');
    setItems([{ name: '', price: 0 }]);
  };

  const openDetails = (req: ExpenseRequest) => {
    setSelectedReq(req);
    setSelectedItems(db.expense_items.filter(i => i.expense_request_id === req.id));
    setIsDetailsModalOpen(true);
  };

  const handleAction = (status: 'approved' | 'rejected') => {
    if (!selectedReq || !user || user.role !== 'admin') return;
    const idx = db.expense_requests.findIndex(r => r.id === selectedReq.id);
    if (idx !== -1) {
      db.expense_requests[idx].status = status;
      db.expense_requests[idx].approved_by = user.id;
      loadRequests();
      setIsDetailsModalOpen(false);
    }
  };

  const exportDetails = () => {
    if (!selectedReq) return;
    const data = selectedItems.map(item => ({
      ItemName: item.item_name,
      Price: item.price
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ExpenseItems");
    XLSX.writeFile(wb, `${selectedReq.title}_expense.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">รายการเบิกจ่าย</h1>
        {user?.role === 'operation' && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm shadow-blue-200 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            สร้างรายการใหม่
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden text-sm flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
              <tr>
                <th className="px-6 py-3 border-b border-slate-100">ชื่อรายการ</th>
                <th className="px-6 py-3 border-b border-slate-100">จำนวนเงิน</th>
                <th className="px-6 py-3 border-b border-slate-100">สถานะ</th>
                <th className="px-6 py-3 border-b border-slate-100">วันที่</th>
                <th className="px-6 py-3 border-b border-slate-100 text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {requests.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-slate-500">ไม่พบรายการเบิกจ่าย</td></tr>
              ) : requests.map(req => (
                <tr key={req.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{req.title}</td>
                  <td className="px-6 py-4 font-bold text-blue-600">฿{req.total_amount.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                      req.status === 'approved' ? 'bg-green-100 text-green-700' :
                      req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{format(new Date(req.created_at), 'dd MMM yyyy')}</td>
                  <td className="px-6 py-4 text-right font-medium">
                    <button 
                      onClick={() => openDetails(req)}
                      className="text-slate-500 hover:text-slate-800 flex items-center justify-end w-full font-bold text-xs"
                    >
                      <Eye className="w-4 h-4 mr-1" /> ดูรายละเอียด
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-slate-900 bg-opacity-75" onClick={() => setIsModalOpen(false)} />
            <div className="relative inline-block w-full max-w-2xl p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-xl border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">สร้างรายการเบิกจ่าย</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700">ชื่อรายการ</label>
                  <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 text-slate-800" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700">รายละเอียดเพิ่มเติม</label>
                  <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 text-slate-800" />
                </div>

                <div className="pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-bold text-slate-700">รายการสิ่งของ</label>
                    <button type="button" onClick={handleAddItem} className="text-blue-600 hover:text-blue-700 text-sm font-bold flex items-center">
                      <Plus className="w-4 h-4 mr-1" /> เพิ่มรายการ
                    </button>
                  </div>
                  <div className="space-y-2 border border-slate-200 rounded-md p-3 bg-slate-50 max-h-60 overflow-y-auto">
                    {items.map((item, index) => (
                      <div key={index} className="flex space-x-2 items-center">
                        <input 
                          type="text" 
                          placeholder="ชื่อสิ่งของ/รายการ" 
                          required
                          value={item.name}
                          onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm text-slate-800"
                        />
                        <input 
                          type="number" 
                          placeholder="ราคา (฿)" 
                          required
                          min="1"
                          value={item.price || ''}
                          onChange={(e) => handleItemChange(index, 'price', parseInt(e.target.value) || 0)}
                          className="w-32 px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm text-slate-800"
                        />
                        <button 
                          type="button" 
                          onClick={() => handleRemoveItem(index)}
                          className="p-1.5 text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-right">
                    <span className="text-sm font-bold text-slate-700">ยอดรวม: ฿{items.reduce((s, i) => s + (i.price || 0), 0).toLocaleString()}</span>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-md text-sm font-bold hover:bg-slate-200">ยกเลิก</button>
                  <button type="submit" className="px-4 py-2 border border-transparent rounded-md shadow-sm shadow-blue-200 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700">ส่งคำชอบิกเงิน</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {isDetailsModalOpen && selectedReq && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-slate-900 bg-opacity-75" onClick={() => setIsDetailsModalOpen(false)} />
            <div className="relative inline-block w-full max-w-2xl p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-xl border border-slate-200">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedReq.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{selectedReq.description}</p>
                </div>
                <button onClick={exportDetails} className="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-600 rounded-md text-sm font-bold hover:bg-slate-200">
                  <Download className="w-4 h-4 mr-2" /> ส่งออก Excel
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
                <div>
                  <span className="block text-slate-500 font-bold uppercase text-[10px] tracking-wider font-bold">วันที่สร้าง</span>
                  <span className="font-semibold text-slate-900 mt-1 block">{format(new Date(selectedReq.created_at), 'dd MMM yyyy HH:mm')}</span>
                </div>
                <div>
                  <span className="block text-slate-500 font-bold uppercase text-[10px] tracking-wider mb-1 font-bold">สถานะ</span>
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold ${
                    selectedReq.status === 'approved' ? 'bg-green-100 text-green-700' :
                    selectedReq.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {selectedReq.status === 'pending' ? 'รออนุมัติ' : selectedReq.status === 'approved' ? 'อนุมัติแล้ว' : 'ปฏิเสธแล้ว'}
                  </span>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-4">
                <h4 className="text-sm font-bold text-slate-700 mb-2">รายการสิ่งของ</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">รายการ</th>
                        <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">จำนวนเงิน (฿)</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {selectedItems.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2 whitespace-nowrap text-slate-800">{item.item_name}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-slate-800 text-right">{item.price.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold">
                      <tr>
                        <td className="px-4 py-3 text-right">ยอดรวม:</td>
                        <td className="px-4 py-3 text-right text-blue-600 font-bold">฿{selectedReq.total_amount.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="mt-8 flex justify-between">
                <button type="button" onClick={() => setIsDetailsModalOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-md text-sm font-bold hover:bg-slate-200">
                  ปิดหน้าต่าง
                </button>
                
                {/* Admin Actions */}
                {user?.role === 'admin' && selectedReq.status === 'pending' && (
                  <div className="flex space-x-3">
                    <button 
                      onClick={() => handleAction('rejected')}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-red-600 hover:bg-red-700 flex items-center shadow-red-200"
                    >
                      <X className="w-4 h-4 mr-1" /> ปฏิเสธ
                    </button>
                    <button 
                      onClick={() => handleAction('approved')}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-green-600 hover:bg-green-700 flex items-center shadow-green-200"
                    >
                      <Check className="w-4 h-4 mr-1" /> อนุมัติ
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
