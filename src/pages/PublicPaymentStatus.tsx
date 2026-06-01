import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { api, PublicPaymentStatusDetails, formatMoney } from '../lib/api';
import { CheckCircle2, XCircle, RefreshCw, Receipt, Users, Wallet } from 'lucide-react';

const REFRESH_INTERVAL_MS = 15000;

export function PublicPaymentStatus() {
  const { id } = useParams<{ id: string }>();
  const requestId = Number(id);

  const [data, setData]               = useState<PublicPaymentStatusDetails | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [refreshing, setRefreshing]   = useState(false);
  const [filterSection, setFilterSection] = useState('');
  const [statusFilter, setStatusFilter]   = useState<'all' | 'paid' | 'unpaid'>('all');
  const [previewImage, setPreviewImage]   = useState<string | null>(null);
  const [lastUpdated, setLastUpdated]     = useState<Date | null>(null);

  const load = async (silent = false) => {
    if (!requestId) {
      setError('ลิงก์ไม่ถูกต้อง');
      setLoading(false);
      return;
    }
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.dashboard.getPaymentStatus(requestId);
      setData(res);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดข้อมูลล้มเหลว');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
    const t = setInterval(() => { void load(true); }, REFRESH_INTERVAL_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const uniqueSections = useMemo(() => {
    if (!data) return [] as string[];
    return Array.from(new Set(data.student_payments.map(sp => sp.student.section))).filter(Boolean);
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.student_payments.filter(sp => {
      if (filterSection && sp.student.section !== filterSection) return false;
      if (statusFilter === 'paid'   && !(sp.payment?.is_paid))   return false;
      if (statusFilter === 'unpaid' &&  (sp.payment?.is_paid))   return false;
      return true;
    });
  }, [data, filterSection, statusFilter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <svg className="animate-spin h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span className="text-sm font-medium">กำลังโหลด...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-slate-900 mb-1">ไม่พบรายการ</h1>
          <p className="text-sm text-slate-500">{error ?? 'ลิงก์นี้ไม่ถูกต้องหรือถูกลบไปแล้ว'}</p>
        </div>
      </div>
    );
  }

  const { totals } = data;
  const progress = totals.total_count > 0 ? Math.round((totals.paid_count / totals.total_count) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top brand bar */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="Logo" className="w-7 h-7" />
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-blue-600">
              CMRU Finance<span className="text-slate-800">Pro</span>
            </h1>
          </div>
          <button
            onClick={() => void load(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md disabled:opacity-60"
            title="รีเฟรชสถานะ"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">รีเฟรช</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Title block */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">รายการเรียกเก็บเงิน</p>
              <h2 className="text-2xl font-bold text-slate-900">{data.title}</h2>
              <p className="text-sm text-slate-500 mt-1">
                กลุ่มเรียน: {data.target_sections.join(', ')} · ยอดต่อคน ฿{formatMoney(data.amount_per_person)}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                สร้างเมื่อ {format(new Date(data.created_at), 'dd MMM yyyy')}
                {lastUpdated && ` · อัปเดตล่าสุด ${format(lastUpdated, 'HH:mm:ss')}`}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-5">
            <div className="flex justify-between items-end text-xs font-bold text-slate-500 mb-1.5">
              <span>ความคืบหน้าการชำระ</span>
              <span className="text-slate-800">{progress}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            icon={<Wallet className="w-5 h-5" />}
            label="ยอดที่จ่ายแล้ว"
            value={`฿${formatMoney(totals.paid_amount)}`}
            sub={`จากเป้าหมาย ฿${formatMoney(totals.expected_amount)}`}
            tone="blue"
          />
          <StatCard
            icon={<CheckCircle2 className="w-5 h-5" />}
            label="จ่ายแล้ว"
            value={`${totals.paid_count} คน`}
            sub={`จาก ${totals.total_count} คน`}
            tone="green"
          />
          <StatCard
            icon={<XCircle className="w-5 h-5" />}
            label="ยังไม่จ่าย"
            value={`${totals.unpaid_count} คน`}
            sub="รอชำระ"
            tone="red"
          />
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label="รายชื่อทั้งหมด"
            value={`${totals.total_count} คน`}
            sub={`${uniqueSections.length} กลุ่มเรียน`}
            tone="slate"
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-wrap items-center gap-3">
          {uniqueSections.length > 1 && (
            <select
              value={filterSection}
              onChange={e => setFilterSection(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-md text-sm bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">ทุกกลุ่มเรียน</option>
              {uniqueSections.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <div className="inline-flex rounded-md overflow-hidden border border-slate-200">
            {(['all', 'paid', 'unpaid'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 text-xs font-bold ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {s === 'all' ? 'ทั้งหมด' : s === 'paid' ? 'จ่ายแล้ว' : 'ยังไม่จ่าย'}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-500 ml-auto">
            แสดง {filtered.length} จาก {totals.total_count} คน
          </span>
        </div>

        {/* Student list */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3 border-b border-slate-100">รหัสนักศึกษา</th>
                  <th className="px-4 py-3 border-b border-slate-100">ชื่อ-นามสกุล</th>
                  <th className="px-4 py-3 border-b border-slate-100">กลุ่มเรียน</th>
                  <th className="px-4 py-3 border-b border-slate-100 text-center">สถานะ</th>
                  <th className="px-4 py-3 border-b border-slate-100 text-center">สลิป</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      ไม่พบรายชื่อตามเงื่อนไขที่เลือก
                    </td>
                  </tr>
                ) : filtered.map(({ student, payment }) => (
                  <tr key={student.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">{student.student_id}</td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{student.first_name} {student.last_name}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{student.section}</td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {payment?.is_paid ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-100 text-green-700">
                          <CheckCircle2 className="w-3 h-3" /> จ่ายแล้ว
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-700">
                          <XCircle className="w-3 h-3" /> ยังไม่จ่าย
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {payment?.receipt_image ? (
                        <button
                          type="button"
                          onClick={() => setPreviewImage(payment.receipt_image!)}
                          className="inline-block rounded-md overflow-hidden border border-slate-200 hover:ring-2 hover:ring-blue-400 transition-shadow"
                          title="คลิกเพื่อดูภาพขนาดเต็ม"
                        >
                          <img
                            src={payment.receipt_image}
                            alt="slip"
                            className="w-12 h-12 object-cover"
                          />
                        </button>
                      ) : (
                        <span className="inline-flex items-center justify-center w-12 h-12 rounded-md border border-dashed border-slate-200 text-slate-300">
                          <Receipt className="w-4 h-4" />
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 pt-2">
          หน้านี้รีเฟรชอัตโนมัติทุก {Math.round(REFRESH_INTERVAL_MS / 1000)} วินาที
        </p>
      </main>

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
  );
}

type Tone = 'blue' | 'green' | 'red' | 'slate';
function StatCard({
  icon, label, value, sub, tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone: Tone;
}) {
  const tones: Record<Tone, string> = {
    blue:  'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red:   'bg-red-50 text-red-600',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tones[tone]}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">{label}</p>
          <p className="text-lg font-bold text-slate-900 leading-tight truncate">{value}</p>
        </div>
      </div>
      {sub && <p className="text-[11px] text-slate-400 mt-2 truncate">{sub}</p>}
    </div>
  );
}
