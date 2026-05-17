import React, { useState, useEffect } from 'react';
import { db, Student } from '../lib/mockDb';
import { Plus, Edit2, Trash2, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filterSection, setFilterSection] = useState('');
  const [filterMajor, setFilterMajor] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  
  // Form state
  const [studentId, setStudentId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [section, setSection] = useState('');
  const [major, setMajor] = useState('');
  
  const [sections, setSections] = useState(db.sections);
  const [majors, setMajors] = useState(db.majors);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = () => {
    // Clone array to trigger re-renders if needed
    setStudents([...db.students]);
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
      setSection(db.sections[0]?.name || '');
      setMajor(db.majors[0]?.name || '');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStudent) {
      const idx = db.students.findIndex(s => s.id === editingStudent.id);
      if (idx !== -1) {
        db.students[idx] = { ...editingStudent, student_id: studentId, first_name: firstName, last_name: lastName, section, major: major };
      }
    } else {
      const newId = db.students.length > 0 ? Math.max(...db.students.map(s => s.id)) + 1 : 1;
      db.students.push({
        id: newId,
        student_id: studentId,
        first_name: firstName,
        last_name: lastName,
        section,
        major: major
      });
    }
    loadStudents();
    handleCloseModal();
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this student?')) {
      db.students = db.students.filter(s => s.id !== id);
      loadStudents();
    }
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filteredStudents);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "students.xlsx");
  };

  const filteredStudents = students.filter(s => {
    const matchSection = filterSection === '' || s.section === filterSection;
    const matchMajor = filterMajor === '' || s.major === filterMajor;
    return matchSection && matchMajor;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">จัดการข้อมูลนักศึกษา</h1>
          <p className="text-sm text-slate-500 mt-1">จำนวนนักศึกษาทั้งหมด {filteredStudents.length} คน</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <select 
              value={filterSection} 
              onChange={e => setFilterSection(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-md text-sm bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">ทุกกลุ่มเรียน</option>
              {sections.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
            <select 
              value={filterMajor} 
              onChange={e => setFilterMajor(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-md text-sm bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">ทุกสาขาวิชา</option>
              {majors.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
            </select>
          </div>
          <div className="h-8 w-px bg-slate-200 hidden sm:block mx-1"></div>
          <div className="flex space-x-3">
            <button onClick={handleExport} className="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-600 rounded-md text-sm font-bold hover:bg-slate-200">
              <Download className="w-4 h-4 mr-2" /> ส่งออก Excel
            </button>
            <button onClick={() => handleOpenModal()} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-blue-600 shadow-blue-200 hover:bg-blue-700">
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
                ) : filteredStudents.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-900 font-medium">{student.student_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-700">{student.first_name} {student.last_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">{student.section}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">{student.major}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                      <button onClick={() => handleOpenModal(student)} className="text-blue-600 hover:text-blue-800 font-bold text-xs mr-3">
                        แก้ไข
                      </button>
                      <button onClick={() => handleDelete(student.id)} className="text-slate-400 hover:text-slate-600 font-bold text-xs">
                        ลบ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-slate-900 bg-opacity-75" onClick={handleCloseModal} />
            <div className="relative inline-block w-full max-w-md p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-xl border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">{editingStudent ? 'แก้ไขข้อมูลนักศึกษา' : 'เพิ่มนักศึกษาใหม่'}</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700">รหัสนักศึกษา</label>
                  <input type="text" required value={studentId} onChange={e => setStudentId(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 text-slate-800" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700">ชื่อ</label>
                    <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700">นามสกุล</label>
                    <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 text-slate-800" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700">กลุ่มเรียน</label>
                    <select required value={section} onChange={e => setSection(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 bg-white rounded-md shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 text-slate-800">
                      <option value="" disabled>เลือกกลุ่มเรียน</option>
                      {sections.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700">สาขาวิชา</label>
                    <select required value={major} onChange={e => setMajor(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 bg-white rounded-md shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 text-slate-800">
                      <option value="" disabled>เลือกสาขาวิชา</option>
                      {majors.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 flex justify-end space-x-3">
                  <button type="button" onClick={handleCloseModal} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-md text-sm font-bold hover:bg-slate-200">ยกเลิก</button>
                  <button type="submit" className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-blue-600 shadow-blue-200 hover:bg-blue-700">บันทึกข้อมูล</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
