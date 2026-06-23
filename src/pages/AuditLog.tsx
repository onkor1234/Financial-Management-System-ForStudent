import React, { useEffect, useState } from 'react';
import { api, AuditLogEntry, VisitStats } from '../lib/api';
import { Eye, ScrollText, Trash2, RefreshCw, Users2, CalendarDays } from 'lucide-react';

const METHOD_STYLES: Record<string, string> = {
  POST:   'bg-emerald-100 text-emerald-700',
  PUT:    'bg-amber-100 text-amber-700',
  PATCH:  'bg-sky-100 text-sky-700',
  DELETE: 'bg-rose-100 text-rose-700',
};

function formatDateTime(value: string): string {
  const d = new Date(value.replace(' ', 'T'));
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString('th-TH', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

// Strip the "/api/" prefix and ".php" suffix for a cleaner endpoint label.
function prettyEndpoint(endpoint: string): string {
  return endpoint.replace(/^\/?api\//, '').replace('.php', '');
}

export function AuditLog() {
  const [logs, setLogs]     = useState<AuditLogEntry[]>([]);
  const [visits, setVisits] = useState<VisitStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [logRes, visitRes] = await Promise.all([
        api.audit.list(),
        api.visits.stats(),
      ]);
      setLogs(logRes);
      setVisits(visitRes);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'โหลดข้อมูลล้มเหลว');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleClear = async () => {
    if (!confirm('ยืนยันการล้างบันทึกการใช้งานทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้')) return;
    setClearing(true);
    try {
      await api.audit.clear();
      setLogs([]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ล้างข้อมูลล้มเหลว');
    } finally {
      setClearing(false);
    }
  };

  const maxDaily = visits ? Math.max(1, ...visits.daily.map(d => d.count)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-fuchsia-500" /> บันทึกการใช้งาน
          </h1>
          <p className="text-sm text-slate-500 mt-1">ยอดเข้าชมเว็บไซต์ และประวัติการกระทำของผู้ใช้</p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-bold text-slate-700 bg-white hover:bg-slate-50"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> รีเฟรช
        </button>
      </div>

      {/* ─── Website visits (no clear button) ─────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">ยอดเข้าชมเว็บไซต์</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-sky-100 flex items-center justify-center"><Eye className="w-5 h-5 text-sky-600" /></div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">เข้าชมทั้งหมด</p>
              <p className="text-2xl font-bold text-slate-900">{(visits?.total ?? 0).toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-emerald-100 flex items-center justify-center"><CalendarDays className="w-5 h-5 text-emerald-600" /></div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">เข้าชมวันนี้</p>
              <p className="text-2xl font-bold text-slate-900">{(visits?.today ?? 0).toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-violet-100 flex items-center justify-center"><Users2 className="w-5 h-5 text-violet-600" /></div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">ผู้เข้าชม (IP ไม่ซ้ำ)</p>
              <p className="text-2xl font-bold text-slate-900">{(visits?.unique ?? 0).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Mini bar chart — last 14 days */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">14 วันล่าสุด</p>
          {visits && visits.daily.length > 0 ? (
            <div className="flex items-end gap-2 h-32">
              {visits.daily.map(d => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group">
                  <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">{d.count}</span>
                  <div
                    className="w-full bg-sky-400 rounded-t hover:bg-sky-500 transition-colors"
                    style={{ height: `${Math.max(4, (d.count / maxDaily) * 100)}%` }}
                    title={`${d.day}: ${d.count} ครั้ง`}
                  />
                  <span className="text-[9px] text-slate-400 whitespace-nowrap">{d.day.slice(5)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">ยังไม่มีข้อมูลการเข้าชม</p>
          )}
        </div>
      </section>

      {/* ─── User action log (with clear button) ──────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">ประวัติการกระทำของผู้ใช้</h2>
          <button
            onClick={handleClear}
            disabled={clearing || logs.length === 0}
            className="inline-flex items-center px-3 py-1.5 border border-rose-200 rounded-md text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> {clearing ? 'กำลังล้าง...' : 'ล้างข้อมูล'}
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-xs font-bold text-slate-500 uppercase bg-slate-50">
                <tr>
                  <th className="px-4 py-3 border-b border-slate-100">เวลา</th>
                  <th className="px-4 py-3 border-b border-slate-100">ผู้ใช้</th>
                  <th className="px-4 py-3 border-b border-slate-100">การกระทำ</th>
                  <th className="px-4 py-3 border-b border-slate-100">รายละเอียด</th>
                  <th className="px-4 py-3 border-b border-slate-100">IP</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">กำลังโหลด...</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">ยังไม่มีบันทึกการใช้งาน</td></tr>
                ) : logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 align-top">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500 text-xs">{formatDateTime(log.created_at)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-medium">{log.username ?? `#${log.user_id ?? '-'}`}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold mr-2 ${METHOD_STYLES[log.method] ?? 'bg-slate-100 text-slate-600'}`}>{log.method}</span>
                      <span className="text-slate-600 text-xs font-mono">{prettyEndpoint(log.endpoint)}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs font-mono max-w-md break-words">{log.detail ?? '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-400 text-xs">{log.ip ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
