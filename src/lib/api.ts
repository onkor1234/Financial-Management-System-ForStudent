export function formatMoney(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type Role = 'admin' | 'operation';

export interface User {
  id: number;
  username: string;
  name: string;
  student_id: string | null;
  role: Role;
  allowed_pages?: string[];
  profile_image?: string | null;
  department_id?: number | null;
  department_name?: string | null;
  signature?: string | null;
  can_approve_expenses?: boolean;
}

export interface Department {
  id: number;
  name: string;
}

export interface Student {
  id: number;
  student_id: string;
  first_name: string;
  last_name: string;
  section: string;
  major: string;
  section_id?: number | null;
  major_id?: number | null;
}

export interface Section {
  id: number;
  name: string;
}

export interface Major {
  id: number;
  name: string;
}

export interface PaymentRequest {
  id: number;
  title: string;
  target_sections: string[];
  amount_per_person: number;
  created_by: number | null;
  created_at: string;
}

export interface Payment {
  id: number;
  request_id: number;
  student_id: number;
  is_paid: boolean;
  receipt_image: string | null;
  paid_at: string | null;
}

export interface StudentPayment {
  student: Student;
  payment: Payment | null;
}

export interface PaymentRequestWithDetails extends PaymentRequest {
  student_payments: StudentPayment[];
}

export interface PublicStudentPaymentStatus {
  student: Pick<Student, 'id' | 'student_id' | 'first_name' | 'last_name' | 'section'>;
  payment: {
    is_paid: boolean;
    receipt_image: string | null;
    paid_at: string | null;
  } | null;
}

export interface PaymentStatusTotals {
  total_count: number;
  paid_count: number;
  unpaid_count: number;
  paid_amount: number;
  expected_amount: number;
}

export interface PublicPaymentStatusDetails extends PaymentRequest {
  student_payments: PublicStudentPaymentStatus[];
  totals: PaymentStatusTotals;
}

export interface ExpenseRequest {
  id: number;
  title: string;
  total_amount: number;
  description: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_by: number | null;
  approved_by: number | null;
  created_at: string;
  approved_at?: string | null;
  requester_name?: string | null;
  requester_signature?: string | null;
  creator_name?: string | null;
  creator_dept?: string | null;
  approver_name?: string | null;
  approver_dept?: string | null;
  approver_signature?: string | null;
}

export interface ExpenseItem {
  id: number;
  expense_request_id: number;
  item_name: string;
  price: number;
  quantity: number;
}

export interface ExpenseRequestWithItems extends ExpenseRequest {
  items: ExpenseItem[];
}

export interface BudgetAddition {
  id: number;
  amount: number;
  description: string;
  created_by: number | null;
  created_at: string;
}

export interface DashboardData {
  totalBudget: number;
  unpaidCount: number;
  pendingExpenseTotal: number;
  pendingExpenseCount: number;
  studentCount: number;
  sectionCount: number;
  recentExpenses: ExpenseRequest[];
  paymentRequests: PaymentRequest[];
  budgetAdditions: BudgetAddition[];
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────

const BASE = '/api';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method,
    credentials: 'include',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let msg = 'Request failed';
    try {
      const err = await res.json();
      msg = err.error || msg;
    } catch {
      // ignore parse error
    }
    throw new Error(msg);
  }

  return res.json() as Promise<T>;
}

// ─── API service ─────────────────────────────────────────────────────────────

