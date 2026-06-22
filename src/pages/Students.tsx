import React, { useState, useEffect, useMemo } from 'react';
import { api, Student, Section, Major } from '../lib/api';
import { Plus, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export function Students() {
  const [students, setStudents]         = useState<Student[]>([]);
  const [sections, setSections]         = useState<Section[]>([]);
  const [majors, setMajors]             = useState<Major[]>([]);
  const [filterSection, setFilterSection] = useState('');
  const [filterMajor, setFilterMajor]   = useState('');
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [loading, setLoading]           = useState(false);

  const [studentId, setStudentId]       = useState('');
  const [firstName, setFirstName]       = useState('');
  const [lastName, setLastName]         = useState('');
  const [section, setSection]           = useState('');
  const [major, setMajor]               = useState('');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [s, sec, maj] = await Promise.all([
        api.students.list(),
        api.sections.list(),
        api.majors.list(),
      ]);
      setStudents(s);
      setSections(sec);
      setMajors(maj);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'โหลดข้อมูลล้มเหลว');
    }
  };

  const handleOpenModal = (student?: Student) => {
    if (student) {
      setEditingStudent(student);
      setStudentId(student.student_id);
      setFirstName(student.first_name);
      setLastName(student.last_name);
      setSection(student.section);
      setMajor(student.major);
    } else {
      setEditingStudent(null);
      setStudentId('');
      setFirstName('');
      setLastName('');
      setSection(sections[0]?.name ?? '');
      setMajor(majors[0]?.name ?? '');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingStudent) {
        await api.students.update(editingStudent.id, { student_id: studentId, first_name: firstName, last_name: lastName, section, major });
      } else {
        await api.students.create({ student_id: studentId, first_name: firstName, last_name: lastName, section, major });
      }
      await loadAll();
      handleCloseModal();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'บันทึกข้อมูลล้มเหลว');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('ยืนยันการลบนักศึกษานี้?')) return;
    try {
      await api.students.delete(id);
      await loadAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ลบข้อมูลล้มเหลว');
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSection = filterSection === '' || s.section === filterSection;
      const matchMajor = filterMajor === '' || s.major === filterMajor;
      return matchSection && matchMajor;
    });
  }, [students, filterSection, filterMajor]);

  const groupedStudents = useMemo(() => {
    const compareStudentId = (a: Student, b: Student) =>
      a.student_id.localeCompare(b.student_id, 'th', { numeric: true, sensitivity: 'base' });

    const majorMap = new Map<string, Map<string, Student[]>>();

    for (const student of filteredStudents) {
      const majorName = student.major || 'ไม่ระบุสาขาวิชา';
      const sectionName = student.section || 'ไม่ระบุกลุ่มเรียน';

      if (!majorMap.has(majorName)) {
        majorMap.set(majorName, new Map<string, Student[]>());
      }
      const sectionMap = majorMap.get(majorName)!;

      if (!sectionMap.has(sectionName)) {
        sectionMap.set(sectionName, []);
      }
      sectionMap.get(sectionName)!.push(student);
    }

    return Array.from(majorMap.entries())
      .sort(([majorA], [majorB]) => majorA.localeCompare(majorB, 'th', { sensitivity: 'base' }))
      .map(([major, sectionMap]) => {
        const sectionGroups = Array.from(sectionMap.entries())
          .sort(([sectionA], [sectionB]) => sectionA.localeCompare(sectionB, 'th', { numeric: true, sensitivity: 'base' }))
          .map(([section, sectionStudents]) => ({
            section,
            students: [...sectionStudents].sort(compareStudentId),
          }));

        const count = sectionGroups.reduce((sum, group) => sum + group.students.length, 0);
        return { major, sectionGroups, count };
      });
  }, [filteredStudents]);

  const exportRows = useMemo(() => {
    return groupedStudents.flatMap(group =>
      group.sectionGroups.flatMap(sectionGroup => sectionGroup.students)
    );
  }, [groupedStudents]);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(exportRows.map(s => ({
      รหัสนักศึกษา: s.student_id,
      ชื่อ: s.first_name,
      นามสกุล: s.last_name,
      กลุ่มเรียน: s.section,
      สาขาวิชา: s.major,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, 'students.xlsx');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">จัดการข้อมูลนักศึกษา</h1>
          <p className="text-sm text-slate-500 mt-1">จำนวนนักศึกษาทั้งหมด {filteredStudents.length} คน</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <select value={filterSection} onChange={e => setFilterSection(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-md text-sm bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">ทุกกลุ่มเรียน</option>
              {sections.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
            <select value={filterMajor} onChange={e => setFilterMajor(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-md text-sm bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">ทุกสาขาวิชา</option>
              {majors.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
            </select>
          </div>
          <div className="h-8 w-px bg-slate-200 hidden sm:block mx-1" />
          <div className="flex space-x-3">
            <button onClick={handleExport}
              className="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-600 rounded-md text-sm font-bold hover:bg-slate-200">
              <Download className="w-4 h-4 mr-2" /> ส่งออก Excel
            </button>
            <button onClick={() => handleOpenModal()}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-blue-600 shadow-blue-200 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> เพิ่มนักศึกษา
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left">
            <thead className="text-xs font-bold text-slate-500 uppercase bg-slate-50">
              <tr>
                <th className="px-6 py-3 border-b border-slate-100">รหัสนักศึกษา</th>
                <th className="px-6 py-3 border-b border-slate-100">ชื่อ-นามสกุล</th>
                <th className="px-6 py-3 border-b border-slate-100">กลุ่มเรียน</th>
                <th className="px-6 py-3 border-b border-slate-100">สาขาวิชา</th>
                <th className="px-6 py-3 border-b border-slate-100 text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-slate-500">ไม่พบข้อมูลนักศึกษา</td></tr>
              ) : groupedStudents.map(group => (
                <React.Fragment key={`major-${group.major}`}>
                  <tr className="bg-slate-100/80">
                    <td colSpan={5} className="px-6 py-3 text-sm font-bold text-slate-800">
                      สาขาวิชา: {group.major}
                      <span className="ml-2 text-xs font-semibold text-slate-500">({group.count} คน)</span>
                    </td>
                  </tr>
                  {group.sectionGroups.map(sectionGroup => (
                    <React.Fragment key={`section-${group.major}-${sectionGroup.section}`}>
                      <tr className="bg-slate-50">
                        <td colSpan={5} className="px-6 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">
                          กลุ่มเรียน: {sectionGroup.section} ({sectionGroup.students.length} คน)
                        </td>
                      </tr>
                      {sectionGroup.students.map(student => (
                        <tr key={student.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 whitespace-nowrap text-slate-900 font-medium">{student.student_id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-700">{student.first_name} {student.last_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-600">{student.section}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-600">{student.major}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                            <button onClick={() => handleOpenModal(student)} className="text-blue-600 hover:text-blue-800 font-bold text-xs mr-3">แก้ไข</button>
                            <button onClick={() => handleDelete(student.id)} className="text-slate-400 hover:text-slate-600 font-bold text-xs">ลบ</button>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-slate-900/10 backdrop-blur-sm" onClick={handleCloseModal} />
            <div className="relative inline-block w-full max-w-md p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-xl border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                {editingStudent ? 'แก้ไขข้อมูลนักศึกษา' : 'เพิ่มนักศึกษาใหม่'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700">รหัสนักศึกษา</label>
                  <input type="text" required value={studentId} onChange={e => setStudentId(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 text-slate-800" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700">ชื่อ</label>
                    <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700">นามสกุล</label>
                    <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 text-slate-800" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700">กลุ่มเรียน</label>
                    <select required value={section} onChange={e => setSection(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-slate-300 bg-white rounded-md shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 text-slate-800">
                      <option value="" disabled>เลือกกลุ่มเรียน</option>
                      {sections.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700">สาขาวิชา</label>
                    <select required value={major} onChange={e => setMajor(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-slate-300 bg-white rounded-md shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 text-slate-800">
                      <option value="" disabled>เลือกสาขาวิชา</option>
                      {majors.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 flex justify-end space-x-3">
                  <button type="button" onClick={handleCloseModal} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-md text-sm font-bold hover:bg-slate-200">ยกเลิก</button>
                  <button type="submit" disabled={loading} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-blue-600 shadow-blue-200 hover:bg-blue-700 disabled:opacity-60">
                    {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
