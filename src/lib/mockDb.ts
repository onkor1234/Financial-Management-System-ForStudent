// Mock Database mimicking the MySQL structure
import { format } from "date-fns";

export type Role = 'admin' | 'operation' | 'public';

export interface User {
  id: number;
  username: string;
  role: Role;
  allowedPages?: string[];
}

export interface Student {
  id: number;
  student_id: string;
  first_name: string;
  last_name: string;
  section: string;
  major: string;
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
  created_by: number;
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

export interface ExpenseRequest {
  id: number;
  title: string;
  total_amount: number;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  created_by: number;
  approved_by: number | null;
  created_at: string;
}

export interface ExpenseItem {
  id: number;
  expense_request_id: number;
  item_name: string;
  price: number;
}

export interface BudgetAddition {
  id: number;
  amount: number;
  description: string;
  created_by: number;
  created_at: string;
}

class MockDB {
  public users: User[] = [
    { id: 1, username: 'admin', role: 'admin' },
    { id: 2, username: 'op1', role: 'operation' },
  ];

  public sections: Section[] = [
    { id: 1, name: 'Sec 1' },
    { id: 2, name: 'Sec 2' },
  ];

  public majors: Major[] = [
    { id: 1, name: 'CS' },
    { id: 2, name: 'IT' },
  ];

  public students: Student[] = [
    { id: 1, student_id: '650001', first_name: 'Somchai', last_name: 'Jaidee', section: 'Sec 1', major: 'CS' },
    { id: 2, student_id: '650002', first_name: 'Somsri', last_name: 'Meechai', section: 'Sec 1', major: 'CS' },
    { id: 3, student_id: '650003', first_name: 'Mana', last_name: 'Rakdee', section: 'Sec 2', major: 'IT' },
  ];

  public payment_requests: PaymentRequest[] = [
    { id: 1, title: 'เก็บเงินค่าเสื้อคณะ', target_sections: ['Sec 1'], amount_per_person: 250, created_by: 2, created_at: new Date().toISOString() },
  ];

  public payments: Payment[] = [
    { id: 1, request_id: 1, student_id: 1, is_paid: true, receipt_image: null, paid_at: new Date().toISOString() },
    { id: 2, request_id: 1, student_id: 2, is_paid: false, receipt_image: null, paid_at: null },
  ];

  public expense_requests: ExpenseRequest[] = [
    { id: 1, title: 'ขอเบิกค่าจัดซุ้มรับน้อง', total_amount: 1500, description: 'ซื้ออุปกรณ์สำหรับประดับซุ้ม', status: 'pending', created_by: 2, approved_by: null, created_at: new Date().toISOString() },
    { id: 2, title: 'ขอเบิกค่าอาหารว่าง', total_amount: 500, description: 'อาหารว่างสำหรับงานปฐมนิเทศ', status: 'approved', created_by: 2, approved_by: 1, created_at: new Date().toISOString() },
  ];

  public expense_items: ExpenseItem[] = [
    { id: 1, expense_request_id: 1, item_name: 'กระดาษสี', price: 500 },
    { id: 2, expense_request_id: 1, item_name: 'กาว/กรรไกร', price: 200 },
    { id: 3, expense_request_id: 1, item_name: 'โครงเหล็ก', price: 800 },
    { id: 4, expense_request_id: 2, item_name: 'ขนมปัง 50 ชิ้น', price: 500 },
  ];

  public budget_additions: BudgetAddition[] = [
    { id: 1, amount: 5000, description: 'เงินสนับสนุนจากคณะ', created_by: 1, created_at: new Date().toISOString() }
  ];

  // Helper to get total budget (Paid payments + Budget Additions - Approved expenses)
  getTotalBudget(): number {
    const totalCollected = this.payments
      .filter(p => p.is_paid)
      .reduce((sum, p) => {
        const req = this.payment_requests.find(r => r.id === p.request_id);
        return sum + (req?.amount_per_person || 0);
      }, 0);

    const totalBudgetAdded = this.budget_additions.reduce((sum, b) => sum + b.amount, 0);

    const totalSpent = this.expense_requests
      .filter(e => e.status === 'approved')
      .reduce((sum, e) => sum + e.total_amount, 0);

    return totalCollected + totalBudgetAdded - totalSpent;
  }
}

// In-memory instance to persist across route changes locally
export const db = new MockDB();