export const api = {
  auth: {
    login: (username: string, password: string) =>
      request<User>('POST', '/auth/login.php', { username, password }),

    logout: () =>
      request<{ success: boolean }>('POST', '/auth/logout.php'),

    me: () =>
      request<User | null>('GET', '/auth/me.php'),

    updateProfileImage: (profile_image: string | null) =>
      request<User>('PUT', '/profile.php', { profile_image }),

    updateSignature: (signature: string | null) =>
      request<User>('PUT', '/profile.php', { signature }),
  },

  users: {
    list: () =>
      request<User[]>('GET', '/users.php'),

    create: (data: {
      username: string;
      password: string;
      name: string;
      student_id?: string;
      role: Role;
      allowed_pages?: string[];
      department_id?: number | null;
      can_approve_expenses?: boolean;
    }) => request<User>('POST', '/users.php', data),

    update: (
      id: number,
      data: {
        username?: string;
        password?: string;
        name?: string;
        student_id?: string | null;
        role?: Role;
        allowed_pages?: string[];
        department_id?: number | null;
        can_approve_expenses?: boolean;
      }
    ) => request<User>('PUT', `/users.php?id=${id}`, data),

    delete: (id: number) =>
      request<{ success: boolean }>('DELETE', `/users.php?id=${id}`),
  },

  sections: {
    list: () => request<Section[]>('GET', '/sections.php'),
    create: (name: string) => request<Section>('POST', '/sections.php', { name }),
    update: (id: number, name: string) => request<Section>('PUT', `/sections.php?id=${id}`, { name }),
    delete: (id: number) => request<{ success: boolean }>('DELETE', `/sections.php?id=${id}`),
  },

  majors: {
    list: () => request<Major[]>('GET', '/majors.php'),
    create: (name: string) => request<Major>('POST', '/majors.php', { name }),
    update: (id: number, name: string) => request<Major>('PUT', `/majors.php?id=${id}`, { name }),
    delete: (id: number) => request<{ success: boolean }>('DELETE', `/majors.php?id=${id}`),
  },

  departments: {
    list: () => request<Department[]>('GET', '/departments.php'),
    create: (name: string) => request<Department>('POST', '/departments.php', { name }),
    update: (id: number, name: string) => request<Department>('PUT', `/departments.php?id=${id}`, { name }),
    delete: (id: number) => request<{ success: boolean }>('DELETE', `/departments.php?id=${id}`),
  },

  students: {
    list: () => request<Student[]>('GET', '/students.php'),

    create: (data: {
      student_id: string;
      first_name: string;
      last_name: string;
      section: string;
      major: string;
    }) => request<Student>('POST', '/students.php', data),

    update: (
      id: number,
      data: {
        student_id: string;
        first_name: string;
        last_name: string;
        section: string;
        major: string;
      }
    ) => request<Student>('PUT', `/students.php?id=${id}`, data),

    delete: (id: number) =>
      request<{ success: boolean }>('DELETE', `/students.php?id=${id}`),
  },

  paymentRequests: {
    list: () => request<PaymentRequest[]>('GET', '/payment_requests.php'),

    getDetails: (id: number) =>
      request<PaymentRequestWithDetails>('GET', `/payment_requests.php?id=${id}`),

    create: (data: {
      title: string;
      target_sections: string[];
      amount_per_person: number;
    }) => request<PaymentRequest>('POST', '/payment_requests.php', data),

    delete: (id: number) =>
      request<{ success: boolean }>('DELETE', `/payment_requests.php?id=${id}`),
  },

  payments: {
    update: (
      id: number | undefined,
      data: {
        is_paid?: boolean;
        receipt_image?: string | null;
        request_id?: number;
        student_id?: number;
      }
    ) => request<Payment>('PATCH', id ? `/payments.php?id=${id}` : '/payments.php', data),
  },

  expenseRequests: {
    list: () => request<ExpenseRequest[]>('GET', '/expense_requests.php'),

    getDetails: (id: number) =>
      request<ExpenseRequestWithItems>('GET', `/expense_requests.php?id=${id}`),

    create: (data: {
      title: string;
      description?: string;
      items: { name: string; price: number; quantity: number }[];
      requester_name?: string;
      requester_signature?: string | null;
    }) => request<ExpenseRequest>('POST', '/expense_requests.php', data),

    update: (id: number, data: {
      title: string;
      description?: string;
      items: { name: string; price: number; quantity: number }[];
    }) => request<ExpenseRequest>('PUT', `/expense_requests.php?id=${id}`, data),

    delete: (id: number) =>
      request<{ success: boolean }>('DELETE', `/expense_requests.php?id=${id}`),

    updateStatus: (id: number, status: 'approved' | 'rejected') =>
      request<ExpenseRequest>('PATCH', `/expense_requests.php?id=${id}`, { status }),

    updateRequester: (id: number, data: { requester_name?: string; requester_signature?: string | null }) =>
      request<ExpenseRequest>('PATCH', `/expense_requests.php?id=${id}`, { action: 'update_requester', ...data }),
  },

  budget: {
    list: () => request<BudgetAddition[]>('GET', '/budget.php'),

    create: (data: { amount: number; description: string }) =>
      request<BudgetAddition>('POST', '/budget.php', data),
  },

  dashboard: {
    getData: () => request<DashboardData>('GET', '/dashboard.php'),

    getPaymentStatus: (id: number) =>
      request<PublicPaymentStatusDetails>('GET', `/payment_status.php?id=${id}`),

    getPaymentStatusVersion: (id: number) =>
      request<{ version: string; updated_at: number }>(
        'GET',
        `/payment_status_version.php?id=${id}`
      ),
  },
};
