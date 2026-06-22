import { useState, useEffect, useMemo } from 'react';
import { api, DashboardData, PaymentRequest, ExpenseRequest, ExpenseItem, formatMoney, getCollectionProgress } from '../lib/api';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import {
  CheckCircle, XCircle, Banknote, ClipboardList, Clock, Users,
  TrendingUp, Receipt, PlusCircle, Paperclip, Printer, FileText,
  ChevronLeft, ChevronRight, ChevronDown, ArrowDownUp, CalendarDays, ArrowUpRight,
} from 'lucide-react';
import { printReport, ReceiptViewer } from './ExpenseRequests';

const STATUS_CLASS: Record<string, string> = {
  pending:  'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};
const STATUS_LABEL: Record<string, string> = {
  pending:  'รออนุมัติ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ปฏิเสธแล้ว',
};

// ─── Sorting / pagination helpers ────────────────────────────────────────────
type SortKey = 'latest' | 'oldest' | 'most' | 'least';
const PAGE_SIZE = 5;

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'latest', label: 'ล่าสุด' },
  { value: 'oldest', label: 'เก่าสุด' },
  { value: 'most',   label: 'มากสุด' },
  { value: 'least',  label: 'น้อยสุด' },
];

function sortItems<T extends { created_at: string }>(items: T[], key: SortKey, amountOf: (t: T) => number): T[] {
  const arr = [...items];
  switch (key) {
    case 'latest': arr.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)); break;
    case 'oldest': arr.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at)); break;
    case 'most':   arr.sort((a, b) => amountOf(b) - amountOf(a)); break;
    case 'least':  arr.sort((a, b) => amountOf(a) - amountOf(b)); break;
  }
  return arr;
}

