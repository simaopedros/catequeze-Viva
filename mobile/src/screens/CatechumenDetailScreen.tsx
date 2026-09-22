import React, { useMemo } from 'react';
import { mapCatechumenDetail } from '../catechumens/catechumensPresentation';
import {
  CatechumenDocumentsSummary,
  CatechumenEmptyHint,
  CatechumenEnrollmentRow,
  CatechumenGuardianRow,
  CatechumenHeroCard,
  CatechumenInfoRow,
  CatechumenJourneyRow,
  CatechumenSection,
  catechumenContactRows,
} from '../components/catechumenDetailUi';
import { EmptyState, LoadingState, Screen } from '../components/ui';
import { Users } from 'lucide-react-native';

export function CatechumenDetailScreen({
  profile,
  loading,
  error,
  onOpenClass,
  onOpenFamily,
}: {
  profile: any;
  loading?: boolean;
  error?: string | null;
  onOpenClass?: (classId: string) => void;
  onOpenFamily?: (householdId: string) => void;
}) {
  const detail = useMemo(() => (profile ? mapCatechumenDetail(profile) : null), [profile]);

  if (loading) {
    return (
      <Screen testID="catechumen-detail-screen">
        <LoadingState />
      </Screen>
    );
  }

  if (error || !detail) {
    return (
      <Screen testID="catechumen-detail-screen">
        <EmptyState title="Ficha indisponível" body={error || 'Não foi possível carregar este catequizando.'} />
      </Screen>
    );
  }

  const contactRows = catechumenContactRows(detail);

  return (
    <Screen testID="catechumen-detail-screen" safeAreaEdges={['bottom', 'left', 'right']}>
      <CatechumenHeroCard detail={detail} />

      <CatechumenSection title="Turmas" testID="catechumen-section-classes">
        {detail.enrollments.length > 0 ? (
          detail.enrollments.map((enrollment) => (
            <CatechumenEnrollmentRow
              key={enrollment.classId}
              testID={`catechumen-class-${enrollment.classId}`}
              className={enrollment.className}
              stageName={enrollment.stageName}
              onPress={onOpenClass ? () => onOpenClass(enrollment.classId) : undefined}
            />
          ))
        ) : (
          <CatechumenEmptyHint text="Ainda não está matriculado em nenhuma turma." />
        )}
      </CatechumenSection>

      <CatechumenSection title="Família" testID="catechumen-section-family">
        {detail.householdName ? (
          <CatechumenInfoRow
            testID="catechumen-family-link"
            icon={Users}
            label="Agregado familiar"
            value={detail.householdName}
            onPress={
              detail.householdId && onOpenFamily ? () => onOpenFamily(detail.householdId!) : undefined
            }
          />
        ) : (
          <CatechumenEmptyHint text="Nenhuma família vinculada." />
        )}
        {detail.guardians.map((guardian) => (
          <CatechumenGuardianRow key={guardian.id} name={guardian.name} email={guardian.email} />
        ))}
      </CatechumenSection>

      {contactRows.length > 0 ? (
        <CatechumenSection title="Contacto" testID="catechumen-section-contact">
          {contactRows.map((row) => (
            <CatechumenInfoRow key={row.key} icon={row.icon} label={row.label} value={row.value} />
          ))}
        </CatechumenSection>
      ) : null}

      <CatechumenSection title="Jornada pastoral" testID="catechumen-section-journeys">
        {detail.journeys.length > 0 ? (
          detail.journeys.map((journey) => (
            <CatechumenJourneyRow
              key={journey.id}
              name={journey.name}
              milestoneCount={journey.milestoneCount}
            />
          ))
        ) : (
          <CatechumenEmptyHint text="Nenhuma jornada sacramental registrada." />
        )}
      </CatechumenSection>

      <CatechumenSection title="Dossiê">
        <CatechumenDocumentsSummary count={detail.documentCount} />
      </CatechumenSection>
    </Screen>
  );
}
