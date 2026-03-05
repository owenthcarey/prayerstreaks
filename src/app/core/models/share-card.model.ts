export type ShareCardType = 'daily' | 'milestone' | 'weekly' | 'monthly';
export type ShareCardFormat = 'story' | 'feed';
export type ShareCardTheme = 'ocean' | 'sunset' | 'forest' | 'royal';

export interface ShareCardGradient {
  id: ShareCardTheme;
  label: string;
  color1: string;
  color2: string;
}

export const SHARE_CARD_GRADIENTS: ShareCardGradient[] = [
  { id: 'ocean', label: 'Ocean', color1: '#2563eb', color2: '#93c5fd' },
  { id: 'sunset', label: 'Sunset', color1: '#ea580c', color2: '#fbbf24' },
  { id: 'forest', label: 'Forest', color1: '#059669', color2: '#6ee7b7' },
  { id: 'royal', label: 'Royal', color1: '#7c3aed', color2: '#c4b5fd' },
];

export const SHARE_CARD_TYPE_LABELS: Record<ShareCardType, string> = {
  daily: 'Daily',
  milestone: 'Milestone',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

export const MILESTONE_QUOTES: Record<string, string> = {
  'first-steps': 'Every journey begins with a single step of faith.',
  'one-week': 'Consistency is the seed of transformation.',
  'fortnight': 'Two weeks of devotion — your faith is taking root.',
  'monthly': 'A month of prayer, a heart transformed.',
  'steadfast': 'Steadfast in prayer, steadfast in spirit.',
  'quarter': 'Ninety days of faithful prayer — a season of grace.',
  'half-year': 'Half a year of devotion — a beautiful commitment.',
  'year': 'A year of prayer — your faithfulness inspires.',
};

export interface DailyCardData {
  type: 'daily';
  currentStreak: number;
  prayerType?: string;
}

export interface MilestoneCardData {
  type: 'milestone';
  title: string;
  days: number;
  quote: string;
}

export interface WeeklyDayData {
  dayLabel: string;
  checked: boolean;
  shielded: boolean;
}

export interface WeeklyCardData {
  type: 'weekly';
  days: WeeklyDayData[];
  totalPrayers: number;
}

export interface MonthlyCardData {
  type: 'monthly';
  monthLabel: string;
  year: number;
  daysInMonth: number;
  firstDayOfWeek: number;
  checkedDays: number[];
  shieldedDays: number[];
  totalPrayed: number;
  currentStreak: number;
}

export type ShareCardData =
  | DailyCardData
  | MilestoneCardData
  | WeeklyCardData
  | MonthlyCardData;
