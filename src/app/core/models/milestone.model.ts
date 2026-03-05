export interface Milestone {
  id: string;
  days: number;
  title: string;
}

export const MILESTONES: Milestone[] = [
  { id: 'first-steps', days: 3, title: 'First Steps' },
  { id: 'one-week', days: 7, title: 'One Week Strong' },
  { id: 'fortnight', days: 14, title: 'Fortnight of Faith' },
  { id: 'monthly', days: 30, title: 'Monthly Devotion' },
  { id: 'steadfast', days: 60, title: 'Steadfast' },
  { id: 'quarter', days: 90, title: 'Quarter of Prayer' },
  { id: 'half-year', days: 180, title: 'Half-Year Faithful' },
  { id: 'year', days: 365, title: 'Year of Prayer' },
];