function SortControl({ value, onChange, accent }: { value: SortKey; onChange: (v: SortKey) => void; accent: string }) {
  return (
    <div className="relative shrink-0">
      <ArrowDownUp className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      <select
        value={value}
        onChange={e => onChange(e.target.value as SortKey)}
        className={`appearance-none pl-8 pr-7 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer outline-none focus:ring-2 ${accent} hover:border-slate-300 transition-colors`}
      >
        {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}

function Pager({ page, totalPages, total, onPage }: { page: number; totalPages: number; total: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const from = page * PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);
  return (
    <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 border-t border-slate-100 bg-slate-50/60">
      <span className="text-[11px] text-slate-400 font-medium hidden xs:inline sm:inline">{from}–{to} จาก {total}</span>
      <div className="flex items-center gap-1.5 ml-auto">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 0}
          className="inline-flex items-center gap-1 pl-2 pr-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> ก่อนหน้า
        </button>
        <span className="text-xs font-bold text-slate-500 px-1 tabular-nums">{page + 1}/{totalPages}</span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages - 1}
          className="inline-flex items-center gap-1 pl-2.5 pr-2 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ถัดไป <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function Dashboard() {
  const emptyData: DashboardData = {
    totalBudget: 0, unpaidCount: 0,
    pendingExpenseTotal: 0, pendingExpenseCount: 0,
    studentCount: 0, sectionCount: 0,
    recentExpenses: [], paymentRequests: [], budgetAdditions: [],
  };

  const [data, setData]               = useState<DashboardData>(emptyData);
  const [selectedReq, setSelectedReq]         = useState<PaymentRequest | null>(null);
  const [selectedExpense, setSelectedExpense]           = useState<ExpenseRequest | null>(null);
  const [selectedExpenseItems, setSelectedExpenseItems] = useState<ExpenseItem[]>([]);
  const [expenseLoading, setExpenseLoading]             = useState(false);
  const [detailFilterSection, setDetailFilterSection] = useState('');
  const [detailSearch, setDetailSearch] = useState('');
  const [detailStatusFilter, setDetailStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [detailData, setDetailData]   = useState<{ student: { id: number; student_id: string; first_name: string; last_name: string; section: string }; payment: { is_paid: boolean } | null }[]>([]);

  // Sort + pagination state for the two lists
  const [paymentSort, setPaymentSort] = useState<SortKey>('latest');
  const [paymentPage, setPaymentPage] = useState(0);
  const [expenseSort, setExpenseSort] = useState<SortKey>('latest');
  const [expensePage, setExpensePage] = useState(0);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setData(await api.dashboard.getData());
    } catch {
      // คงค่า emptyData ไว้
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
    setSelectedExpenseItems([]);
    setExpenseLoading(true);
    try {
      const details = await api.expenseRequests.getDetails(exp.id);
      setSelectedExpense(details);
      setSelectedExpenseItems(details.items);
    } catch {
      setSelectedExpenseItems([]);
    } finally {
      setExpenseLoading(false);
    }
  };

  const closeExpenseModal = () => {
    setSelectedExpense(null);
    setSelectedExpenseItems([]);
    setExpenseLoading(false);
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

  // ── Derived sorted + paged lists ──────────────────────────────────────────
  const sortedPayments = useMemo(
    () => sortItems(data.paymentRequests, paymentSort, r => r.amount_per_person),
    [data.paymentRequests, paymentSort]
  );
  const paymentTotalPages = Math.max(1, Math.ceil(sortedPayments.length / PAGE_SIZE));
  const paymentPageClamped = Math.min(paymentPage, paymentTotalPages - 1);
  const pagedPayments = sortedPayments.slice(paymentPageClamped * PAGE_SIZE, paymentPageClamped * PAGE_SIZE + PAGE_SIZE);

  const sortedExpenses = useMemo(
    () => sortItems(data.recentExpenses, expenseSort, e => e.total_amount),
    [data.recentExpenses, expenseSort]
  );
  const expenseTotalPages = Math.max(1, Math.ceil(sortedExpenses.length / PAGE_SIZE));
  const expensePageClamped = Math.min(expensePage, expenseTotalPages - 1);
  const pagedExpenses = sortedExpenses.slice(expensePageClamped * PAGE_SIZE, expensePageClamped * PAGE_SIZE + PAGE_SIZE);

  // ── Stat cards config ─────────────────────────────────────────────────────
  const stats = [
    {
      label: 'งบประมาณคงเหลือ',
      value: `฿${formatMoney(data.totalBudget)}`,
      sub: 'งบประมาณปัจจุบัน', subIcon: TrendingUp,
      icon: Banknote, from: 'from-emerald-400', to: 'to-emerald-600',
      glow: 'shadow-emerald-500/30', bar: 'from-emerald-400 to-emerald-500', blob: 'bg-emerald-50',
    },
    {
      label: 'รายการเก็บเงินค้าง',
      value: data.unpaidCount.toLocaleString(),
      sub: 'รายการที่ยังไม่ได้ชำระ', subIcon: Clock,
      icon: ClipboardList, from: 'from-rose-400', to: 'to-rose-600',
      glow: 'shadow-rose-500/30', bar: 'from-rose-400 to-rose-500', blob: 'bg-rose-50',
    },
    {
      label: 'รออนุมัติเบิกเงิน',
      value: `฿${formatMoney(data.pendingExpenseTotal)}`,
      sub: `${data.pendingExpenseCount} รายการรออนุมัติ`, subIcon: Clock,
      icon: Receipt, from: 'from-amber-400', to: 'to-orange-500',
      glow: 'shadow-amber-500/30', bar: 'from-amber-400 to-orange-500', blob: 'bg-amber-50',
    },
    {
      label: 'นักศึกษาทั้งหมด',
      value: `${data.studentCount.toLocaleString()} คน`,
      sub: `แบ่งเป็น ${data.sectionCount} กลุ่มเรียน`, subIcon: PlusCircle,
      icon: Users, from: 'from-blue-400', to: 'to-indigo-600',
      glow: 'shadow-blue-500/30', bar: 'from-blue-400 to-indigo-500', blob: 'bg-blue-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">แดชบอร์ด</h1>
          <p className="text-sm text-slate-500 mt-1">ภาพรวมการบริหารงบประมาณคณะ</p>
        </div>
        <div className="inline-flex items-center gap-2 self-start sm:self-auto bg-white border border-slate-200 rounded-xl px-3.5 py-2 shadow-sm">
          <CalendarDays className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold text-slate-600">{format(new Date(), 'EEEE d MMMM yyyy', { locale: th })}</span>
        </div>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        {stats.map((s, i) => (
          <div
            key={i}
            className="group relative bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
          >
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${s.bar}`} />
            <div className={`absolute -right-7 -bottom-7 w-28 h-28 ${s.blob} rounded-full group-hover:scale-125 transition-transform duration-500`} />
            <div className="relative p-5">
              <div className="flex items-start justify-between">
                <div className={`bg-gradient-to-br ${s.from} ${s.to} p-2.5 rounded-xl shadow-lg ${s.glow}`}>
                  <s.icon className="w-5 h-5 text-white" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition-colors" />
              </div>
              <p className="mt-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
              <p className="mt-1 text-2xl sm:text-[1.7rem] leading-tight font-extrabold text-slate-800">{s.value}</p>
              <p className="mt-1.5 text-xs text-slate-400 flex items-center gap-1">
                <s.subIcon className="w-3 h-3" /> {s.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* ── รายการเรียกเก็บเงินที่เปิดอยู่ ──────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-2 bg-gradient-to-r from-rose-50/70 to-transparent">
            <div className="flex items-center gap-3 min-w-0">
              <div className="bg-gradient-to-br from-rose-400 to-rose-600 p-2 rounded-xl shadow-lg shadow-rose-500/30 shrink-0">
                <ClipboardList className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-slate-700 text-sm sm:text-base truncate">รายการเรียกเก็บเงินที่เปิดอยู่</h3>
            </div>
            <SortControl value={paymentSort} onChange={v => { setPaymentSort(v); setPaymentPage(0); }} accent="focus:ring-rose-400/40" />
          </div>

          <div className="flex-1 divide-y divide-slate-100">
            {sortedPayments.length === 0 ? (
              <div className="px-6 py-12 text-center text-slate-400 text-sm">ไม่มีรายการเรียกเก็บเงิน</div>
            ) : pagedPayments.map(req => {
              const prog = getCollectionProgress(req);
              const pct = prog.total > 0 ? Math.min(100, Math.round((prog.paid / prog.total) * 100)) : 0;
              return (
                <button
                  key={req.id}
                  onClick={() => openModal(req)}
                  className="w-full text-left px-4 sm:px-5 py-4 hover:bg-rose-50/40 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 text-sm truncate group-hover:text-rose-700 transition-colors">{req.title}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {req.target_sections.map(sec => (
                          <span key={sec} className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">{sec}</span>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-bold text-slate-900 text-sm">฿{formatMoney(req.amount_per_person)}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">ต่อคน</p>
                    </div>
                  </div>

                  {/* progress bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      {prog.complete ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-600">
                          <CheckCircle className="w-3.5 h-3.5" /> ปิดยอดแล้ว · ฿{formatMoney(prog.collectedAmount)}
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-500">เก็บแล้ว {prog.paid}/{prog.total} คน</span>
                      )}
                      <span className="text-[11px] font-bold text-slate-600 tabular-nums">{pct}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${prog.complete ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-rose-400 to-rose-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <Pager page={paymentPageClamped} totalPages={paymentTotalPages} total={sortedPayments.length} onPage={setPaymentPage} />
        </div>

        {/* ── รายการเบิกจ่ายล่าสุด ───────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-2 bg-gradient-to-r from-amber-50/70 to-transparent">
            <div className="flex items-center gap-3 min-w-0">
              <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-2 rounded-xl shadow-lg shadow-amber-500/30 shrink-0">
                <Receipt className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-slate-700 text-sm sm:text-base truncate">รายการเบิกจ่ายล่าสุด</h3>
            </div>
            <SortControl value={expenseSort} onChange={v => { setExpenseSort(v); setExpensePage(0); }} accent="focus:ring-amber-400/40" />
          </div>

          <div className="flex-1 divide-y divide-slate-100">
            {sortedExpenses.length === 0 ? (
              <div className="px-6 py-12 text-center text-slate-400 text-sm">ไม่มีรายการเบิกจ่าย</div>
            ) : pagedExpenses.map(exp => (
              <button
                key={exp.id}
                onClick={() => openExpenseModal(exp)}
                className="w-full text-left px-4 sm:px-5 py-4 hover:bg-amber-50/40 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_CLASS[exp.status]}`}>
                        {STATUS_LABEL[exp.status]}
                      </span>
                      {(exp.receipt_count ?? exp.receipt_images?.length ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-500 font-semibold">
                          <Paperclip className="w-3 h-3" /> {exp.receipt_count ?? exp.receipt_images!.length}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-slate-800 text-sm truncate group-hover:text-amber-700 transition-colors">
                      {exp.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {exp.requester_name || exp.creator_name || '—'}
                      {exp.creator_dept ? ` · ${exp.creator_dept}` : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold text-slate-900 text-sm">฿{formatMoney(exp.total_amount)}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {format(new Date(exp.created_at), 'd MMM yy', { locale: th })}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <Pager page={expensePageClamped} totalPages={expenseTotalPages} total={sortedExpenses.length} onPage={setExpensePage} />
        </div>
      </div>

      {/* ── รายการเติมงบประมาณล่าสุด ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center gap-3 bg-gradient-to-r from-emerald-50/70 to-transparent">
          <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-2 rounded-xl shadow-lg shadow-emerald-500/30">
            <Banknote className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-bold text-slate-700 text-sm sm:text-base">รายการเติมงบประมาณล่าสุด</h3>
        </div>

        {/* Desktop / tablet: table */}
        <div className="hidden sm:block overflow-x-auto">
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
                <tr><td colSpan={3} className="px-6 py-6 text-center text-slate-400">ไม่พบประวัติการเติมงบประมาณ</td></tr>
              ) : data.budgetAdditions.map(addition => (
                <tr key={addition.id} className="hover:bg-emerald-50/40 transition-colors">
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

        {/* Mobile: card list */}
        <div className="sm:hidden divide-y divide-slate-100">
          {data.budgetAdditions.length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-400 text-sm">ไม่พบประวัติการเติมงบประมาณ</div>
          ) : data.budgetAdditions.map(addition => (
            <div key={addition.id} className="px-4 py-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-slate-800 text-sm truncate">{addition.description}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{format(new Date(addition.created_at), 'dd MMM yyyy')}</p>
              </div>
              <p className="shrink-0 text-green-600 font-bold text-sm">+฿{formatMoney(addition.amount)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Expense Detail Modal ──────────────────────────────────────────────────── */}
      {selectedExpense && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-slate-900/10 backdrop-blur-sm" onClick={closeExpenseModal} />
            <div className="relative inline-block w-full max-w-2xl p-6 overflow-y-auto text-left align-middle transition-all transform bg-white shadow-xl rounded-xl border border-slate-200">
              {/* Header */}
              <div className="flex justify-between items-start mb-1">
                <div className="flex-1 min-w-0 pr-4">
                  <h3 className="text-xl font-bold text-slate-900 truncate">{selectedExpense.title}</h3>
                  {selectedExpense.description && (
                    <p className="text-sm text-slate-500 mt-1">{selectedExpense.description}</p>
                  )}
                </div>
                <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${STATUS_CLASS[selectedExpense.status]}`}>
                  {STATUS_LABEL[selectedExpense.status]}
                </span>
              </div>

              {/* Meta */}
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-400 mb-4">
                <span>สร้าง {format(new Date(selectedExpense.created_at), 'd MMM yyyy HH:mm', { locale: th })}</span>
                {selectedExpense.requester_name || selectedExpense.creator_name ? (
                  <span>
                    ผู้ขอเบิก: <span className="text-slate-600 font-semibold">
                      {selectedExpense.requester_name || selectedExpense.creator_name}
                      {selectedExpense.creator_dept ? ` (${selectedExpense.creator_dept})` : ''}
                    </span>
                  </span>
                ) : null}
                {selectedExpense.status === 'approved' && selectedExpense.approved_at && (
                  <span>อนุมัติ {format(new Date(selectedExpense.approved_at), 'd MMM yyyy', { locale: th })}</span>
                )}
              </div>

              {/* Items table */}
              <div className="border border-slate-200 rounded-lg overflow-x-auto mb-4">
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
                    {expenseLoading ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-5 text-center">
                          <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
                            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                            </svg>
                            กำลังโหลดรายการ...
                          </div>
                        </td>
                      </tr>
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
                      <td colSpan={3} className="px-4 py-3 text-right text-slate-700">ยอดรวม:</td>
                      <td className="px-4 py-3 text-right text-blue-600">฿{formatMoney(selectedExpense.total_amount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Evidence section — 2 types */}
              {!expenseLoading && ((selectedExpense.receipt_images?.length ?? 0) > 0 || selectedExpense.status === 'approved') && (
                <div className="mb-4 space-y-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> หลักฐานประกอบ
                  </p>

                  {/* Type 1 — receipt images */}
                  {(selectedExpense.receipt_images?.length ?? 0) > 0 && (
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                      <ReceiptViewer images={selectedExpense.receipt_images} />
                    </div>
                  )}

                  {/* Type 2 — approved PDF report */}
                  {selectedExpense.status === 'approved' && (
                    <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                      <div>
                        <p className="text-sm font-semibold text-indigo-800">รายงานการเบิกจ่าย (PDF)</p>
                        <p className="text-xs text-indigo-500 mt-0.5">เอกสารทางการ พร้อมลายเซ็นผู้ขอเบิกและผู้อนุมัติ</p>
                      </div>
                      <button
                        onClick={() => printReport(selectedExpense, selectedExpenseItems)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow shadow-indigo-200 shrink-0">
                        <Printer className="w-4 h-4" /> พิมพ์ / PDF
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Close */}
              <div className="mt-4">
                <button type="button" onClick={closeExpenseModal}
                  className="w-full px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200">
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Payment Detail Modal ──────────────────────────────────────────────────── */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-slate-900/10 backdrop-blur-sm" onClick={closeModal} />
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
