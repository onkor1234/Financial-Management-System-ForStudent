// ─── Types ────────────────────────────────────────────────────────────────────

export type Role = 'admin' | 'operation';

export interface User {
  id: number;
  username: string;
  name: string;
  student_id: string | null;
  role: Role;
  allowed_pages?: string[];
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
  payment: { is_paid: boolean } | null;
}

export interface PublicPaymentStatusDetails extends PaymentRequest {
  student_payments: PublicStudentPaymentStatus[];
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
}

export interface ExpenseItem {
  id: number;
  expense_request_id: number;
  item_name: string;
  price: number;
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
      items: { name: string; price: number }[];
    }) => request<ExpenseRequest>('POST', '/expense_requests.php', data),

    updateStatus: (id: number, status: 'approved' | 'rejected') =>
      request<ExpenseRequest>('PATCH', `/expense_requests.php?id=${id}`, { status }),
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
  },
};
