import React, { useState, useEffect } from 'react';
import { db, PaymentRequest, ExpenseRequest, Payment, Student, BudgetAddition } from '../lib/mockDb';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { Wallet, Clock, FileText, CheckCircle, XCircle } from 'lucide-react';

export function Dashboard() {
  const { user } = useAuth();
  const [totalBudget, setTotalBudget] = useState(0);
  const [recentExpenses, setRecentExpenses] = useState<ExpenseRequest[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [budgetAdditions, setBudgetAdditions] = useState<BudgetAddition[]>([]);
  const [selectedReq, setSelectedReq] = useState<PaymentRequest | null>(null);
  
  // Data for the modal
  const [requestPayments, setRequestPayments] = useState<{student: Student, payment: Payment | undefined}[]>([]);
  const [detailFilterSection, setDetailFilterSection] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setTotalBudget(db.getTotalBudget());
    setRecentExpenses(db.expense_requests.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5));
    setPaymentRequests(db.payment_requests);
    setBudgetAdditions(db.budget_additions.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5));
  };

  const openModal = (req: PaymentRequest) => {
    setSelectedReq(req);
    setDetailFilterSection('');
    // Find students in this section
    const studentsInSection = db.students.filter(s => req.target_sections.includes('All') || req.target_sections.includes(s.section));
    const payments = db.payments.filter(p => p.request_id === req.id);
    
    setRequestPayments(studentsInSection.map(student => ({
      student,
      payment: payments.find(p => p.student_id === student.id)
    })));
  };

  const closeModal = () => setSelectedReq(null);

  const pendingExpenseTotal = db.expense_requests.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.total_amount, 0);
  const unpaidCount = db.payments.filter(p => !p.is_paid).length;
  const studentTotal = db.students.length;
  const sectionsCount = Array.from(new Set(db.students.map(s => s.section))).length;

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Budget Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">งบประมาณคงเหลือ</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">฿{totalBudget.toLocaleString()}</p>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">รายการเก็บเงินที่ค้าง</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">{unpaidCount} รายการ</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">รออนุมัติเบิกเงิน</p>
          <p className="text-2xl font-bold mt-1 text-amber-600">฿{pendingExpenseTotal.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-2">{db.expense_requests.filter(e => e.status === 'pending').length} รายการรอ Admin</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">นักศึกษาทั้งหมด</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">{studentTotal.toLocaleString()} คน</p>
          <p className="text-xs text-slate-400 mt-2">แบ่งตาม {sectionsCount} Sections</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Requests */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
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
                {paymentRequests.length === 0 ? (
                  <tr><td colSpan={3} className="px-6 py-4 text-center text-slate-500">ไม่มีรายการเรียกเก็บเงิน</td></tr>
                ) : paymentRequests.map(req => (
                  <tr 
                    key={req.id} 
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => openModal(req)}
                  >
                    <td className="px-6 py-4 font-medium text-slate-800">{req.title}</td>
                    <td className="px-6 py-4 text-slate-600">{req.target_sections.join(', ')}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">฿{req.amount_per_person.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
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
                {recentExpenses.length === 0 ? (
                  <tr><td colSpan={3} className="px-6 py-4 text-center text-slate-500">ไม่มีรายการเบิกจ่ายล่าสุด</td></tr>
                ) : recentExpenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-800">{exp.title}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">฿{exp.total_amount.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full ${
                        exp.status === 'approved' ? 'bg-green-100 text-green-700' :
                        exp.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {exp.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Budget Additions */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
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
              {budgetAdditions.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-4 text-center text-slate-500">ไม่พบประวัติการเติมงบประมาณ</td></tr>
              ) : budgetAdditions.map(addition => (
                <tr key={addition.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-800">{addition.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-green-600 font-bold">+฿{addition.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-500">{format(new Date(addition.created_at), 'dd MMM yyyy')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Payment Request Details */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-slate-900 bg-opacity-75" onClick={closeModal} />
            <div className="relative inline-block w-full max-w-2xl px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-xl shadow-xl sm:my-8 sm:align-middle sm:p-6 border border-slate-200">
              <div>
                <h3 className="text-lg font-bold leading-6 text-slate-900 mb-4">รายละเอียด {selectedReq.title}</h3>
                <div className="mt-2 text-sm text-slate-500 space-y-2">
                  <p><strong>เป้าหมายกลุ่มเรียน:</strong> {selectedReq.target_sections.join(', ')}</p>
                  <p><strong>จำนวนเงิน:</strong> ฿{selectedReq.amount_per_person.toLocaleString()} / คน</p>
                </div>
                
                <div className="mt-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3">
                    <h4 className="text-sm font-bold text-slate-700">สถานะการชำระเงินของนักศึกษา</h4>
                    {Array.from(new Set(requestPayments.map(rp => rp.student.section))).length > 1 && (
                      <select 
                        value={detailFilterSection} 
                        onChange={e => setDetailFilterSection(e.target.value)}
                        className="mt-2 sm:mt-0 px-3 py-1.5 border border-slate-200 rounded text-sm bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">ทุกกลุ่มเรียน</option>
                        {Array.from(new Set(requestPayments.map(rp => rp.student.section))).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-4">
                    {(detailFilterSection ? [detailFilterSection] : Array.from(new Set(requestPayments.map(rp => rp.student.section)))).map(section => {
                      const sectionPayments = requestPayments.filter(rp => rp.student.section === section);
                      if (sectionPayments.length === 0) return null;
                      return (
                        <div key={section} className="border border-slate-200 rounded-lg overflow-hidden">
                          <div className="bg-slate-100 px-4 py-2 border-b border-slate-200">
                            <span className="font-bold text-slate-700 text-sm">กลุ่มเรียน: {section}</span>
                          </div>
                          <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50 sticky top-0">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">นักศึกษา</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">สถานะ</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">ดำเนินการ</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100 text-sm">
                              {sectionPayments.map(({student, payment}) => (
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
                                  <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                                    {!payment?.is_paid && (
                                      <button className="text-blue-600 hover:text-blue-700 text-xs font-semibold px-2 py-1 rounded bg-slate-100 hover:bg-slate-200">
                                        แนบหลักฐาน
                                      </button>
                                    )}
                                    {payment?.receipt_image && <span className="text-slate-500 text-xs">แนบหลักฐานแล้ว</span>}
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
              </div>
              <div className="mt-5 sm:mt-6">
                <button
                  type="button"
                  className="inline-flex justify-center w-full px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 border border-transparent rounded-md shadow-sm hover:bg-slate-200"
                  onClick={closeModal}
                >
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
