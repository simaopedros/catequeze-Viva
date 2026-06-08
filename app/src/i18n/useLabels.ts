import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';

export function useRoleLabels() {
  const { t } = useTranslation('common');
  return useMemo(
    () => ({
      SUPER_ADMIN: t('roles.SUPER_ADMIN'),
      DIOCESE_ADMIN: t('roles.DIOCESE_ADMIN'),
      PARISH_COORDINATOR: t('roles.PARISH_COORDINATOR'),
      COMMUNITY_COORDINATOR: t('roles.COMMUNITY_COORDINATOR'),
      LEAD_CATECHIST: t('roles.LEAD_CATECHIST'),
      ASSISTANT_CATECHIST: t('roles.ASSISTANT_CATECHIST'),
      GUARDIAN: t('roles.GUARDIAN'),
      CATECHUMEN: t('roles.CATECHUMEN'),
      CONTENT_REVIEWER: t('roles.CONTENT_REVIEWER'),
      PASTORAL_VIEWER: t('roles.PASTORAL_VIEWER'),
      PERSONAL_OWNER: t('roles.PERSONAL_OWNER'),
    }),
    [t],
  );
}

export function useMembershipStatusLabels() {
  const { t } = useTranslation('common');
  return useMemo(
    () => ({
      ACTIVE: { label: t('membership_status.ACTIVE'), color: 'bg-green-100 text-green-700' },
      INVITED: { label: t('membership_status.INVITED'), color: 'bg-yellow-100 text-yellow-700' },
      INACTIVE: { label: t('membership_status.INACTIVE'), color: 'bg-gray-100 text-gray-600' },
    }),
    [t],
  );
}

export function useClassStatusMap() {
  const { t } = useTranslation('common');
  return useMemo(
    () => ({
      ACTIVE: { variant: 'default' as const, label: t('class_status.ACTIVE') },
      DRAFT: { variant: 'secondary' as const, label: t('class_status.DRAFT') },
      PAUSED: { variant: 'outline' as const, label: t('class_status.PAUSED') },
      CONCLUDED: { variant: 'outline' as const, label: t('class_status.CONCLUDED') },
      ARCHIVED: { variant: 'destructive' as const, label: t('class_status.ARCHIVED') },
    }),
    [t],
  );
}

export function useClassFilters() {
  const { t } = useTranslation('common');
  return useMemo(
    () => [
      { label: t('class_filters.all'), status: '' },
      { label: t('class_filters.ACTIVE'), status: 'ACTIVE' },
      { label: t('class_filters.PAUSED'), status: 'PAUSED' },
      { label: t('class_filters.CONCLUDED'), status: 'CONCLUDED' },
      { label: t('class_filters.ARCHIVED'), status: 'ARCHIVED' },
    ],
    [t],
  );
}

export function useCommunityTypeLabels() {
  const { t } = useTranslation('common');
  return useMemo(
    () => ({
      CHAPEL: t('community_types.CHAPEL'),
      RURAL_COMMUNITY: t('community_types.RURAL_COMMUNITY'),
      URBAN_COMMUNITY: t('community_types.URBAN_COMMUNITY'),
      MISSION: t('community_types.MISSION'),
    }),
    [t],
  );
}

export function useCommunityTypeOptions() {
  const { t } = useTranslation('common');
  const labels = useCommunityTypeLabels();
  return useMemo(
    () => [
      { value: '', label: t('select_option') },
      { value: 'CHAPEL', label: labels.CHAPEL },
      { value: 'URBAN_COMMUNITY', label: labels.URBAN_COMMUNITY },
      { value: 'RURAL_COMMUNITY', label: labels.RURAL_COMMUNITY },
      { value: 'MISSION', label: labels.MISSION },
    ],
    [t, labels],
  );
}

