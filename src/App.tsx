/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Students } from './pages/Students';
import { Sections } from './pages/Sections';
import { Majors } from './pages/Majors';
import { Budget } from './pages/Budget';
import { PaymentRequests } from './pages/PaymentRequests';
import { ExpenseRequests } from './pages/ExpenseRequests';

import { ManageUsers } from './pages/ManageUsers';
import { MasterData } from './pages/MasterData';
import { PublicPaymentStatus } from './pages/PublicPaymentStatus';
import { SignatureSettings } from './pages/SignatureSettings';
import { AuditLog } from './pages/AuditLog';
import { api } from './lib/api';

// Protected Route Component
function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode, requiredRole?: 'admin' | 'operation' }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <svg className="animate-spin h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span className="text-sm font-medium">กำลังตรวจสอบสิทธิ์...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ถ้า user มี allowed_pages กำหนดไว้ → ใช้เป็น source of truth ไม่สนใจ requiredRole
  if (user.allowed_pages && user.allowed_pages.length > 0) {
    const path = location.pathname;
    // /signature is always accessible to all logged-in users
    if (path === '/signature') return <>{children}</>;
    // /audit-log is gated by admin role, independent of allowed_pages
    if (path === '/audit-log') {
      return user.role === 'admin' ? <>{children}</> : <Navigate to="/" replace />;
    }
    // backward compat: /master-data is accessible if user had /sections or /majors
    const allowed = user.allowed_pages.includes(path) ||
      (path === '/master-data' && (
        user.allowed_pages.includes('/sections') || user.allowed_pages.includes('/majors')
      ));
    if (!allowed) {
      return <Navigate to="/" replace />;
    }
    return <>{children}</>;
  }

  // fallback: ไม่มี allowed_pages → ใช้ role-based check
  if (requiredRole && user.role !== 'admin' && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Record one website visit per full page load (guarded against StrictMode double-mount).
let visitRecorded = false;

export default function App() {
  React.useEffect(() => {
    if (visitRecorded) return;
    visitRecorded = true;
    api.visits.record(window.location.pathname).catch(() => { /* non-critical */ });
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public shareable payment-status page (no auth, no sidebar) */}
          <Route path="/share/payment/:id" element={<PublicPaymentStatus />} />

          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="login" element={<Login />} />
            <Route
              path="master-data"
              element={
                <ProtectedRoute requiredRole="admin">
                  <MasterData />
                </ProtectedRoute>
              }
            />
            <Route
              path="sections"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Sections />
                </ProtectedRoute>
              }
            />
            <Route
              path="majors"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Majors />
                </ProtectedRoute>
              }
            />
            <Route 
              path="budget" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <Budget />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="users" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <ManageUsers />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="students" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <Students />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="payments" 
              element={
                <ProtectedRoute>
                  <PaymentRequests />
                </ProtectedRoute>
              } 
            />
            <Route
              path="expenses"
              element={
                <ProtectedRoute>
                  <ExpenseRequests />
                </ProtectedRoute>
              }
            />
            <Route
              path="signature"
              element={
                <ProtectedRoute>
                  <SignatureSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="audit-log"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AuditLog />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
