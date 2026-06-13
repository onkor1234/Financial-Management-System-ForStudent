import React, { useState, useEffect, useCallback } from 'react';
import { api, ExpenseRequest, ExpenseItem, formatMoney } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Plus, Check, X, Eye, Download, Trash2, Pencil,
  Clock, CheckCircle2, XCircle, FileText, Printer, UserPen, Paperclip, Image,
} from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { SignatureCanvas } from '../components/SignatureCanvas';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'all' | 'pending' | 'approved' | 'rejected';
type ItemDraft = { name: string; price: number; quantity: number };

// ─── Print / PDF helper ───────────────────────────────────────────────────────

function formatThaiDate(dateStr: string) {
  return format(new Date(dateStr), 'd MMMM yyyy', { locale: th });
}

function formatThaiDateTime(dateStr: string) {
  return format(new Date(dateStr), 'd MMMM yyyy HH:mm', { locale: th });
}

export function printReport(req: ExpenseRequest, items: ExpenseItem[]) {
  const reqSig  = req.requester_signature;
  const appSig  = req.approver_signature;
  const now     = format(new Date(), 'dd/MM/yyyy HH:mm');

  const rowsHtml = items.map((item, idx) => `
    <tr>
      <td class="c">${idx + 1}</td>
      <td>${item.item_name}</td>
      <td class="r">${formatMoney(item.price)}</td>
      <td class="c">${item.quantity ?? 1}</td>
      <td class="r">${formatMoney(item.price * (item.quantity ?? 1))}</td>
    </tr>`).join('');

  const receiptsHtml = req.receipt_images && req.receipt_images.length > 0
    ? `<div class="receipts-section">
        <h4 class="sec-title">หลักฐานการใช้จ่าย (${req.receipt_images.length} รายการ)</h4>
        <div class="receipts-grid">
          ${req.receipt_images.map((img, i) => `
            <div class="receipt-thumb">
              <img src="${img}" alt="ใบเสร็จ ${i + 1}">
              <p>หลักฐาน ${i + 1}</p>
            </div>`).join('')}
        </div>
      </div>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<title>ใบเบิกจ่ายเงิน #${String(req.id).padStart(5, '0')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Sarabun',sans-serif;font-size:13pt;color:#111;background:#fff;padding:2cm}
@media print{body{padding:1.2cm}}
.hd{text-align:center;margin-bottom:18px}
.hd h1{font-size:17pt;font-weight:700}
.hd p{font-size:11pt;color:#555;margin-top:3px}
hr{border:none;border-top:2.5px solid #111;margin:14px 0}
.doc-title{text-align:center;font-size:16pt;font-weight:700;margin:12px 0}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:6px 20px;margin:14px 0;font-size:12pt}
.meta dt{font-weight:700;color:#555;font-size:10pt;text-transform:uppercase;letter-spacing:.04em}
.meta dd{margin:2px 0 8px}
.badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:10pt;font-weight:700;background:#dcfce7;color:#15803d}
.desc-box{border:1px solid #ccc;border-radius:6px;padding:10px 14px;margin:10px 0;font-size:12pt}
table{width:100%;border-collapse:collapse;margin:14px 0;font-size:12pt}
th,td{border:1px solid #888;padding:7px 10px}
th{background:#f3f4f6;font-weight:700;text-align:center}
td.c{text-align:center}
td.r{text-align:right}
tfoot td{background:#f3f4f6;font-weight:700}
.sig-section{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:36px}
.sig-box{border:1px solid #bbb;border-radius:6px;padding:12px 14px}
.sig-box h4{font-size:10pt;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#555;margin-bottom:8px}
.sig-area{height:88px;display:flex;align-items:center;justify-content:center;margin-bottom:6px}
.sig-area img{max-height:84px;max-width:220px;object-fit:contain}
.sig-line{width:100%;border-bottom:1px solid #444;height:84px}
.sig-name{font-size:12pt;font-weight:600;margin-top:4px}
.sig-dept{font-size:10pt;color:#666;margin-top:2px}
.sig-date{font-size:10pt;color:#666;margin-top:2px}
.receipts-section{margin-top:0;padding-top:14px;page-break-before:always}
.sec-title{font-size:11pt;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:.04em;margin-bottom:12px}
.receipts-grid{display:flex;flex-wrap:wrap;gap:12px}
.receipt-thumb{text-align:center}
.receipt-thumb img{max-width:160px;max-height:200px;object-fit:contain;border:1px solid #ddd;border-radius:6px;padding:4px;display:block}
.receipt-thumb p{font-size:9pt;color:#888;margin-top:4px}
.footer{margin-top:28px;text-align:center;font-size:9pt;color:#999;border-top:1px solid #ddd;padding-top:10px}
</style>
</head>
<body>
<div class="hd">
  <h1>มหาวิทยาลัยราชภัฏเชียงใหม่</h1>
  <p>คณะวิทยาศาสตร์และเทคโนโลยี</p>
</div>
<hr>
<div class="doc-title">ใบเบิกจ่ายเงิน</div>
<dl class="meta">
  <div><dt>เลขที่</dt><dd>#${String(req.id).padStart(5, '0')}</dd></div>
  <div><dt>สถานะ</dt><dd><span class="badge">อนุมัติแล้ว</span></dd></div>
  <div><dt>ชื่อรายการ</dt><dd>${req.title}</dd></div>
  <div><dt>วันที่สร้าง</dt><dd>${formatThaiDate(req.created_at)}</dd></div>
</dl>
${req.description ? `<div class="desc-box"><strong>รายละเอียด:</strong> ${req.description}</div>` : ''}
<table>
  <thead>
    <tr>
      <th style="width:38px">#</th>
      <th>รายการ</th>
      <th style="width:130px">ราคา/หน่วย (฿)</th>
      <th style="width:72px">จำนวน</th>
      <th style="width:140px">รวม (฿)</th>
    </tr>
  </thead>
  <tbody>${rowsHtml}</tbody>
  <tfoot>
    <tr>
      <td colspan="4" class="r" style="padding-right:10px">ยอดรวมทั้งสิ้น</td>
      <td class="r">฿${formatMoney(req.total_amount)}</td>
    </tr>
  </tfoot>
</table>
<div class="sig-section">
  <div class="sig-box">
    <h4>ผู้ขอเบิกเงิน</h4>
    <div class="sig-area">
      ${reqSig ? `<img src="${reqSig}" alt="ลายเซ็น">` : '<div class="sig-line"></div>'}
    </div>
    <div class="sig-name">(${req.requester_name || req.creator_name || ''})</div>
    ${req.creator_dept ? `<div class="sig-dept">ตำแหน่ง: ${req.creator_dept}</div>` : ''}
    <div class="sig-date">วันที่: ${formatThaiDate(req.created_at)}</div>
  </div>
  <div class="sig-box">
    <h4>ผู้อนุมัติ</h4>
    <div class="sig-area">
      ${appSig ? `<img src="${appSig}" alt="ลายเซ็น">` : '<div class="sig-line"></div>'}
    </div>
    <div class="sig-name">(${req.approver_name || ''})</div>
    ${req.approver_dept ? `<div class="sig-dept">ตำแหน่ง: ${req.approver_dept}</div>` : ''}
    <div class="sig-date">วันที่อนุมัติ: ${req.approved_at ? formatThaiDate(req.approved_at) : '-'}</div>
  </div>
</div>
${receiptsHtml}
<div class="footer">พิมพ์จากระบบ CMRU FinancePro &bull; ${now}</div>
</body>
</html>`;

  const popup = window.open('', '_blank', 'width=860,height=720,scrollbars=yes');
  if (popup) {
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    setTimeout(() => popup.print(), 800);
  }
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  pending:  'รออนุมัติ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ปฏิเสธแล้ว',
};

