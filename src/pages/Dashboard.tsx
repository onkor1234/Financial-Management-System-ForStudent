import React, { useState, useEffect, useMemo } from 'react';
import { api, DashboardData, PaymentRequest, ExpenseRequest, ExpenseItem, formatMoney } from '../lib/api';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Banknote, ClipboardList, Clock, Users, TrendingUp, Receipt, PlusCircle, Eye } from 'lucide-react';

export function Dashboard() {
  const emptyData: DashboardData = {
    totalBudget: 0, unpaidCount: 0,
    pendingExpenseTotal: 0, pendingExpenseCount: 0,
    studentCount: 0, sectionCount: 0,
    recentExpenses: [], paymentRequests: [], budgetAdditions: [],
  };

  const [data, setData]               = useState<DashboardData>(emptyData);
  const [selectedReq, setSelectedReq]         = useState<PaymentRequest | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRequest | null>(null);
  const [selectedExpenseItems, setSelectedExpenseItems] = useState<ExpenseItem[]>([]);
  const [detailFilterSection, setDetailFilterSection] = useState('');
  const [detailSearch, setDetailSearch] = useState('');
  const [detailStatusFilter, setDetailStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [detailData, setDetailData]   = useState<{ student: { id: number; student_id: string; first_name: string; last_name: string; section: string }; payment: { is_paid: boolean } | null }[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setData(await api.dashboard.getData());
    } catch {
      // ไม่ต้องทำอะไร — คงค่า emptyData ไว้ แสดงตัวเลข 0
    }
  };

  const openModal = async (req: PaymentRequest) => {
    setSelectedReq(req);
    setDetailFilterSection('');
    setDetailSearch('');
    setDetailStatusFilter('all');
    try {
      const details = await api.dashboard.getPaymentStatus(req.id);
      setDetailData(details.student_payments.map(sp => ({
        student: sp.student,
        payment: sp.payment ? { is_paid: sp.payment.is_paid } : null,
      })));
    } catch {
      setDetailData([]);
    }
  };

  const closeModal = () => {
    setSelectedReq(null);
    setDetailData([]);
    setDetailSearch('');
    setDetailStatusFilter('all');
    setDetailFilterSection('');
  };

  const openExpenseModal = async (exp: ExpenseRequest) => {
    setSelectedExpense(exp);
    try {
      const details = await api.expenseRequests.getDetails(exp.id);
      setSelectedExpenseItems(details.items);
    } catch {
      setSelectedExpenseItems([]);
    }
  };

  const closeExpenseModal = () => {
    setSelectedExpense(null);
    setSelectedExpenseItems([]);
  };

  const normalizedDetailSearch = detailSearch.trim().toLowerCase();
  const filteredDetail = detailData.filter(d => {
    const matchSection = detailFilterSection === '' || d.student.section === detailFilterSection;
    const isPaid = Boolean(d.payment?.is_paid);
    const matchStatus =
      detailStatusFilter === 'all' ||
      (detailStatusFilter === 'paid' ? isPaid : !isPaid);
    const searchText = `${d.student.student_id} ${d.student.first_name} ${d.student.last_name}`.toLowerCase();
    const matchSearch = !normalizedDetailSearch || searchText.includes(normalizedDetailSearch);
    return matchSection && matchStatus && matchSearch;
  });
  const uniqueDetailSections = Array.from(new Set(detailData.map(d => d.student.section)));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* งบประมาณคงเหลือ */}
        <div className="relative bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 rounded-2xl shadow-lg overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full" />
          <div className="absolute -right-2 -bottom-6 w-32 h-32 bg-white/10 rounded-full" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-emerald-100 font-semibold uppercase tracking-wider">งบประมาณคงเหลือ</p>
              <div className="bg-white/20 p-2 rounded-lg">
                <Banknote className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">฿{formatMoney(data.totalBudget)}</p>
            <p className="text-xs text-emerald-100 mt-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> งบประมาณปัจจุบัน
            </p>
          </div>
        </div>

        {/* รายการเก็บเงินที่ค้าง */}
        <div className="relative bg-gradient-to-br from-rose-500 to-rose-600 p-5 rounded-2xl shadow-lg overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full" />
          <div className="absolute -right-2 -bottom-6 w-32 h-32 bg-white/10 rounded-full" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-rose-100 font-semibold uppercase tracking-wider">รายการเก็บเงินค้าง</p>
              <div className="bg-white/20 p-2 rounded-lg">
                <ClipboardList className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{data.unpaidCount.toLocaleString()}</p>
            <p className="text-xs text-rose-100 mt-2">รายการที่ยังไม่ได้ชำระ</p>
          </div>
        </div>

        {/* รออนุมัติเบิกเงิน */}
        <div className="relative bg-gradient-to-br from-amber-400 to-amber-500 p-5 rounded-2xl shadow-lg overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full" />
          <div className="absolute -right-2 -bottom-6 w-32 h-32 bg-white/10 rounded-full" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-amber-900/70 font-semibold uppercase tracking-wider">รออนุมัติเบิกเงิน</p>
              <div className="bg-white/20 p-2 rounded-lg">
                <Receipt className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">฿{formatMoney(data.pendingExpenseTotal)}</p>
            <p className="text-xs text-amber-900/60 mt-2 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {data.pendingExpenseCount} รายการรออนุมัติ
            </p>
          </div>
        </div>

        {/* นักศึกษาทั้งหมด */}
        <div className="relative bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-2xl shadow-lg overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full" />
          <div className="absolute -right-2 -bottom-6 w-32 h-32 bg-white/10 rounded-full" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-blue-100 font-semibold uppercase tracking-wider">นักศึกษาทั้งหมด</p>
              <div className="bg-white/20 p-2 rounded-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{data.studentCount.toLocaleString()} <span className="text-xl font-semibold">คน</span></p>
            <p className="text-xs text-blue-100 mt-2 flex items-center gap-1">
              <PlusCircle className="w-3 h-3" /> แบ่งเป็น {data.sectionCount} กลุ่มเรียน
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
            <div className="bg-rose-100 p-2 rounded-lg">
              <ClipboardList className="w-4 h-4 text-rose-600" />
            </div>
            <h3 className="font-bold text-slate-700">รายการเรียกเก็บเงินที่เปิดอยู่</h3>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left">
              <thead className="text-xs font-bold text-slate-500 uppercase bg-slate-50">
                <tr>
                  <th className="px-6 py-3">รายการ</th>
                  <th className="px-6 py-3">กลุ่มเรียน</th>
                  <th className="px-6 py-3">ยอด/คน</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {data.paymentRequests.length === 0 ? (
                  <tr><td colSpan={3} className="px-6 py-4 text-center text-slate-500">ไม่มีรายการเรียกเก็บเงิน</td></tr>
                ) : data.paymentRequests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => openModal(req)}>
                    <td className="px-6 py-4 font-medium text-slate-800">{req.title}</td>
                    <td className="px-6 py-4 text-slate-600">{req.target_sections.join(', ')}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">฿{formatMoney(req.amount_per_person)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
            <div className="bg-amber-100 p-2 rounded-lg">
              <Receipt className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="font-bold text-slate-700">รายการเบิกจ่ายล่าสุด</h3>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left">
              <thead className="text-xs font-bold text-slate-500 uppercase bg-slate-50">
                <tr>
                  <th className="px-6 py-3">รายการ</th>
                  <th className="px-6 py-3">จำนวนเงิน</th>
                  <th className="px-6 py-3">สถานะ</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {data.recentExpenses.length === 0 ? (
                  <tr><td colSpan={3} className="px-6 py-4 text-center text-slate-500">ไม่มีรายการเบิกจ่ายล่าสุด</td></tr>
                ) : data.recentExpenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => openExpenseModal(exp)}>
                    <td className="px-6 py-4 font-medium text-slate-800">{exp.title}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">฿{formatMoney(exp.total_amount)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full ${
                        exp.status === 'approved' ? 'bg-green-100 text-green-700' :
                        exp.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {exp.status === 'pending' ? 'รออนุมัติ' : exp.status === 'approved' ? 'อนุมัติแล้ว' : 'ปฏิเสธแล้ว'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
          <div className="bg-emerald-100 p-2 rounded-lg">
            <Banknote className="w-4 h-4 text-emerald-600" />
          </div>
          <h3 className="font-bold text-slate-700">รายการเติมงบประมาณล่าสุด</h3>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left">
            <thead className="text-xs font-bold text-slate-500 uppercase bg-slate-50">
              <tr>
                <th className="px-6 py-3">รายการ</th>
                <th className="px-6 py-3">จำนวนเงิน</th>
                <th className="px-6 py-3">วันที่เพิ่ม</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {data.budgetAdditions.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-4 text-center text-slate-500">ไม่พบประวัติการเติมงบประมาณ</td></tr>
              ) : data.budgetAdditions.map(addition => (
                <tr key={addition.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-800">{addition.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-green-600 font-bold">+฿{formatMoney(addition.amount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                    {format(new Date(addition.created_at), 'dd MMM yyyy')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedExpense && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-slate-900 bg-opacity-75" onClick={closeExpenseModal} />
            <div className="relative inline-block w-full max-w-2xl p-6 overflow-y-auto text-left align-middle transition-all transform bg-white shadow-xl rounded-xl border border-slate-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedExpense.title}</h3>
                  {selectedExpense.description && (
                    <p className="text-sm text-slate-500 mt-1">{selectedExpense.description}</p>
                  )}
                </div>
                <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${
                  selectedExpense.status === 'approved' ? 'bg-green-100 text-green-700' :
                  selectedExpense.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {selectedExpense.status === 'pending' ? 'รออนุมัติ' : selectedExpense.status === 'approved' ? 'อนุมัติแล้ว' : 'ปฏิเสธแล้ว'}
                </span>
              </div>

              <p className="text-xs text-slate-400 mb-4">{format(new Date(selectedExpense.created_at), 'dd MMM yyyy HH:mm')}</p>

              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">รายการ</th>
                      <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">ราคา/หน่วย (฿)</th>
                      <th className="px-4 py-2 text-center text-xs font-bold text-slate-500 uppercase">จำนวน</th>
                      <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">รวม (฿)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {selectedExpenseItems.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-4 text-center text-slate-400">กำลังโหลด...</td></tr>
                    ) : selectedExpenseItems.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-slate-800">{item.item_name}</td>
                        <td className="px-4 py-2 text-slate-800 text-right">{formatMoney(item.price)}</td>
                        <td className="px-4 py-2 text-slate-800 text-center">{item.quantity ?? 1}</td>
                        <td className="px-4 py-2 text-blue-700 font-semibold text-right">{formatMoney(item.price * (item.quantity ?? 1))}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right">ยอดรวม:</td>
                      <td className="px-4 py-3 text-right text-blue-600">฿{formatMoney(selectedExpense.total_amount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="mt-6">
                <button type="button" onClick={closeExpenseModal}
                  className="w-full px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200">
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedReq && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-slate-900 bg-opacity-75" onClick={closeModal} />
            <div className="relative inline-block w-full max-w-2xl px-4 pt-5 pb-4 overflow-y-auto text-left align-bottom transition-all transform bg-white rounded-xl shadow-xl sm:my-8 sm:align-middle sm:p-6 border border-slate-200">
              <h3 className="text-lg font-bold leading-6 text-slate-900 mb-4">รายละเอียด {selectedReq.title}</h3>
              <div className="text-sm text-slate-500 space-y-2">
                <p><strong>เป้าหมายกลุ่มเรียน:</strong> {selectedReq.target_sections.join(', ')}</p>
                <p><strong>จำนวนเงิน:</strong> ฿{formatMoney(selectedReq.amount_per_person)} / คน</p>
              </div>

              <div className="mt-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 mb-3">
                  <h4 className="text-sm font-bold text-slate-700">สถานะการชำระเงินของนักศึกษา</h4>
                  <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-2">
                    <div className="w-full sm:w-64">
                      <input
                        type="text"
                        value={detailSearch}
                        onChange={e => setDetailSearch(e.target.value)}
                        placeholder="ค้นหารหัสนักศึกษา/ชื่อ"
                        className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <select
                      value={detailStatusFilter}
                      onChange={e => setDetailStatusFilter(e.target.value as 'all' | 'paid' | 'unpaid')}
                      className="px-3 py-1.5 border border-slate-200 rounded text-sm bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="all">ทุกสถานะ</option>
                      <option value="paid">จ่ายแล้ว</option>
                      <option value="unpaid">ยังไม่จ่าย</option>
                    </select>
                    {uniqueDetailSections.length > 1 && (
                      <select value={detailFilterSection} onChange={e => setDetailFilterSection(e.target.value)}
                        className="px-3 py-1.5 border border-slate-200 rounded text-sm bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">ทุกกลุ่มเรียน</option>
                        {uniqueDetailSections.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto overflow-x-auto space-y-4">
                  {filteredDetail.length === 0 && (
                    <div className="border border-dashed border-slate-300 rounded-lg px-4 py-6 text-center text-sm text-slate-500 bg-slate-50">
                      ไม่พบข้อมูลตามเงื่อนไขที่เลือก
                    </div>
                  )}
                  {(detailFilterSection ? [detailFilterSection] : uniqueDetailSections).map(section => {
                    const sectionData = filteredDetail.filter(d => d.student.section === section);
                    if (sectionData.length === 0) return null;
                    return (
                      <div key={section} className="border border-slate-200 rounded-lg overflow-x-auto">
                        <div className="bg-slate-100 px-4 py-2 border-b border-slate-200">
                          <span className="font-bold text-slate-700 text-sm">กลุ่มเรียน: {section}</span>
                        </div>
                        <table className="min-w-full divide-y divide-slate-100">
                          <thead className="bg-slate-50 sticky top-0">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">นักศึกษา</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">สถานะ</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-100 text-sm">
                            {sectionData.map(({ student, payment }) => (
                              <tr key={student.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap text-slate-900 font-medium">
                                  {student.student_id} - {student.first_name} {student.last_name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {payment?.is_paid ? (
                                    <span className="inline-flex items-center text-green-600 font-semibold">
                                      <CheckCircle className="w-4 h-4 mr-1" /> จ่ายแล้ว
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center text-slate-400 font-semibold">
                                      <XCircle className="w-4 h-4 mr-1" /> ยังไม่จ่าย
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 sm:mt-6">
                <button type="button" onClick={closeModal}
                  className="inline-flex justify-center w-full px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 border border-transparent rounded-md shadow-sm hover:bg-slate-200">
                  ปิดหน้านี้
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
