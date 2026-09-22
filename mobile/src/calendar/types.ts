export type CalendarItem = {
  kind: 'meeting' | 'liturgy';
  id: string;
  title: string;
  date: string;
  meetingId?: string;
  classId?: string;
  className?: string | null;
  theme?: string | null;
  description?: string | null;
  clickable?: boolean;
  editable?: boolean;
};
