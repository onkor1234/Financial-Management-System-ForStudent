import React, { useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { SignatureCanvas } from '../components/SignatureCanvas';
import { Save, CheckCircle2, PenLine } from 'lucide-react';

export function SignatureSettings() {
  const { user, updateUser } = useAuth();

  const [newSig, setNewSig]     = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.auth.updateSignature(newSig);
      updateUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      setNewSig(null);
    } catch {
      alert('บันทึกลายเซ็นล้มเหลว กรุณาลองใหม่');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('ยืนยันลบลายเซ็นที่บันทึกไว้?')) return;
    setSaving(true);
    try {
      const updated = await api.auth.updateSignature(null);
      updateUser(updated);
      setNewSig(null);
    } catch {
      alert('ลบลายเซ็นล้มเหลว');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <PenLine className="w-6 h-6 text-blue-600" /> ตั้งค่าลายเซ็น
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          ลายเซ็นที่ตั้งค่าไว้จะถูกใช้โดยอัตโนมัติเมื่อสร้างรายการเบิกจ่าย
        </p>
      </div>

      {/* Current saved signature */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
          ลายเซ็นที่บันทึกไว้
        </h2>
        {user?.signature ? (
          <div className="space-y-3">
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 flex items-center justify-center min-h-[100px]">
              <img src={user.signature} alt="ลายเซ็น" className="max-h-24 object-contain" />
            </div>
            <button onClick={handleRemove} disabled={saving}
              className="text-xs text-red-500 hover:text-red-700 font-semibold disabled:opacity-50">
              ลบลายเซ็นที่บันทึกไว้
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-400 italic">ยังไม่ได้ตั้งค่าลายเซ็น</p>
        )}
      </div>

      {/* Draw new signature */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
          {user?.signature ? 'วาดลายเซ็นใหม่' : 'วาดลายเซ็นของคุณ'}
        </h2>

        <SignatureCanvas
          onChange={setNewSig}
          width={480}
          height={150}
        />

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !newSig}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed shadow shadow-blue-200 transition-colors"
          >
            {saving ? (
              <>กำลังบันทึก...</>
            ) : saved ? (
              <><CheckCircle2 className="w-4 h-4" /> บันทึกแล้ว!</>
            ) : (
              <><Save className="w-4 h-4" /> บันทึกลายเซ็น</>
            )}
          </button>
          <p className="text-xs text-slate-400">วาดลายเซ็นก่อนจึงจะบันทึกได้</p>
        </div>
      </div>
    </div>
  );
}
