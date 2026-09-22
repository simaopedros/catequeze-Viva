export type CatechumenListItem = {
  id: string;
  name: string;
  className?: string;
  familyName?: string;
  initials: string;
};

export function asCatechumenRows(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object' && Array.isArray((payload as { items?: unknown[] }).items)) {
    return (payload as { items: any[] }).items;
  }
  return [];
}

export function catechumenDisplayName(row: any): string {
  const full = [row?.firstName, row?.lastName].filter(Boolean).join(' ').trim();
  return full || row?.displayName || row?.name || 'Catequizando';
}

export function catechumenClassName(row: any): string | undefined {
  const fromEnrollment = row?.enrollments?.find((e: any) => e?.class?.name)?.class?.name;
  return fromEnrollment || row?.class?.name || row?.className || undefined;
}

export function catechumenFamilyName(row: any): string | undefined {
  return row?.household?.name || row?.familyName || undefined;
}

export function catechumenInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

export function mapCatechumenListItem(row: any): CatechumenListItem {
  const name = catechumenDisplayName(row);
  return {
    id: String(row.id),
    name,
    className: catechumenClassName(row),
    familyName: catechumenFamilyName(row),
    initials: catechumenInitials(name),
  };
}

export function filterCatechumensByQuery(rows: CatechumenListItem[], query: string): CatechumenListItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => {
    const haystack = [row.name, row.className, row.familyName].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(q);
  });
}

export type CatechumenEnrollmentView = {
  classId: string;
  className: string;
  stageName?: string;
};

export type CatechumenGuardianView = {
  id: string;
  name: string;
  email?: string;
};

export type CatechumenJourneyView = {
  id: string;
  name: string;
  milestoneCount: number;
};

export type CatechumenDetailView = {
  id: string;
  name: string;
  initials: string;
  email?: string;
  birthDateLabel?: string;
  ageYears?: number;
  parishName?: string;
  householdId?: string;
  householdName?: string;
  householdPhone?: string;
  guardians: CatechumenGuardianView[];
  enrollments: CatechumenEnrollmentView[];
  journeys: CatechumenJourneyView[];
  documentCount: number;
};

export function formatBirthDate(birthDate?: string | Date | null): { label?: string; ageYears?: number } {
  if (!birthDate) return {};
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return {};
  const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const today = new Date();
  let ageYears = today.getFullYear() - d.getFullYear();
  const monthDiff = today.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d.getDate())) {
    ageYears -= 1;
  }
  return { label, ageYears: ageYears >= 0 ? ageYears : undefined };
}

function guardianName(guardian: any): string {
  const user = guardian?.user;
  const fromUser = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  if (fromUser) return fromUser;
  return guardian?.name || 'Responsável';
}

export function mapCatechumenDetail(profile: any): CatechumenDetailView | null {
  if (!profile?.id) return null;
  const name = catechumenDisplayName(profile);
  const birth = formatBirthDate(profile.birthDate);
  const enrollments: CatechumenEnrollmentView[] = (profile.enrollments || [])
    .map((enrollment: any) => {
      const classId = enrollment?.class?.id;
      const className = enrollment?.class?.name;
      if (!classId || !className) return null;
      return {
        classId: String(classId),
        className: String(className),
        stageName: enrollment?.class?.stage?.name || undefined,
      };
    })
    .filter(Boolean) as CatechumenEnrollmentView[];

  const guardians: CatechumenGuardianView[] = (profile.household?.guardians || []).map((guardian: any) => ({
    id: String(guardian.id),
    name: guardianName(guardian),
    email: guardian?.user?.email || guardian?.email || undefined,
  }));

  const journeys: CatechumenJourneyView[] = (profile.sacramentalJourneys || [])
    .map((journey: any) => ({
      id: String(journey.id),
      name: journey?.template?.name || 'Jornada sacramental',
      milestoneCount: Array.isArray(journey.milestones) ? journey.milestones.length : 0,
    }))
    .filter((j: CatechumenJourneyView) => Boolean(j.id));

  return {
    id: String(profile.id),
    name,
    initials: catechumenInitials(name),
    email: profile.email || undefined,
    birthDateLabel: birth.label,
    ageYears: birth.ageYears,
    parishName: profile.parish?.name || undefined,
    householdId: profile.household?.id ? String(profile.household.id) : undefined,
    householdName: profile.household?.name || undefined,
    householdPhone: profile.household?.phone || undefined,
    guardians,
    enrollments,
    journeys,
    documentCount: Array.isArray(profile.documents) ? profile.documents.length : 0,
  };
}