const STATUS_CLASS: Record<string, string> = {
  pending:  'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

// ─── Receipt Uploader ─────────────────────────────────────────────────────────

export function ReceiptUploader({ images, onChange }: {
  images: string[];
  onChange: (imgs: string[]) => void;
}) {
  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    let loaded = 0;
    const newImgs: string[] = [];
    if (files.length === 0) return;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        newImgs.push(reader.result as string);
        loaded++;
        if (loaded === files.length) {
          onChange([...images, ...newImgs]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
          <Paperclip className="w-4 h-4 text-slate-400" /> แนบใบเสร็จ / สลิป
        </label>
        <label className="cursor-pointer inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-semibold">
          <Plus className="w-4 h-4" /> เลือกรูปภาพ
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
        </label>
      </div>
      {images.length > 0 ? (
        <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
          {images.map((img, idx) => (
            <div key={idx} className="relative group">
              <img src={img} alt={`receipt-${idx + 1}`} loading="lazy"
                className="w-20 h-20 object-cover rounded-lg border border-slate-200 cursor-pointer"
                onClick={() => window.open(img, '_blank')} />
              <button
                type="button"
                onClick={() => onChange(images.filter((_, i) => i !== idx))}
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow"
              >
                ×
              </button>
              <span className="absolute bottom-0.5 left-0 right-0 text-[9px] text-center text-white bg-black/40 rounded-b-lg py-0.5">
                {idx + 1}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-lg p-4 text-slate-400 text-sm cursor-pointer hover:border-blue-300 hover:text-blue-400 transition-colors">
          <Image className="w-6 h-6" />
          <span>คลิกเพื่อเลือกรูปใบเสร็จ / สลิป</span>
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
        </label>
      )}
      {images.length > 0 && (
        <p className="text-xs text-slate-400 mt-1">{images.length} รูปภาพ — คลิกรูปเพื่อดูขยาย</p>
      )}
    </div>
  );
}

// ─── Receipt Viewer ───────────────────────────────────────────────────────────

export function ReceiptViewer({ images }: { images?: string[] }) {
  const [viewing, setViewing] = useState<string | null>(null);
  if (!images || images.length === 0) return null;

  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
        <Paperclip className="w-3 h-3" /> ใบเสร็จ / สลิปแนบ ({images.length} รายการ)
      </p>
      <div className="flex flex-wrap gap-2">
        {images.map((img, idx) => (
          <button key={idx} type="button" onClick={() => setViewing(img)}
            className="relative group">
            <img src={img} alt={`receipt-${idx + 1}`} loading="lazy"
              className="w-20 h-20 object-cover rounded-lg border border-slate-200 hover:border-blue-400 transition-colors" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/25 rounded-lg transition-colors">
              <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="absolute bottom-0.5 left-0 right-0 text-[9px] text-center text-white bg-black/40 rounded-b-lg py-0.5">
              {idx + 1}
            </span>
          </button>
        ))}
      </div>

      {viewing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80"
          onClick={() => setViewing(null)}>
          <div className="relative">
            <img src={viewing} alt="receipt"
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl" />
            <button
              onClick={() => setViewing(null)}
              className="absolute -top-3 -right-3 bg-white text-slate-700 rounded-full w-8 h-8 flex items-center justify-center shadow-lg font-bold text-lg hover:bg-slate-100">
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reusable item-row editor ─────────────────────────────────────────────────

function ItemEditor({
  items, onChange,
}: {
  items: ItemDraft[];
  onChange: (items: ItemDraft[]) => void;
}) {
  const add    = () => onChange([...items, { name: '', price: 0, quantity: 1 }]);
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const set    = (i: number, field: keyof ItemDraft, val: string | number) => {
    const next = [...items];
    if (field === 'name')     next[i].name     = val as string;
    else if (field === 'price')    next[i].price    = val as number;
    else                           next[i].quantity = val as number;
    onChange(next);
  };
  const total = items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="block text-sm font-bold text-slate-700">รายการสิ่งของ</label>
        <button type="button" onClick={add}
          className="text-blue-600 hover:text-blue-700 text-sm font-bold flex items-center">
          <Plus className="w-4 h-4 mr-1" /> เพิ่มรายการ
        </button>
      </div>
      <div className="space-y-2 border border-slate-200 rounded-md p-3 bg-slate-50 max-h-64 overflow-y-auto">
        <div className="flex space-x-2 items-center text-[10px] font-bold text-slate-500 uppercase px-1">
          <span className="flex-1">รายการ</span>
          <span className="w-24 text-center">ราคา/หน่วย (฿)</span>
          <span className="w-16 text-center">จำนวน</span>
          <span className="w-24 text-right">รวม (฿)</span>
          <span className="w-6" />
        </div>
        {items.map((item, idx) => (
          <div key={idx} className="flex space-x-2 items-center">
            <input type="text" placeholder="ชื่อสิ่งของ/รายการ" required value={item.name}
              onChange={e => set(idx, 'name', e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-800" />
            <input type="number" placeholder="ราคา" required min="0.01" step="0.01" value={item.price || ''}
              onChange={e => set(idx, 'price', parseFloat(e.target.value) || 0)}
              className="w-24 px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-800" />
            <input type="number" placeholder="จำนวน" required min="1" step="1" value={item.quantity || 1}
              onChange={e => set(idx, 'quantity', parseInt(e.target.value) || 1)}
              className="w-16 px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-800 text-center" />
            <span className="w-24 text-right text-sm font-semibold text-blue-700">
              ฿{formatMoney((item.price || 0) * (item.quantity || 1))}
            </span>
            <button type="button" onClick={() => remove(idx)} className="p-1.5 text-slate-400 hover:text-red-500">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2 text-right">
        <span className="text-sm font-bold text-slate-700">ยอดรวม: ฿{formatMoney(total)}</span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ExpenseRequests() {
  const { user } = useAuth();

  const isAdmin    = user?.role === 'admin';
  const isApprover = isAdmin || !!user?.can_approve_expenses;

  const [requests, setRequests] = useState<ExpenseRequest[]>([]);
  const [tab, setTab]           = useState<Tab>('all');
  const [loading, setLoading]   = useState(false);

  // ── Create modal ──
  const [createOpen,   setCreateOpen]   = useState(false);
  const [createTitle,  setCreateTitle]  = useState('');
  const [createDesc,   setCreateDesc]   = useState('');
  const [createItems,  setCreateItems]  = useState<ItemDraft[]>([{ name: '', price: 0, quantity: 1 }]);
  const [reqSigName,   setReqSigName]   = useState('');
  const [reqSigData,   setReqSigData]   = useState<string | null>(null);
  const [createReceipts, setCreateReceipts] = useState<string[]>([]);

  // ── Edit modal ──
  const [editOpen,  setEditOpen]  = useState(false);
  const [editReq,   setEditReq]   = useState<ExpenseRequest | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc,  setEditDesc]  = useState('');
  const [editItems, setEditItems] = useState<ItemDraft[]>([]);

  // ── Details modal ──
  const [detailsOpen,    setDetailsOpen]    = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedReq,    setSelectedReq]    = useState<ExpenseRequest | null>(null);
  const [selectedItems,  setSelectedItems]  = useState<ExpenseItem[]>([]);

  // ── Edit-requester modal ──
  const [editReqOpen,     setEditReqOpen]     = useState(false);
  const [editReqName,     setEditReqName]     = useState('');
  const [editReqSig,      setEditReqSig]      = useState<string | null>(null);
  const [editReqLoading,  setEditReqLoading]  = useState(false);

  // ── Edit-receipts modal ──
  const [editReceiptsOpen,    setEditReceiptsOpen]    = useState(false);
  const [editReceiptsData,    setEditReceiptsData]    = useState<string[]>([]);
  const [editReceiptsLoading, setEditReceiptsLoading] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────

  const loadRequests = useCallback(async () => {
    try { setRequests(await api.expenseRequests.list()); }
    catch (err) { alert(err instanceof Error ? err.message : 'โหลดข้อมูลล้มเหลว'); }
  }, []);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  // ── Stats ──
  const pendingReqs  = requests.filter(r => r.status === 'pending');
  const approvedReqs = requests.filter(r => r.status === 'approved');
  const rejectedReqs = requests.filter(r => r.status === 'rejected');

  const pendingTotal  = pendingReqs.reduce((s, r)  => s + r.total_amount, 0);
  const approvedTotal = approvedReqs.reduce((s, r) => s + r.total_amount, 0);

  const filtered = tab === 'all'      ? requests
                 : tab === 'pending'  ? pendingReqs
                 : tab === 'approved' ? approvedReqs
                 : rejectedReqs;

  // ── Create ──
  const openCreate = () => {
    setCreateTitle('');
    setCreateDesc('');
    setCreateItems([{ name: '', price: 0, quantity: 1 }]);
    setReqSigName(user?.name ?? '');
    setReqSigData(null);
    setCreateReceipts([]);
    setCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = createItems.filter(i => i.name.trim() !== '' && i.price > 0);
    if (validItems.length === 0) { alert('กรุณาเพิ่มรายการสิ่งของอย่างน้อย 1 รายการ'); return; }
    setLoading(true);
    try {
      await api.expenseRequests.create({
        title: createTitle,
        description: createDesc,
        items: validItems.map(i => ({ name: i.name, price: i.price, quantity: i.quantity || 1 })),
        requester_name:      reqSigName || undefined,
        requester_signature: reqSigData || undefined,
        receipt_images:      createReceipts.length > 0 ? createReceipts : undefined,
      });
      await loadRequests();
      setCreateOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'สร้างรายการล้มเหลว');
    } finally {
      setLoading(false);
    }
  };

  // ── Edit ──
  const openEdit = async (req: ExpenseRequest) => {
    try {
      const details = await api.expenseRequests.getDetails(req.id);
      setEditReq(req);
      setEditTitle(details.title);
      setEditDesc(details.description ?? '');
      setEditItems(details.items.map(i => ({ name: i.item_name, price: i.price, quantity: i.quantity ?? 1 })));
      setEditOpen(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'โหลดรายละเอียดล้มเหลว');
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editReq) return;
    const validItems = editItems.filter(i => i.name.trim() !== '' && i.price > 0);
    if (validItems.length === 0) { alert('กรุณาเพิ่มรายการสิ่งของอย่างน้อย 1 รายการ'); return; }
    setLoading(true);
    try {
      await api.expenseRequests.update(editReq.id, {
        title: editTitle,
        description: editDesc,
        items: validItems.map(i => ({ name: i.name, price: i.price, quantity: i.quantity || 1 })),
      });
      await loadRequests();
      setEditOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'แก้ไขรายการล้มเหลว');
    } finally {
      setLoading(false);
    }
  };

  // ── Delete ──
  const handleDelete = async (req: ExpenseRequest) => {
    const isApproved = req.status === 'approved';
    const msg = isApproved
      ? `ยืนยันลบรายการ "${req.title}" ที่อนุมัติไปแล้ว?\n\nยอดเงิน ฿${formatMoney(req.total_amount)} จะถูกคืนเข้าสู่งบประมาณระบบโดยอัตโนมัติ`
      : `ยืนยันลบรายการ "${req.title}" ?`;
    if (!confirm(msg)) return;
    try {
      await api.expenseRequests.delete(req.id);
      await loadRequests();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ลบรายการล้มเหลว');
    }
  };

  // ── Edit requester name/signature ──
  const openEditRequester = () => {
    if (!selectedReq) return;
    setEditReqName(selectedReq.requester_name || selectedReq.creator_name || '');
    setEditReqSig(null);
    setEditReqOpen(true);
  };

  const handleSaveRequester = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;
    setEditReqLoading(true);
    try {
      const payload: Parameters<typeof api.expenseRequests.updateRequester>[1] = {
        requester_name: editReqName,
      };
      if (editReqSig !== null) {
        payload.requester_signature = editReqSig;
      }
      const updated = await api.expenseRequests.updateRequester(selectedReq.id, payload);
      setSelectedReq(prev => prev ? { ...prev, ...updated } : updated);
      await loadRequests();
      setEditReqOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'บันทึกล้มเหลว');
    } finally {
      setEditReqLoading(false);
    }
  };

  // ── Edit receipts ──
  const openEditReceipts = () => {
    if (!selectedReq) return;
    setEditReceiptsData(selectedReq.receipt_images || []);
    setEditReceiptsOpen(true);
  };

  const handleSaveReceipts = async () => {
    if (!selectedReq) return;
    setEditReceiptsLoading(true);
    try {
      const updated = await api.expenseRequests.updateReceipts(selectedReq.id, editReceiptsData);
      setSelectedReq(prev => prev ? { ...prev, ...updated } : updated);
      await loadRequests();
      setEditReceiptsOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'บันทึกล้มเหลว');
    } finally {
      setEditReceiptsLoading(false);
    }
  };

  // ── Details ──
  const openDetails = async (req: ExpenseRequest) => {
    // Open modal immediately with list data, then load full detail in background
    setSelectedReq(req);
    setSelectedItems([]);
    setDetailsOpen(true);
    setDetailsLoading(true);
    try {
      const details = await api.expenseRequests.getDetails(req.id);
      setSelectedReq(details);
      setSelectedItems(details.items);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'โหลดรายละเอียดล้มเหลว');
    } finally {
      setDetailsLoading(false);
    }
  };

  // ── Approve / reject ──
  const handleAction = async (status: 'approved' | 'rejected') => {
    if (!selectedReq || !isApprover) return;
    try {
      const updated = await api.expenseRequests.updateStatus(selectedReq.id, status);
      setSelectedReq(prev => prev ? { ...prev, ...updated } : updated);
      await loadRequests();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ดำเนินการล้มเหลว');
    }
  };

  // ── Export ──
  const exportDetails = () => {
    if (!selectedReq) return;
    const ws = XLSX.utils.json_to_sheet(selectedItems.map(item => ({
      รายการ: item.item_name,
      ราคาต่อหน่วย: item.price,
      จำนวน: item.quantity ?? 1,
      รวม: item.price * (item.quantity ?? 1),
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ExpenseItems');
    XLSX.writeFile(wb, `${selectedReq.title}_expense.xlsx`);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">รายการเบิกจ่าย</h1>
        <button onClick={openCreate}
          className="inline-flex items-center px-4 py-2 rounded-lg shadow shadow-blue-200 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4 mr-2" /> สร้างรายการใหม่
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<FileText className="w-5 h-5 text-slate-500" />}
          label="ทั้งหมด" value={`${requests.length} รายการ`}
          sub={`฿${formatMoney(requests.reduce((s, r) => s + r.total_amount, 0))}`}
          color="slate" />
        <StatCard icon={<Clock className="w-5 h-5 text-amber-500" />}
          label="รออนุมัติ" value={`${pendingReqs.length} รายการ`}
          sub={`฿${formatMoney(pendingTotal)}`}
          color="amber" />
        <StatCard icon={<CheckCircle2 className="w-5 h-5 text-green-500" />}
          label="อนุมัติแล้ว" value={`${approvedReqs.length} รายการ`}
          sub={`฿${formatMoney(approvedTotal)}`}
          color="green" />
        <StatCard icon={<XCircle className="w-5 h-5 text-red-400" />}
          label="ปฏิเสธแล้ว" value={`${rejectedReqs.length} รายการ`}
          sub="" color="red" />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {(['all', 'pending', 'approved', 'rejected'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${
                tab === t
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {t === 'all'      ? `ทั้งหมด (${requests.length})`
               : t === 'pending'  ? `รออนุมัติ (${pendingReqs.length})`
               : t === 'approved' ? `อนุมัติแล้ว (${approvedReqs.length})`
               : `ปฏิเสธแล้ว (${rejectedReqs.length})`}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
              <tr>
                <th className="px-6 py-3">ชื่อรายการ</th>
                <th className="px-6 py-3">ผู้ขอเบิก</th>
                <th className="px-6 py-3">จำนวนเงิน</th>
                <th className="px-6 py-3">สถานะ</th>
                <th className="px-6 py-3">วันที่</th>
                <th className="px-6 py-3 text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    ไม่พบรายการ
                  </td>
                </tr>
              ) : filtered.map(req => (
                <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-900 max-w-[200px]">
                    <div className="truncate">{req.title}</div>
                    {(req.receipt_count ?? req.receipt_images?.length ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                        <Paperclip className="w-3 h-3" /> {req.receipt_count ?? req.receipt_images!.length} ใบเสร็จ
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {req.requester_name || req.creator_name || '—'}
                    {req.creator_dept && (
                      <span className="block text-[11px] text-slate-400">{req.creator_dept}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-bold text-blue-600">฿{formatMoney(req.total_amount)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${STATUS_CLASS[req.status]}`}>
                      {STATUS_LABEL[req.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                    {format(new Date(req.created_at), 'dd MMM yyyy')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {req.status === 'pending' && (isAdmin || req.created_by === user?.id) && (
                        <button onClick={() => openEdit(req)}
                          className="text-blue-500 hover:text-blue-700 flex items-center font-bold text-xs">
                          <Pencil className="w-4 h-4 mr-1" /> แก้ไข
                        </button>
                      )}
                      {(req.status === 'pending'
                          ? (isAdmin || req.created_by === user?.id)
                          : isAdmin
                      ) && (
                        <button onClick={() => handleDelete(req)}
                          className="text-red-500 hover:text-red-700 flex items-center font-bold text-xs">
                          <Trash2 className="w-4 h-4 mr-1" /> ลบ
                        </button>
                      )}
                      <button onClick={() => openDetails(req)}
                        className="text-slate-500 hover:text-slate-800 flex items-center font-bold text-xs">
                        <Eye className="w-4 h-4 mr-1" />
                        {req.status === 'pending' && isApprover ? 'ตรวจสอบ' : 'ดูรายละเอียด'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create Modal ────────────────────────────────────────────────────────── */}
      {createOpen && (
        <Modal title="สร้างรายการเบิกจ่าย" onClose={() => setCreateOpen(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <Field label="ชื่อรายการ">
              <input type="text" required value={createTitle}
                onChange={e => setCreateTitle(e.target.value)}
                className="input-base" />
            </Field>
            <Field label="รายละเอียดเพิ่มเติม">
              <textarea rows={2} value={createDesc}
                onChange={e => setCreateDesc(e.target.value)}
                className="input-base" />
            </Field>
            <ItemEditor items={createItems} onChange={setCreateItems} />

            {/* Receipt attachment */}
            <div className="pt-2 border-t border-slate-100">
              <ReceiptUploader images={createReceipts} onChange={setCreateReceipts} />
            </div>

            {/* Signature section */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <p className="text-sm font-bold text-slate-700">ลายเซ็นผู้ขอเบิก</p>
              {user?.signature ? (
                <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <img src={user.signature} alt="ลายเซ็น" className="h-12 object-contain" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                    <p className="text-xs text-slate-400">ใช้ลายเซ็นที่บันทึกไว้</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Field label="ชื่อ-นามสกุลผู้ขอเบิก">
                    <input type="text" value={reqSigName}
                      onChange={e => setReqSigName(e.target.value)}
                      className="input-base" placeholder="ระบุชื่อ-นามสกุล" />
                  </Field>
                  <SignatureCanvas
                    onChange={setReqSigData}
                    width={460}
                    height={130}
                    label="วาดลายเซ็น"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setCreateOpen(false)}
                className="btn-secondary">ยกเลิก</button>
              <button type="submit" disabled={loading}
                className="btn-primary">{loading ? 'กำลังส่ง...' : 'ส่งคำขอเบิกเงิน'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Edit Modal ──────────────────────────────────────────────────────────── */}
      {editOpen && editReq && (
        <Modal title="แก้ไขรายการเบิกจ่าย" onClose={() => setEditOpen(false)}>
          <form onSubmit={handleEdit} className="space-y-4">
            <Field label="ชื่อรายการ">
              <input type="text" required value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="input-base" />
            </Field>
            <Field label="รายละเอียดเพิ่มเติม">
              <textarea rows={2} value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                className="input-base" />
            </Field>
            <ItemEditor items={editItems} onChange={setEditItems} />
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setEditOpen(false)}
                className="btn-secondary">ยกเลิก</button>
              <button type="submit" disabled={loading}
                className="btn-primary">{loading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Details Modal ───────────────────────────────────────────────────────── */}
      {detailsOpen && selectedReq && (
        <Modal title={selectedReq.title} onClose={() => setDetailsOpen(false)} wide>
          {/* Meta row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm mb-5">
            <MetaField label="วันที่สร้าง">
              {formatThaiDateTime(selectedReq.created_at)}
            </MetaField>
            <MetaField label="สถานะ">
              <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold ${STATUS_CLASS[selectedReq.status]}`}>
                {STATUS_LABEL[selectedReq.status]}
              </span>
            </MetaField>
            <MetaField label="ผู้ขอเบิก">
              {selectedReq.requester_name || selectedReq.creator_name || '—'}
              {selectedReq.creator_dept && (
                <span className="block text-slate-400 text-xs">{selectedReq.creator_dept}</span>
              )}
            </MetaField>
            {selectedReq.status === 'approved' && selectedReq.approver_name && (
              <MetaField label="ผู้อนุมัติ">
                {selectedReq.approver_name}
                {selectedReq.approver_dept && (
                  <span className="block text-slate-400 text-xs">{selectedReq.approver_dept}</span>
                )}
              </MetaField>
            )}
            {selectedReq.approved_at && (
              <MetaField label="วันที่อนุมัติ">
                {formatThaiDateTime(selectedReq.approved_at)}
              </MetaField>
            )}
          </div>

          {selectedReq.description && (
            <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 mb-4 border border-slate-100">
              {selectedReq.description}
            </p>
          )}

          {/* Items table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden mb-5">
            <table className="min-w-full text-sm divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">รายการ</th>
                  <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">ราคา/หน่วย (฿)</th>
                  <th className="px-4 py-2 text-center text-xs font-bold text-slate-500 uppercase">จำนวน</th>
                  <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">รวม (฿)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detailsLoading ? (
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
                ) : selectedItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-800">{item.item_name}</td>
                    <td className="px-4 py-2 text-slate-700 text-right">{formatMoney(item.price)}</td>
                    <td className="px-4 py-2 text-slate-700 text-center">{item.quantity ?? 1}</td>
                    <td className="px-4 py-2 text-blue-700 font-semibold text-right">
                      {formatMoney(item.price * (item.quantity ?? 1))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-bold">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right text-slate-700">ยอดรวม:</td>
                  <td className="px-4 py-3 text-right text-blue-600">฿{formatMoney(selectedReq.total_amount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Signatures preview — shown only after detail loaded */}
          {!detailsLoading && (selectedReq.requester_signature || selectedReq.approver_signature) && (
            <div className="grid grid-cols-2 gap-4 mb-5">
              {selectedReq.requester_signature && (
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">ลายเซ็นผู้ขอเบิก</p>
                  <img src={selectedReq.requester_signature} alt="ลายเซ็น"
                    className="max-h-16 object-contain" loading="lazy" />
                </div>
              )}
              {selectedReq.approver_signature && selectedReq.status === 'approved' && (
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">ลายเซ็นผู้อนุมัติ</p>
                  <img src={selectedReq.approver_signature} alt="ลายเซ็น"
                    className="max-h-16 object-contain" loading="lazy" />
                </div>
              )}
            </div>
          )}

          {/* Receipt images — shown only after detail loaded */}
          {!detailsLoading && (selectedReq.receipt_images?.length ?? 0) > 0 && (
            <div className="mb-5 p-3 bg-amber-50 border border-amber-100 rounded-lg">
              <ReceiptViewer images={selectedReq.receipt_images} />
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setDetailsOpen(false)} className="btn-secondary">ปิด</button>
              <button onClick={exportDetails}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200">
                <Download className="w-4 h-4" /> Excel
              </button>
              {selectedReq.status === 'approved' && (
                <button
                  onClick={() => printReport(selectedReq, selectedItems)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow shadow-indigo-200">
                  <Printer className="w-4 h-4" /> พิมพ์ / PDF
                </button>
              )}
              {(isAdmin || selectedReq.created_by === user?.id) && (
                <>
                  <button onClick={openEditRequester}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-sm font-semibold hover:bg-amber-100">
                    <UserPen className="w-4 h-4" /> แก้ไขชื่อ/ลายเซ็น
                  </button>
                  <button onClick={openEditReceipts}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-100">
                    <Paperclip className="w-4 h-4" />
                    {(selectedReq.receipt_images?.length ?? selectedReq.receipt_count ?? 0) > 0
                      ? `ใบเสร็จ (${selectedReq.receipt_images?.length ?? selectedReq.receipt_count})`
                      : 'แนบใบเสร็จ'}
                  </button>
                </>
              )}
            </div>

            {isApprover && selectedReq.status === 'pending' && (
              <div className="flex gap-2">
                <button onClick={() => handleAction('rejected')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow shadow-red-200">
                  <X className="w-4 h-4" /> ปฏิเสธ
                </button>
                <button onClick={() => handleAction('approved')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-white bg-green-600 hover:bg-green-700 shadow shadow-green-200">
                  <Check className="w-4 h-4" /> อนุมัติ
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Edit Requester Modal ─────────────────────────────────────────────────── */}
      {editReqOpen && selectedReq && (
        <Modal title="แก้ไขชื่อ / ลายเซ็นผู้ขอเบิก" onClose={() => setEditReqOpen(false)}>
          <form onSubmit={handleSaveRequester} className="space-y-4">
            <Field label="ชื่อ-นามสกุลผู้ขอเบิก">
              <input type="text" value={editReqName}
                onChange={e => setEditReqName(e.target.value)}
                className="input-base" placeholder="ระบุชื่อ-นามสกุล" />
            </Field>

            <div className="space-y-2">
              <p className="text-sm font-bold text-slate-700">ลายเซ็น</p>
              {selectedReq.requester_signature && !editReqSig && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 mb-2">
                  <img src={selectedReq.requester_signature} alt="ลายเซ็นปัจจุบัน"
                    className="h-10 object-contain" />
                  <p className="text-xs text-slate-500">ลายเซ็นปัจจุบัน — วาดด้านล่างเพื่อเปลี่ยน</p>
                </div>
              )}
              <SignatureCanvas
                onChange={setEditReqSig}
                width={460}
                height={120}
                label={selectedReq.requester_signature ? 'วาดลายเซ็นใหม่ (เว้นว่างเพื่อคงเดิม)' : 'วาดลายเซ็น'}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setEditReqOpen(false)}
                className="btn-secondary">ยกเลิก</button>
              <button type="submit" disabled={editReqLoading}
                className="btn-primary">
                {editReqLoading ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Edit Receipts Modal ──────────────────────────────────────────────────── */}
      {editReceiptsOpen && selectedReq && (
        <Modal title="แนบใบเสร็จ / สลิป" onClose={() => setEditReceiptsOpen(false)}>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              เพิ่มหรือลบใบเสร็จ/สลิปสำหรับรายการนี้ได้ทุกเมื่อ ไม่จำกัดสถานะ
            </p>
            <ReceiptUploader images={editReceiptsData} onChange={setEditReceiptsData} />
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setEditReceiptsOpen(false)}
                className="btn-secondary">ยกเลิก</button>
              <button type="button" disabled={editReceiptsLoading} onClick={handleSaveReceipts}
                className="btn-primary">
                {editReceiptsLoading ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Small helper components ──────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: 'slate' | 'amber' | 'green' | 'red';
}) {
  const bg = { slate: 'bg-slate-50', amber: 'bg-amber-50', green: 'bg-green-50', red: 'bg-red-50' }[color];
  return (
    <div className={`${bg} rounded-xl border border-slate-200 p-4 flex items-start gap-3`}>
      <div className="mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-lg font-bold text-slate-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function Modal({ title, children, onClose, wide }: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 bg-slate-900/70 transition-opacity" onClick={onClose} />
        <div className={`relative inline-block w-full ${wide ? 'max-w-3xl' : 'max-w-2xl'} p-6 text-left align-middle bg-white shadow-xl rounded-xl border border-slate-200 z-10`}>
          <h3 className="text-lg font-bold text-slate-900 mb-4">{title}</h3>
          {children}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-bold text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

function MetaField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</span>
      <span className="text-sm font-semibold text-slate-800">{children}</span>
    </div>
  );
}
