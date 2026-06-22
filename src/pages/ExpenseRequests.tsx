import React, { useState, useEffect, useCallback } from 'react';
import { api, ExpenseRequest, ExpenseItem, formatMoney } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Plus, Check, X, Eye, Download, Trash2, Pencil,
  Clock, CheckCircle2, XCircle, FileText, Printer, UserPen, Paperclip, Image, Loader2, ScanText, Sparkles,
} from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
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

// บีบอัด/ย่อขนาดรูปให้ data URL ไม่เกินเป้าหมาย (~1MB) ก่อนเก็บ
const MAX_RECEIPT_BYTES = 1024 * 1024; // 1 MB

function approxDataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',');
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  // base64: ทุก 4 ตัวอักษร = 3 ไบต์
  return Math.floor((b64.length * 3) / 4);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('โหลดรูปภาพไม่สำเร็จ'));
    img.src = src;
  });
}

async function compressImageFile(file: File): Promise<string> {
  const original = await readFileAsDataUrl(file);

  // ไฟล์ที่ไม่ใช่รูปภาพ หรือรูปเล็กอยู่แล้ว → ใช้ของเดิม
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return original;
  if (approxDataUrlBytes(original) <= MAX_RECEIPT_BYTES) return original;

  let img: HTMLImageElement;
  try {
    img = await loadImage(original);
  } catch {
    return original; // ถ้าวาดไม่ได้ ก็เก็บของเดิมไป
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return original;

  // ลดความละเอียดสูงสุดลงทีละขั้นจนกว่าจะเล็กพอ
  let maxDim = 2000;
  let best = original;

  for (let attempt = 0; attempt < 8; attempt++) {
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // ไล่ลดคุณภาพ JPEG จนกว่าจะได้ขนาดที่ต้องการ
    for (let q = 0.8; q >= 0.4; q -= 0.1) {
      const out = canvas.toDataURL('image/jpeg', q);
      best = out;
      if (approxDataUrlBytes(out) <= MAX_RECEIPT_BYTES) return out;
    }

    maxDim = Math.round(maxDim * 0.75); // ย่อขนาดลงอีกแล้วลองใหม่
  }

  return best; // ใช้ผลที่เล็กที่สุดเท่าที่ทำได้
}

export function ReceiptUploader({ images, onChange }: {
  images: string[];
  onChange: (imgs: string[]) => void;
}) {
  const [busy, setBusy] = useState(false);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    setBusy(true);
    try {
      const newImgs = await Promise.all(files.map(compressImageFile));
      onChange([...images, ...newImgs]);
    } catch (err) {
      console.error('อัปโหลดรูปไม่สำเร็จ', err);
      alert('อัปโหลดรูปภาพบางรูปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
          <Paperclip className="w-4 h-4 text-slate-400" /> แนบใบเสร็จ / สลิป
        </label>
        <label className={`inline-flex items-center gap-1 text-sm font-semibold ${busy ? 'text-slate-400 cursor-wait' : 'text-blue-600 hover:text-blue-700 cursor-pointer'}`}>
          {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> กำลังประมวลผล…</> : <><Plus className="w-4 h-4" /> เลือกรูปภาพ</>}
          <input type="file" accept="image/*" multiple className="hidden" disabled={busy} onChange={handleFiles} />
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
        <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-lg p-4 text-slate-400 text-sm transition-colors ${busy ? 'cursor-wait' : 'cursor-pointer hover:border-blue-300 hover:text-blue-400'}`}>
          {busy ? <Loader2 className="w-6 h-6 animate-spin" /> : <Image className="w-6 h-6" />}
          <span>{busy ? 'กำลังประมวลผลรูปภาพ…' : 'คลิกเพื่อเลือกรูปใบเสร็จ / สลิป'}</span>
          <input type="file" accept="image/*" multiple className="hidden" disabled={busy} onChange={handleFiles} />
        </label>
      )}
      <p className="text-xs text-slate-400 mt-1">
        {images.length > 0 ? `${images.length} รูปภาพ — คลิกรูปเพื่อดูขยาย` : 'รองรับไฟล์ขนาดใหญ่ ระบบจะย่อขนาดให้อัตโนมัติ (ไม่เกิน 1 MB ต่อรูป)'}
      </p>
    </div>
  );
}

// ─── Receipt OCR (อ่านใบเสร็จอัตโนมัติ — ทำงานในเครื่อง ไม่ใช้ API key) ─────────
//
// ใช้ Tesseract.js (WebAssembly OCR) โหลดจาก CDN เมื่อกดใช้งานครั้งแรกเท่านั้น
// รูปภาพถูกประมวลผลในเบราว์เซอร์ของผู้ใช้ทั้งหมด — ไม่มีการส่งรูปออกภายนอก

const TESSERACT_VERSION = '5.1.1';
const TESSERACT_CDN = `https://cdn.jsdelivr.net/npm/tesseract.js@${TESSERACT_VERSION}/dist/tesseract.min.js`;

let tesseractLoader: Promise<any> | null = null;
function loadTesseract(): Promise<any> {
  const w = window as any;
  if (w.Tesseract) return Promise.resolve(w.Tesseract);
  if (tesseractLoader) return tesseractLoader;
  tesseractLoader = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = TESSERACT_CDN;
    s.async = true;
    s.onload = () =>
      w.Tesseract ? resolve(w.Tesseract) : reject(new Error('โหลดไลบรารี OCR ไม่สำเร็จ'));
    s.onerror = () => {
      tesseractLoader = null;
      reject(new Error('โหลดไลบรารี OCR ไม่สำเร็จ — ต้องเชื่อมต่ออินเทอร์เน็ตในการใช้งานครั้งแรก'));
    };
    document.head.appendChild(s);
  });
  return tesseractLoader;
}

const OCR_STATUS_TH: Record<string, string> = {
  'loading tesseract core':        'กำลังโหลดเครื่องมือ OCR…',
  'initializing tesseract':        'กำลังเริ่มต้น…',
  'loading language traineddata':  'กำลังโหลดภาษาไทย…',
  'initializing api':              'กำลังเตรียมระบบ…',
  'recognizing text':              'กำลังอ่านใบเสร็จ…',
};

// บรรทัดที่เป็นหัวบิล/ยอดรวม/ข้อมูลร้าน — ไม่ใช่รายการสินค้า จึงข้าม
const OCR_SKIP_KEYWORDS = [
  // ยอดเงิน / ภาษี / การชำระเงิน
  'รวม', 'ยอดสุทธิ', 'สุทธิ', 'total', 'subtotal', 'sub total', 'net', 'balance',
  'ภาษีมูลค่า', 'vat', 'ภ.พ.', 'tax', 'เงินสด', 'cash', 'ทอน', 'เงินทอน', 'change',
  'รับเงิน', 'รับชำระ', 'ชำระเงิน', 'qr', 'พร้อมเพย์', 'promptpay', 'card', 'approved', 'pos',
  // ข้อมูลร้าน / นิติบุคคล / หัวบิล
  'บริษัท', 'ห้างหุ้นส่วน', 'หจก', 'หสน', 'จำกัด', 'มหาชน', 'co.', 'ltd', 'company', 'สำนักงาน',
  'เลขประจำตัว', 'เลขที่', 'ใบเสร็จ', 'ใบกำกับ', 'receipt', 'invoice', 'barcode', 'บาร์โค้ด',
  'โทร', 'tel', 'โทรศัพท์', 'วันที่', 'date', 'เวลา', 'time', 'ที่อยู่', 'สาขา', 'branch',
  'พนักงาน', 'cashier', 'แคชเชียร์', 'ขอบคุณ', 'thank', 'สมาชิก', 'member', 'แต้ม', 'grand',
];

// "ราคา" ต้องมีจุดทศนิยม (เช่น 120.00 / 1,234.50) — ตัด barcode / รหัส / เบอร์โทรออก
const PRICE_RE = /\d{1,3}(?:,\d{3})*\.\d{1,2}|\d+\.\d{1,2}/g;
// ตัวเลขทั่วไป (ใช้หาจำนวน/ราคาต่อหน่วย และลบออกจากชื่อ)
const NUM_RE   = /\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?/g;
const MAX_ITEM_PRICE = 10_000_000; // กันเลข barcode/รหัสภาษีหลุดมาเป็นราคา

// แปลงเลขไทย ๐-๙ เป็น 0-9 ก่อนวิเคราะห์
function normalizeThaiDigits(s: string): string {
  return s.replace(/[๐-๙]/g, d => '๐๑๒๓๔๕๖๗๘๙'.indexOf(d).toString());
}

// แปลงข้อความ OCR เป็นรายการ { name, price (ราคา/หน่วย), quantity }
function parseReceiptText(text: string): ItemDraft[] {
  const items: ItemDraft[] = [];
  const seen = new Set<string>();

  for (const rawLine of normalizeThaiDigits(text).split(/\r?\n/)) {
    const line = rawLine.replace(/\s+/g, ' ').trim();
    if (line.length < 4) continue;
    if (OCR_SKIP_KEYWORDS.some(k => line.toLowerCase().includes(k))) continue;

    // มีเลขยาวผิดปกติ (barcode 13 หลัก / เลขผู้เสียภาษี) → ไม่ใช่บรรทัดสินค้า
    if (/\d{9,}/.test(line.replace(/[,\s]/g, ''))) continue;

    // ต้องมี "ราคา" ที่มีจุดทศนิยมในบรรทัด ไม่งั้นไม่ถือเป็นรายการสินค้า
    const priceTokens = line.match(PRICE_RE);
    if (!priceTokens) continue;
    const amount = parseFloat(priceTokens[priceTokens.length - 1].replace(/,/g, '')); // ราคาท้ายบรรทัด
    if (!(amount > 0) || amount > MAX_ITEM_PRICE) continue;

    // จำนวน: รองรับ "x2", "2x", "จำนวน 2", "2 ชิ้น" ฯลฯ
    let quantity = 1;
    const qty = line.match(/(?:x|×|จำนวน|qty\.?)\s*(\d{1,3})|(\d{1,3})\s*(?:x|×|ชิ้น|อัน|ea\b)/i);
    if (qty) quantity = parseInt(qty[1] || qty[2], 10) || 1;
    if (quantity < 1 || quantity > 999) quantity = 1;

    // ราคา/หน่วย: ถ้าจำนวน > 1 หาเลขที่ × จำนวนแล้วได้ยอดรวม (= ราคาต่อหน่วย)
    let price = amount;
    if (quantity > 1) {
      const nums = (line.match(NUM_RE) || []).map(n => parseFloat(n.replace(/,/g, '')));
      let unit = amount / quantity;
      for (const v of nums) {
        if (v > 0 && v !== amount && Math.abs(v * quantity - amount) < 0.5) { unit = v; break; }
      }
      price = Math.round(unit * 100) / 100;
    }
    if (!(price > 0)) continue;

    // ชื่อ: ตัดตัวเลข/สัญลักษณ์/หน่วยออก เหลือเฉพาะข้อความ
    const name = line
      .replace(NUM_RE, ' ')
      .replace(/(?:x|×|@|จำนวน|qty\.?|฿|บาท|[$£€])/gi, ' ')
      .replace(/[|*•·▪–—_=()[\]{}<>"']+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^[-.,:)\]]+\s*/, '')
      .trim();

    // ต้องมีตัวอักษรจริงอย่างน้อย 2 ตัว ไม่งั้นน่าจะเป็น noise
    if (name.replace(/[^A-Za-zก-๙]/g, '').length < 2) continue;

    const key = `${name}|${price}|${quantity}`;
    if (seen.has(key)) continue; // กันรายการซ้ำ
    seen.add(key);

    items.push({ name, price, quantity });
    if (items.length >= 60) break;
  }
  return items;
}

// เพิ่มความคมชัดก่อนส่งเข้า OCR: ขยายรูปเล็ก + แปลงเป็นโทนเทา + เพิ่มคอนทราสต์
async function preprocessForOcr(dataUrl: string): Promise<string> {
  try {
    const img = await loadImage(dataUrl);
    const maxSide = Math.max(img.width, img.height) || 1;
    const scale = maxSide < 1800 ? Math.min(2, 1800 / maxSide) : Math.min(1, 2200 / maxSide);
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, w, h);

    const imageData = ctx.getImageData(0, 0, w, h);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const c = Math.max(0, Math.min(255, (gray - 128) * 1.25 + 128)); // contrast boost
      d[i] = d[i + 1] = d[i + 2] = c;
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
  } catch {
    return dataUrl; // ถ้าประมวลผลไม่ได้ ใช้รูปเดิม
  }
}

export function ReceiptOcrButton({ images, onExtract }: {
  images: string[];
  onExtract: (items: ItemDraft[]) => number;
}) {
  const [busy, setBusy]   = useState(false);
  const [label, setLabel] = useState('');
  const [pct, setPct]     = useState(0);

  const run = async () => {
    if (images.length === 0) { alert('กรุณาแนบรูปใบเสร็จ / สลิป ก่อนกดอ่านอัตโนมัติ'); return; }
    setBusy(true); setPct(0); setLabel('กำลังเตรียม…');

    let worker: any = null;
    try {
      const Tesseract = await loadTesseract();
      worker = await Tesseract.createWorker('tha+eng', 1, {
        logger: (m: any) => {
          if (m?.status) setLabel(OCR_STATUS_TH[m.status] ?? 'กำลังประมวลผล…');
          if (m?.status === 'recognizing text' && typeof m.progress === 'number') {
            setPct(Math.round(m.progress * 100));
          }
        },
      });
      // ตั้งค่าให้เหมาะกับใบเสร็จ: อ่านเป็นคอลัมน์เดียว + รักษาช่องว่างระหว่างคำ
      try {
        await worker.setParameters({
          tessedit_pageseg_mode: '4',      // single column of text of variable sizes
          preserve_interword_spaces: '1',
        });
      } catch { /* รุ่นไลบรารีไม่รองรับก็ข้ามไป */ }

      const all: ItemDraft[] = [];
      for (let i = 0; i < images.length; i++) {
        setLabel(images.length > 1 ? `กำลังอ่านรูปที่ ${i + 1}/${images.length}…` : 'กำลังอ่านใบเสร็จ…');
        const prepared = await preprocessForOcr(images[i]);
        const { data } = await worker.recognize(prepared);
        all.push(...parseReceiptText(data?.text || ''));
      }

      if (all.length === 0) {
        alert('อ่านรายการจากใบเสร็จไม่สำเร็จ\n\nลองใช้รูปที่คมชัด ถ่ายตรง และมีแสงเพียงพอ แล้วลองอีกครั้ง — หรือกรอกรายการเองได้');
        return;
      }
      const added = onExtract(all);
      alert(`เพิ่ม ${added} รายการจากใบเสร็จแล้ว ✓\n\nกรุณาตรวจสอบชื่อ / ราคา / จำนวน ให้ถูกต้องก่อนบันทึก\n(การอ่านอัตโนมัติอาจคลาดเคลื่อนได้ตามคุณภาพของรูป)`);
    } catch (err) {
      console.error('OCR ใบเสร็จล้มเหลว', err);
      alert(err instanceof Error ? err.message : 'อ่านใบเสร็จไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      if (worker) { try { await worker.terminate(); } catch { /* ignore */ } }
      setBusy(false); setPct(0); setLabel('');
    }
  };

  return (
    <div className="mt-2">
      <button type="button" onClick={run} disabled={busy}
        className={`w-full inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${
          busy ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-wait'
               : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanText className="w-4 h-4" />}
        {busy ? `${label || 'กำลังประมวลผล…'}${pct ? ` ${pct}%` : ''}` : 'อ่านใบเสร็จอัตโนมัติ → กรอกรายการให้'}
      </button>
      {busy && (
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
      <p className="mt-1 text-[11px] text-slate-400">
        ประมวลผลในเครื่อง ไม่ส่งรูปออกภายนอก • ผลลัพธ์เป็นร่าง โปรดตรวจสอบก่อนบันทึก
      </p>
    </div>
  );
}

// ─── Receipt AI (Gemini 2.5 — วิเคราะห์ใบเสร็จด้วย AI) ─────────────────────────
//
// ใช้ Google Gemini 2.5 (vision) อ่านใบเสร็จ/สลิป — แม่นกว่า OCR มากกับภาษาไทย
// ต้องมี API key: ตั้งผ่าน env (VITE_GEMINI_API_KEY) หรือกรอกครั้งแรกแล้วเก็บใน localStorage
// หมายเหตุ: แอปนี้เป็น client-side คีย์จะอยู่ในเครื่องผู้ใช้ — เหมาะกับใช้งานภายในองค์กร

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_KEY_STORAGE = 'gemini_api_key';

const AI_RECEIPT_PROMPT = [
  'คุณคือผู้ช่วยกรอกใบเบิกจ่ายของมหาวิทยาลัย วิเคราะห์รูปใบเสร็จ/สลิปทั้งหมดที่แนบมา แล้วดึงเฉพาะ "รายการสินค้า/บริการ" ออกมา',
  'กติกา:',
  '- เอาเฉพาะรายการสินค้าจริง ห้ามใส่: ยอดรวม, ยอดสุทธิ, ภาษีมูลค่าเพิ่ม/VAT, ส่วนลด, เงินทอน, เงินรับ, ชื่อร้าน, ที่อยู่, เลขที่บิล หรือหัว/ท้ายบิล',
  '- name: ชื่อรายการตามที่อ่านได้ สะกดภาษาไทย/อังกฤษให้ถูกต้องและเป็นธรรมชาติ',
  '- price: ราคาต่อ 1 หน่วย เป็นตัวเลขล้วน (ไม่มีสัญลักษณ์เงิน) ถ้าใบเสร็จให้ราคารวมของรายการมา ให้หารด้วยจำนวนเพื่อได้ราคาต่อหน่วย',
  '- quantity: จำนวน เป็นจำนวนเต็ม ถ้าไม่ระบุให้เป็น 1',
  '- ถ้ามีใบเสร็จหลายใบ ให้รวมรายการจากทุกใบ',
  '- ถ้าอ่านไม่ออกหรือไม่มีรายการ ให้คืน items เป็น []',
  'ตอบกลับเป็น JSON ตาม schema เท่านั้น ห้ามมีข้อความอื่น',
].join('\n');

const RECEIPT_SCHEMA: any = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name:     { type: Type.STRING,  description: 'ชื่อรายการสินค้า/บริการ' },
          price:    { type: Type.NUMBER,  description: 'ราคาต่อหน่วย เป็นตัวเลข' },
          quantity: { type: Type.INTEGER, description: 'จำนวน เป็นจำนวนเต็ม (ไม่ระบุ = 1)' },
        },
        required: ['name', 'price', 'quantity'],
      },
    },
  },
  required: ['items'],
};

function getGeminiKey(): string {
  const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY as string | undefined;
  return (envKey || localStorage.getItem(GEMINI_KEY_STORAGE) || '').trim();
}

function ensureGeminiKey(): string | null {
  const existing = getGeminiKey();
  if (existing) return existing;
  const entered = window.prompt(
    'วาง Gemini API key (จะบันทึกไว้ในเครื่องนี้)\n\nขอคีย์ฟรีได้ที่ https://aistudio.google.com/apikey',
  );
  const key = (entered || '').trim();
  if (!key) return null;
  localStorage.setItem(GEMINI_KEY_STORAGE, key);
  return key;
}

function dataUrlToInline(dataUrl: string): { mimeType: string; data: string } | null {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  return m ? { mimeType: m[1], data: m[2] } : null;
}

function sanitizeAiItems(parsed: any): ItemDraft[] {
  const arr = Array.isArray(parsed?.items) ? parsed.items : Array.isArray(parsed) ? parsed : [];
  const out: ItemDraft[] = [];
  for (const it of arr) {
    const name  = String(it?.name ?? '').trim();
    const price = Number(it?.price);
    let quantity = Math.round(Number(it?.quantity));
    if (!name || !isFinite(price) || price <= 0) continue;
    if (!isFinite(quantity) || quantity < 1) quantity = 1;
    if (quantity > 9999) quantity = 1;
    out.push({ name, price: Math.round(price * 100) / 100, quantity });
  }
  return out;
}

export function ReceiptAiButton({ images, onExtract }: {
  images: string[];
  onExtract: (items: ItemDraft[]) => number;
}) {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (images.length === 0) { alert('กรุณาแนบรูปใบเสร็จ / สลิป ก่อนใช้ AI วิเคราะห์'); return; }
    const apiKey = ensureGeminiKey();
    if (!apiKey) return;

    setBusy(true);
    try {
      const parts: any[] = [{ text: AI_RECEIPT_PROMPT }];
      for (const img of images) {
        const inline = dataUrlToInline(img);
        if (inline) parts.push({ inlineData: inline });
      }
      if (parts.length === 1) { alert('รูปภาพไม่อยู่ในรูปแบบที่รองรับการวิเคราะห์'); return; }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: RECEIPT_SCHEMA,
          temperature: 0,
        },
      });

      let parsed: any;
      try { parsed = JSON.parse(response.text ?? ''); }
      catch { alert('AI ตอบกลับในรูปแบบที่อ่านไม่ได้ กรุณาลองใหม่อีกครั้ง'); return; }

      const items = sanitizeAiItems(parsed);
      if (items.length === 0) {
        alert('AI ไม่พบรายการสินค้าในใบเสร็จ — ลองใช้รูปที่ชัดขึ้น หรือกรอกเอง');
        return;
      }
      const added = onExtract(items);
      alert(`AI เพิ่ม ${added} รายการจากใบเสร็จแล้ว ✓\n\nกรุณาตรวจสอบชื่อ / ราคา / จำนวน ให้ถูกต้องก่อนบันทึก`);
    } catch (err: any) {
      console.error('Gemini วิเคราะห์ใบเสร็จล้มเหลว', err);
      const msg = String(err?.message || err);
      if (/api[\s_-]?key|permission|unauthor|invalid|quota|\b40[0-9]\b/i.test(msg)) {
        if (confirm('เรียก Gemini ไม่สำเร็จ — อาจเป็นเพราะ API key ไม่ถูกต้องหรือหมดโควตา\n\nต้องการล้างคีย์เดิมเพื่อกรอกใหม่หรือไม่?')) {
          localStorage.removeItem(GEMINI_KEY_STORAGE);
        }
      } else {
        alert('AI วิเคราะห์ไม่สำเร็จ: ' + msg);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={run} disabled={busy}
      className={`mt-2 w-full inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-white transition-colors ${
        busy ? 'bg-violet-300 cursor-wait'
             : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700'}`}>
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
      {busy ? 'AI กำลังวิเคราะห์ใบเสร็จ…' : 'AI วิเคราะห์ใบเสร็จ — แม่นที่สุด'}
    </button>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/30 backdrop-blur-md"
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

  // เติมรายการที่อ่านได้จากใบเสร็จ (OCR) ต่อท้ายรายการที่กรอกไว้แล้ว
  const fillItemsFromOcr = (ocrItems: ItemDraft[]): number => {
    setCreateItems(prev => {
      const existing = prev.filter(i => i.name.trim() !== '' || i.price > 0);
      return [...existing, ...ocrItems];
    });
    return ocrItems.length;
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

            {/* Receipt attachment + อ่านอัตโนมัติ (OCR ในเครื่อง / AI Gemini) */}
            <div className="pt-2 border-t border-slate-100">
              <ReceiptUploader images={createReceipts} onChange={setCreateReceipts} />
              <ReceiptAiButton images={createReceipts} onExtract={fillItemsFromOcr} />
              <ReceiptOcrButton images={createReceipts} onExtract={fillItemsFromOcr} />
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
        <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-sm transition-opacity" onClick={onClose} />
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
