export type KPI = {
  income: number;
  ordersCount: number;
  avgTicket: number;
  debtTotal: number;
};

export type TimeseriesPoint = {
  date: string;
  amount: number;
};

export type TopTeacher = { teacherName: string; income: number };
export type TopSubject = { subjectName: string; income: number };

export type DeferredItem = {
  subjectId: number | null;
  subjectName: string;
  remainingHours: number;
  value: number;
};

export type RefundPoint = { date: string; amount: number };
