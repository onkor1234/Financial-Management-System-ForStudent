import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { LayoutDashboard, Users, Receipt, FileText, LogOut, LogIn, Menu, X, Database, Wallet, UserCog, Pencil, PenLine, ScrollText } from 'lucide-react';
import { useState, useRef } from 'react';

export function Layout() {
  const { user, logout, updateUser } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navGroups = [
    {
      label: 'ภาพรวม',
      items: [
        { name: 'แดชบอร์ด',            href: '/',            icon: LayoutDashboard, color: 'text-sky-400',     activeBg: 'bg-sky-500/15',     activeText: 'text-sky-300',     activeBorder: 'border-sky-500/30' },
      ],
    },
    {
      label: 'การเงิน',
      items: [
        { name: 'รายการเรียกเก็บเงิน', href: '/payments',    icon: Receipt,         color: 'text-emerald-400', activeBg: 'bg-emerald-500/15', activeText: 'text-emerald-300', activeBorder: 'border-emerald-500/30' },
        { name: 'รายการเบิกจ่าย',      href: '/expenses',    icon: FileText,        color: 'text-amber-400',   activeBg: 'bg-amber-500/15',   activeText: 'text-amber-300',   activeBorder: 'border-amber-500/30' },
        { name: 'งบประมาณระบบ',        href: '/budget',      icon: Wallet,          color: 'text-violet-400',  activeBg: 'bg-violet-500/15',  activeText: 'text-violet-300',  activeBorder: 'border-violet-500/30' },
      ],
    },
    {
      label: 'ข้อมูลหลัก',
      items: [
        { name: 'รายชื่อนักศึกษา',     href: '/students',    icon: Users,           color: 'text-rose-400',    activeBg: 'bg-rose-500/15',    activeText: 'text-rose-300',    activeBorder: 'border-rose-500/30' },
        { name: 'Master Data',          href: '/master-data', icon: Database,        color: 'text-cyan-400',    activeBg: 'bg-cyan-500/15',    activeText: 'text-cyan-300',    activeBorder: 'border-cyan-500/30' },
      ],
    },
    {
      label: 'ตั้งค่าระบบ',
      items: [
        { name: 'จัดการสมาชิก',        href: '/users',       icon: UserCog,         color: 'text-orange-400',  activeBg: 'bg-orange-500/15',  activeText: 'text-orange-300',  activeBorder: 'border-orange-500/30' },
        { name: 'ตั้งค่าลายเซ็น',      href: '/signature',   icon: PenLine,         color: 'text-teal-400',    activeBg: 'bg-teal-500/15',    activeText: 'text-teal-300',    activeBorder: 'border-teal-500/30' },
        { name: 'บันทึกการใช้งาน',     href: '/audit-log',   icon: ScrollText,      color: 'text-fuchsia-400', activeBg: 'bg-fuchsia-500/15', activeText: 'text-fuchsia-300', activeBorder: 'border-fuchsia-500/30' },
      ],
    },
  ];

  const defaultOpPages = ['/', '/payments', '/expenses', '/signature'];
  // Legacy paths that grant access to /master-data for existing users
  const masterDataLegacy = ['/sections', '/majors'];

  const canAccess = (href: string): boolean => {
    // Audit log is admin-only, regardless of allowed_pages.
    if (href === '/audit-log') return user?.role === 'admin';
    if (!user?.allowed_pages || user.allowed_pages.length === 0) return true;
    if (href === '/signature') return true; // always accessible
    if (href === '/master-data') {
      return user.allowed_pages.includes('/master-data') ||
             masterDataLegacy.some(p => user.allowed_pages!.includes(p));
    }
    return user.allowed_pages.includes(href);
  };

  const itemVisible = (href: string): boolean => {
    if (!user) return href === '/';
    if (user.allowed_pages && user.allowed_pages.length > 0) return canAccess(href);
    return user.role === 'admin' || defaultOpPages.includes(href);
  };

  // Filter each group's items by visibility, then drop empty groups.
  const navigation = navGroups
    .map(group => ({ ...group, items: group.items.filter(item => itemVisible(item.href)) }))
    .filter(group => group.items.length > 0);

  const showSidebar = !!user;

  const displayName = user ? (user.name?.trim() || user.username) : '';
  const initials = displayName.slice(0, 2).toUpperCase();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSaveImage() {
    if (!imagePreview) return;
    setUploading(true);
    try {
      const updated = await api.auth.updateProfileImage(imagePreview);
      updateUser(updated);
      setShowImageModal(false);
      setImagePreview(null);
    } catch {
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveImage() {
    setUploading(true);
    try {
      const updated = await api.auth.updateProfileImage(null);
      updateUser(updated);
      setShowImageModal(false);
      setImagePreview(null);
    } catch {
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] font-sans text-slate-800 flex flex-col md:flex-row overflow-hidden">
      {/* Mobile sidebar toggle (Only show if sidebar should be shown) */}
      {showSidebar && (
        <div className="md:hidden fixed top-0 left-0 p-4 z-50">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-white rounded-md shadow-sm">
            {isSidebarOpen ? <X className="h-6 w-6 text-slate-600" /> : <Menu className="h-6 w-6 text-slate-600" />}
          </button>
        </div>
      )}

      {/* Sidebar - Only render if user is logged in */}
      {showSidebar && (
        <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0f172a] text-white transform transition-transform duration-200 ease-in-out md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:static md:flex-shrink-0 flex flex-col`}>
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center gap-3 mb-2">
                <img src="/favicon.svg" alt="CMRU FinancePro Logo" className="w-9 h-9 flex-shrink-0" />
                <h1 className="text-xl font-bold tracking-tight text-blue-400 leading-tight">
                  CMRU Finance<span className="text-white">Pro</span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">คณะวิทยาศาสตร์และเทคโนโลยี</p>
            </div>
            <div className="flex-1 flex flex-col overflow-y-auto w-full pt-5 pb-4">
              <nav className="flex-1 px-4 space-y-6">
                {navigation.map((group) => (
                  <div key={group.label} className="space-y-1.5">
                    <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      {group.label}
                    </p>
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.href;
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          onClick={() => setIsSidebarOpen(false)}
                          className={`group flex items-center p-3 rounded-lg transition-colors ${
                            isActive
                              ? `${item.activeBg} ${item.activeText} border ${item.activeBorder}`
                              : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                          }`}
                        >
                          <item.icon
                            className={`mr-3 flex-shrink-0 h-5 w-5 transition-transform group-hover:scale-110 ${item.color}`}
                            aria-hidden="true"
                          />
                          <span className="font-medium">{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </nav>
              {/* User Section for Sidebar */}
              <div className="p-6 bg-slate-900 mt-auto">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    {/* Avatar with edit overlay */}
                    <button
                      onClick={() => { setImagePreview(null); setShowImageModal(true); }}
                      className="relative w-10 h-10 rounded-full flex-shrink-0 group"
                      title="เปลี่ยนรูปโปรไฟล์"
                    >
                      {user.profile_image ? (
                        <img
                          src={user.profile_image}
                          alt={displayName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold uppercase">
                          {initials}
                        </div>
                      )}
                      <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Pencil className="h-4 w-4 text-white" />
                      </div>
                    </button>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{displayName}</p>
                      <p className="text-[10px] text-slate-500 capitalize">
                        {user.role === 'admin'
                          ? 'บทบาท: ผู้ดูแลระบบ'
                          : (user.department_name || 'ฝ่ายปฏิบัติการ')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    className="flex w-full items-center justify-center space-x-2 px-4 py-2 border border-slate-700 shadow-sm text-xs font-bold rounded-md text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>ออกจากระบบ</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content wrapper */}
      <div className="flex flex-col flex-1 w-full h-screen overflow-hidden">
        {/* Top Header - different based on login state */}
        {!showSidebar ? (
          // Public Top Header
          <header className="h-16 bg-white border-b border-slate-200 px-6 sm:px-8 flex items-center justify-between shadow-sm z-10 w-full flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <img src="/favicon.svg" alt="Logo" className="w-8 h-8 flex-shrink-0" />
              <h1 className="text-xl font-bold tracking-tight text-blue-600">CMRU Finance<span className="text-slate-800">Pro</span></h1>
            </div>
            {location.pathname !== '/login' && (
              <Link
                to="/login"
                className="hidden sm:flex items-center space-x-2 px-4 py-2 border border-blue-200 shadow-sm text-sm font-bold rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <LogIn className="h-4 w-4" />
                <span>เข้าสู่ระบบ</span>
              </Link>
            )}
            {/* Mobile login button (icon only) */}
            {location.pathname !== '/login' && (
              <Link
                to="/login"
                className="flex sm:hidden items-center justify-center w-10 h-10 border border-blue-200 shadow-sm rounded-md text-blue-600 bg-blue-50"
              >
                <LogIn className="h-5 w-5" />
              </Link>
            )}
          </header>
        ) : (
          // Internal Admin Top Header
          <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between hidden md:flex flex-shrink-0">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center">
              <span className="text-slate-400 mr-2 font-normal">ระบบบริหารจัดการงบประมาณ </span>
            </h2>
          </header>
        )}

        {/* Scrollable Main content area */}
        <main className={`flex-1 overflow-y-auto focus:outline-none ${!showSidebar ? 'bg-[#f8fafc]' : ''}`}>
          <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile backdrop */}
      {isSidebarOpen && showSidebar && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/10 backdrop-blur-sm transition-opacity md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Profile Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/10 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-80 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800">เปลี่ยนรูปโปรไฟล์</h3>
              <button onClick={() => { setShowImageModal(false); setImagePreview(null); }} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Preview */}
            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center">
                {imagePreview ? (
                  <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                ) : user?.profile_image ? (
                  <img src={user.profile_image} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-slate-500 uppercase">{initials}</span>
                )}
              </div>
            </div>

            {/* File input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full mb-2 px-4 py-2 text-sm font-semibold border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
            >
              เลือกรูปภาพ
            </button>

            <button
              onClick={handleSaveImage}
              disabled={!imagePreview || uploading}
              className="w-full mb-2 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>

            {user?.profile_image && (
              <button
                onClick={handleRemoveImage}
                disabled={uploading}
                className="w-full px-4 py-2 text-sm font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-40 transition-colors"
              >
                ลบรูปโปรไฟล์
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