export function useContentStatusMap() {
  const { t } = useTranslation('content');
  return useMemo(
    () => ({
      DRAFT: { variant: 'secondary' as const, label: t('status_draft') },
      IN_REVIEW: { variant: 'outline' as const, label: t('status_review') },
      APPROVED: { variant: 'default' as const, label: t('status_approved') },
      PUBLISHED: { variant: 'default' as const, label: t('status_published') },
      ARCHIVED: { variant: 'destructive' as const, label: t('status_archived') },
    }),
    [t],
  );
}

export function useContentStatusFilters() {
  const { t } = useTranslation('content');
  const { t: tc } = useTranslation('common');
  return useMemo(
    () => [
      { label: tc('all'), status: '' },
      { label: t('status_draft'), status: 'DRAFT' },
      { label: t('status_review'), status: 'IN_REVIEW' },
      { label: t('status_approved'), status: 'APPROVED' },
      { label: t('status_published'), status: 'PUBLISHED' },
    ],
    [t, tc],
  );
}

export type ActivityTypeValue =
  | 'QUIZ' | 'OPEN_QUESTION' | 'PARTICIPATION_CHECKLIST' | 'GUIDED_REFLECTION'
  | 'GROUP_DYNAMIC' | 'FAMILY_ACTIVITY' | 'BIBLE_READING' | 'MATCHING'
  | 'TASK_WITH_ATTACHMENT' | 'RITE_CELEBRATION';

export function useActivityTypes() {
  const { t } = useTranslation('activities');
  return useMemo(
    () => [
      { value: 'QUIZ' as ActivityTypeValue, label: t('types.quiz') },
      { value: 'OPEN_QUESTION' as ActivityTypeValue, label: t('types.open_question') },
      { value: 'PARTICIPATION_CHECKLIST' as ActivityTypeValue, label: t('types.checklist') },
      { value: 'GUIDED_REFLECTION' as ActivityTypeValue, label: t('types.guided_reflection') },
      { value: 'GROUP_DYNAMIC' as ActivityTypeValue, label: t('types.group_dynamic') },
      { value: 'FAMILY_ACTIVITY' as ActivityTypeValue, label: t('types.family_activity') },
      { value: 'BIBLE_READING' as ActivityTypeValue, label: t('types.bible_reading') },
      { value: 'MATCHING' as ActivityTypeValue, label: t('types.matching') },
      { value: 'TASK_WITH_ATTACHMENT' as ActivityTypeValue, label: t('types.task_attachment') },
      { value: 'RITE_CELEBRATION' as ActivityTypeValue, label: t('types.rite_celebration') },
    ],
    [t],
  );
}

export function useSacramentMilestoneStatusMap() {
  const { t } = useTranslation('sacraments');
  return useMemo(
    () => ({
      PENDING: { label: t('detail.status.pending') },
      IN_PROGRESS: { label: t('detail.status.in_progress') },
      WAITING_APPROVAL: { label: t('detail.status.waiting_approval') },
      APPROVED: { label: t('detail.status.approved') },
      REJECTED: { label: t('detail.status.rejected') },
      COMPLETED: { label: t('detail.status.completed') },
    }),
    [t],
  );
}

export function useDocumentTypeLabels(short = false) {
  const { t } = useTranslation('common');
  const docKey = (type: string) =>
    short ? `documents.doc_types.${type}_SHORT` : `documents.doc_types.${type}`;
  return useMemo(
    () => ({
      BAPTISM_CERTIFICATE: t(docKey('BAPTISM_CERTIFICATE')),
      BIRTH_CERTIFICATE: t(docKey('BIRTH_CERTIFICATE')),
      CONSENT_FORM: t(docKey('CONSENT_FORM')),
      MARRIAGE_CERTIFICATE: t(docKey('MARRIAGE_CERTIFICATE')),
      PASTORAL_LETTER: t(docKey('PASTORAL_LETTER')),
      OTHER: t(docKey('OTHER')),
    }),
    [t, short],
  );
}
