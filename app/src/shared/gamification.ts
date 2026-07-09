/**
 * Gamification system — points and badges for catechumens.
 */
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
  condition: string; // human-readable
}

export const BADGES: Badge[] = [
  { id: 'perfect_attendance_5', name: 'Presença Perfeita', description: '5 encontros seguidos sem falta', icon: 'P5', condition: '5 consecutive attendances' },
  { id: 'perfect_attendance_10', name: 'Fiel', description: '10 encontros seguidos sem falta', icon: 'F10', condition: '10 consecutive attendances' },
  { id: 'quiz_champion', name: 'Quiz Campeão', description: 'Acertou todas as perguntas de um quiz', icon: 'Q', condition: '100% on a quiz' },
  { id: 'bible_reader', name: 'Leitor da Bíblia', description: 'Leu 10 passagens bíblicas', icon: 'B', condition: 'Read 10 Bible passages' },
  { id: 'first_communion', name: 'Primeira Eucaristia', description: 'Completou a preparação para a Primeira Eucaristia', icon: 'E', condition: 'Completed First Communion prep' },
  { id: 'helper', name: 'Ajudante', description: 'Ajudou em 3 dinâmicas de grupo', icon: 'A', condition: 'Helped in 3 group dynamics' },
];

/**
 * Calculate catechumen points based on attendance and activities.
 */
export function calculatePoints(stats: {
  totalPresent: number;
  totalMeetings: number;
  quizzesCompleted: number;
  quizzesPerfect: number;
}): number {
  let points = 0;
  points += stats.totalPresent * 10; // 10 points per attendance
  points += stats.quizzesCompleted * 5; // 5 points per quiz done
  points += stats.quizzesPerfect * 20; // 20 bonus for perfect quizzes
  if (stats.totalMeetings > 0 && stats.totalPresent / stats.totalMeetings >= 0.9) {
    points += 50; // 90%+ attendance bonus
  }
  return points;
}
