import React, { useState, useEffect } from 'react';
import { api, DashboardData, PaymentRequest } from '../lib/api';
import { format } from 'date-fns';
import { CheckCircle, XCircle } from 'lucide-react';

export function Dashboard() {
  const [data, setData]               = useState<DashboardData | null>(null);
  const [selectedReq, setSelectedReq] = useState<PaymentRequest | null>(null);
  const [detailFilterSection, setDetailFilterSection] = useState('');
  const [detailData, setDetailData]   = useState<{ student: { id: number; student_id: string; first_name: string; last_name: string; section: string }; payment: { is_paid: boolean; receipt_image: string | null } | null }[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setData(await api.dashboard.getData());
    } catch (err) {
      console.error(err);
    }
  };

  const openModal = async (req: PaymentRequest) => {
    setSelectedReq(req);
    setDetailFilterSection('');
    try {
      const details = await api.paymentRequests.getDetails(req.id);
      setDetailData(details.student_payments.map(sp => ({
        student: sp.student,
        payment: sp.payment ? { is_paid: sp.payment.is_paid, receipt_image: sp.payment.receipt_image } : null,
      })));
    } catch {
      setDetailData([]);
    }
  };

  const closeModal = () => { setSelectedReq(null); setDetailData([]); };

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-500 text-sm">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  const filteredDetail = detailFilterSection
    ? detailData.filter(d => d.student.section === detailFilterSection)
    : detailData;
  const uniqueDetailSections = Array.from(new Set(detailData.map(d => d.student.section)));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">งบประมาณคงเหลือ</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">฿{data.totalBudget.toLocaleString()}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">รายการเก็บเงินที่ค้าง</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">{data.unpaidCount} รายการ</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">รออนุมัติเบิกเงิน</p>
          <p className="text-2xl font-bold mt-1 text-amber-600">฿{data.pendingExpenseTotal.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-2">{data.pendingExpenseCount} รายการรอ Admin</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">นักศึกษาทั้งหมด</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">{data.studentCount.toLocaleString()} คน</p>
          <p className="text-xs text-slate-400 mt-2">แบ่งตาม {data.sectionCount} Sections</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                {data.paymentRequests.length === 0 ? (
                  <tr><td colSpan={3} className="px-6 py-4 text-center text-slate-500">ไม่มีรายการเรียกเก็บเงิน</td></tr>
                ) : data.paymentRequests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => openModal(req)}>
                    <td className="px-6 py-4 font-medium text-slate-800">{req.title}</td>
                    <td className="px-6 py-4 text-slate-600">{req.target_sections.join(', ')}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">฿{req.amount_per_person.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

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
                {data.recentExpenses.length === 0 ? (
                  <tr><td colSpan={3} className="px-6 py-4 text-center text-slate-500">ไม่มีรายการเบิกจ่ายล่าสุด</td></tr>
                ) : data.recentExpenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-800">{exp.title}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">฿{exp.total_amount.toLocaleString()}</td>
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
              {data.budgetAdditions.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-4 text-center text-slate-500">ไม่พบประวัติการเติมงบประมาณ</td></tr>
              ) : data.budgetAdditions.map(addition => (
                <tr key={addition.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-800">{addition.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-green-600 font-bold">+฿{addition.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                    {format(new Date(addition.created_at), 'dd MMM yyyy')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedReq && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-slate-900 bg-opacity-75" onClick={closeModal} />
            <div className="relative inline-block w-full max-w-2xl px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-xl shadow-xl sm:my-8 sm:align-middle sm:p-6 border border-slate-200">
              <h3 className="text-lg font-bold leading-6 text-slate-900 mb-4">รายละเอียด {selectedReq.title}</h3>
              <div className="text-sm text-slate-500 space-y-2">
                <p><strong>เป้าหมายกลุ่มเรียน:</strong> {selectedReq.target_sections.join(', ')}</p>
                <p><strong>จำนวนเงิน:</strong> ฿{selectedReq.amount_per_person.toLocaleString()} / คน</p>
              </div>

              <div className="mt-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3">
                  <h4 className="text-sm font-bold text-slate-700">สถานะการชำระเงินของนักศึกษา</h4>
                  {uniqueDetailSections.length > 1 && (
                    <select value={detailFilterSection} onChange={e => setDetailFilterSection(e.target.value)}
                      className="mt-2 sm:mt-0 px-3 py-1.5 border border-slate-200 rounded text-sm bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="">ทุกกลุ่มเรียน</option>
                      {uniqueDetailSections.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto space-y-4">
                  {(detailFilterSection ? [detailFilterSection] : uniqueDetailSections).map(section => {
                    const sectionData = filteredDetail.filter(d => d.student.section === section);
                    if (sectionData.length === 0) return null;
                    return (
                      <div key={section} className="border border-slate-200 rounded-lg overflow-hidden">
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
