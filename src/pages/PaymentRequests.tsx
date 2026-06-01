import React, { useState, useEffect } from 'react';
import { api, PaymentRequest, PaymentRequestWithDetails, StudentPayment, Section, formatMoney } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Check, Download, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

export function PaymentRequests() {
  const { user }                            = useAuth();
  const [requests, setRequests]             = useState<PaymentRequest[]>([]);
  const [sections, setSections]             = useState<Section[]>([]);
  const [isModalOpen, setIsModalOpen]       = useState(false);
  const [loading, setLoading]               = useState(false);

  const [title, setTitle]                   = useState('');
  const [targetSections, setTargetSections] = useState<string[]>(['All']);
  const [amount, setAmount]                 = useState(0);

  const [selectedReq, setSelectedReq]             = useState<PaymentRequestWithDetails | null>(null);
  const [studentsPayments, setStudentsPayments]     = useState<StudentPayment[]>([]);
  const [detailFilterSection, setDetailFilterSection] = useState('');
  const [detailLoading, setDetailLoading]           = useState(false);
  const [previewImage, setPreviewImage]             = useState<string | null>(null);
  const [deletingRequestId, setDeletingRequestId]   = useState<number | null>(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [reqs, secs] = await Promise.all([api.paymentRequests.list(), api.sections.list()]);
      setRequests(reqs);
      setSections(secs);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'โหลดข้อมูลล้มเหลว');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await api.paymentRequests.create({ title, target_sections: targetSections, amount_per_person: amount });
      await loadAll();
      setIsModalOpen(false);
      setTitle('');
      setAmount(0);
      setTargetSections(['All']);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'สร้างรายการล้มเหลว');
    } finally {
      setLoading(false);
    }
  };

  const openDetails = async (req: PaymentRequest) => {
    setDetailLoading(true);
    setDetailFilterSection('');
    setPreviewImage(null);
    try {
      const details = await api.paymentRequests.getDetails(req.id);
      setSelectedReq(details);
      setStudentsPayments(details.student_payments);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'โหลดรายละเอียดล้มเหลว');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetails = () => {
    setSelectedReq(null);
    setPreviewImage(null);
  };

  const handleDeleteRequest = async (requestId: number) => {
    if (!confirm('ยืนยันการลบรายการเรียกเก็บเงินนี้?')) return;
    setDeletingRequestId(requestId);
    try {
      await api.paymentRequests.delete(requestId);
      await loadAll();
      if (selectedReq?.id === requestId) {
        closeDetails();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ลบรายการล้มเหลว');
    } finally {
      setDeletingRequestId(null);
    }
  };

  const togglePayment = async (studentId: number, paymentId: number | undefined, currentPaid: boolean) => {
    if (!selectedReq) return;
    try {
      const updated = await api.payments.update(paymentId, {
        request_id: selectedReq.id,
        student_id: studentId,
        is_paid: !currentPaid,
      });
      setStudentsPayments(prev =>
        prev.map(sp =>
          sp.student.id === studentId
            ? { ...sp, payment: updated }
            : sp
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'อัปเดตสถานะล้มเหลว');
    }
  };

  const handleReceiptUpload = async (
    studentId: number,
    paymentId: number | undefined,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!selectedReq || !e.target.files || e.target.files.length === 0) return;
    const file   = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (event) => {
      if (!event.target || typeof event.target.result !== 'string') return;
      try {
        const updated = await api.payments.update(paymentId, {
          request_id: selectedReq.id,
          student_id: studentId,
          receipt_image: event.target.result,
          is_paid: true,
        });
        setStudentsPayments(prev =>
          prev.map(sp =>
            sp.student.id === studentId
              ? { ...sp, payment: updated }
              : sp
          )
        );
      } catch (err) {
        alert(err instanceof Error ? err.message : 'อัปโหลดหลักฐานล้มเหลว');
      }
    };
    reader.readAsDataURL(file);
  };

  const exportDetails = () => {
    if (!selectedReq) return;
    const data = studentsPayments.map(sp => ({
      StudentID: sp.student.student_id,
      Name:      `${sp.student.first_name} ${sp.student.last_name}`,
      Section:   sp.student.section,
      Status:    sp.payment?.is_paid ? 'Paid' : 'Unpaid',
      PaidAt:    sp.payment?.paid_at ? format(new Date(sp.payment.paid_at), 'yyyy-MM-dd HH:mm') : '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PaymentStatus');
    XLSX.writeFile(wb, `${selectedReq.title}_status.xlsx`);
  };

  const filteredPayments = detailFilterSection
    ? studentsPayments.filter(sp => sp.student.section === detailFilterSection)
    : studentsPayments;
  const uniqueSections = Array.from(new Set(studentsPayments.map(sp => sp.student.section)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">รายการเรียกเก็บเงิน</h1>
        <button onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm shadow-blue-200 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> สร้างรายการใหม่
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
              <tr>
                <th className="px-6 py-3 border-b border-slate-100">ชื่อรายการ</th>
                <th className="px-6 py-3 border-b border-slate-100">กลุ่มเป้าหมาย</th>
                <th className="px-6 py-3 border-b border-slate-100">ยอด/คน</th>
                <th className="px-6 py-3 border-b border-slate-100">วันที่สร้าง</th>
                <th className="px-6 py-3 border-b border-slate-100 text-right">ลบ</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {requests.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-slate-500">ไม่พบรายการเรียกเก็บเงิน</td></tr>
              ) : requests.map(req => (
                <tr key={req.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => openDetails(req)}>
                  <td className="px-6 py-4 font-medium text-slate-900">{req.title}</td>
                  <td className="px-6 py-4 text-slate-600">{req.target_sections.join(', ')}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">฿{formatMoney(req.amount_per_person)}</td>
                  <td className="px-6 py-4 text-slate-500">{format(new Date(req.created_at), 'dd MMM yyyy')}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeleteRequest(req.id);
                      }}
                      disabled={deletingRequestId === req.id}
                      className="inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-60"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      {deletingRequestId === req.id ? 'กำลังลบ...' : 'ลบ'}
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
            <div className="relative inline-block w-full max-w-md p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-xl border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">สร้างรายการเรียกเก็บเงิน</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700">ชื่อรายการ</label>
                  <input type="text" required value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="เช่น ค่าเสื้อคณะ"
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 text-slate-800" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700">กลุ่มเป้าหมาย (รายกลุ่มเรียน)</label>
                  <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded p-2 bg-slate-50">
                    <label className="flex items-center space-x-2">
                      <input type="checkbox"
                        checked={targetSections.includes('All')}
                        onChange={(e) => {
                          if (e.target.checked) setTargetSections(['All']);
                          else setTargetSections([]);
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">ทุกกลุ่มเรียน</span>
                    </label>
                    {sections.map(s => (
                      <label key={s.id} className="flex items-center space-x-2">
                        <input type="checkbox"
                          checked={!targetSections.includes('All') && targetSections.includes(s.name)}
                          onChange={(e) => {
                            let newTargets = targetSections.filter(t => t !== 'All');
                            if (e.target.checked) newTargets.push(s.name);
                            else newTargets = newTargets.filter(t => t !== s.name);
                            setTargetSections(newTargets.length === 0 ? ['All'] : newTargets);
                          }}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700">{s.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700">จำนวนเงินต่อคน (฿)</label>
                  <input type="number" required min="0.01" step="0.01" value={amount}
                    onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 text-slate-800" />
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-md text-sm hover:bg-slate-200">ยกเลิก</button>
                  <button type="submit" disabled={loading} className="px-4 py-2 border border-transparent rounded-md shadow-sm shadow-blue-200 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60">
                    {loading ? 'กำลังสร้าง...' : 'สร้างรายการ'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-slate-900 bg-opacity-75" onClick={closeDetails} />
            <div className="relative inline-block w-full max-w-3xl p-6 overflow-y-auto text-left align-middle transition-all transform bg-white shadow-xl rounded-xl border border-slate-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">รายละเอียด {selectedReq.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">กลุ่มเรียน: {selectedReq.target_sections.join(', ')} | จำนวนเงิน: ฿{formatMoney(selectedReq.amount_per_person)}</p>
                </div>
                <div className="flex items-center gap-3">
                  {uniqueSections.length > 1 && (
                    <select value={detailFilterSection} onChange={e => setDetailFilterSection(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-md text-sm bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="">ทุกกลุ่มเรียน</option>
                      {uniqueSections.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                  <button onClick={exportDetails}
                    className="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-600 rounded-md text-sm font-bold hover:bg-slate-200">
                    <Download className="w-4 h-4 mr-2" /> ส่งออก Excel
                  </button>
                </div>
              </div>

              {detailLoading ? (
                <div className="py-8 text-center text-slate-500">กำลังโหลด...</div>
              ) : (
                <div className="mt-4 max-h-96 overflow-y-auto overflow-x-auto space-y-6">
                  {(detailFilterSection ? [detailFilterSection] : uniqueSections).map(section => {
                    const sectionPayments = filteredPayments.filter(sp => sp.student.section === section);
                    if (sectionPayments.length === 0) return null;
                    return (
                      <div key={section} className="border border-slate-200 rounded-lg overflow-x-auto bg-white">
                        <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 text-sm font-bold text-slate-700">
                          กลุ่มเรียน: {section}
                        </div>
                        <table className="min-w-full divide-y divide-slate-100">
                          <thead className="bg-slate-50 sticky top-0">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">รหัสนักศึกษา</th>
                              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">ชื่อ-นามสกุล</th>
                              <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">สถานะ</th>
                              <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">ดำเนินการ</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-100 text-sm">
                            {sectionPayments.map(({ student, payment }) => (
                              <tr key={student.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900">{student.student_id}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-slate-700">{student.first_name} {student.last_name}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                  {payment?.is_paid ? (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-100 text-green-700">จ่ายแล้ว</span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-700">ยังไม่จ่าย</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-right font-medium">
                                  <div className="flex items-center justify-end space-x-2">
                                    <button
                                      onClick={() => togglePayment(student.id, payment?.id, payment?.is_paid ?? false)}
                                      className={`inline-flex items-center p-1.5 rounded-full transition-colors ${payment?.is_paid ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                      title={payment?.is_paid ? 'เปลี่ยนเป็นยังไม่ได้จ่าย' : 'เปลี่ยนเป็นจ่ายแล้ว'}
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <label className="cursor-pointer inline-flex items-center px-3 py-1.5 border border-slate-200 rounded text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100">
                                      อัปโหลดหลักฐาน
                                      <input type="file" accept="image/*" className="hidden"
                                        onChange={(e) => handleReceiptUpload(student.id, payment?.id, e)} />
                                    </label>
                                    {payment?.receipt_image && (
                                      <button
                                        type="button"
                                        onClick={() => setPreviewImage(payment.receipt_image ?? null)}
                                        className="text-blue-600 text-xs font-bold hover:underline"
                                      >
                                        ดูรูป
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-5 sm:mt-6">
                <button type="button" onClick={closeDetails}
                  className="w-full inline-flex justify-center rounded-md border border-slate-200 px-4 py-2 bg-slate-50 text-sm font-bold text-slate-700 hover:bg-slate-100">
                  ปิดหน้านี้
                </button>
              </div>
            </div>
          </div>

          {previewImage && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6">
              <div className="absolute inset-0 bg-slate-900/80" onClick={() => setPreviewImage(null)} />
              <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-lg shadow-xl p-3">
                <div className="flex justify-end mb-2">
                  <button
                    type="button"
                    onClick={() => setPreviewImage(null)}
                    className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded hover:bg-slate-200"
                  >
                    ปิดรูป
                  </button>
                </div>
                <div className="max-h-[75vh] overflow-auto flex items-center justify-center">
                  <img
                    src={previewImage}
                    alt="หลักฐานการชำระเงิน"
                    className="max-h-[70vh] w-auto object-contain"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
