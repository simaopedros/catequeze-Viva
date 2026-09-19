import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import type { ContentInput } from '../api/client';
import { BrandButton, Card, EmptyState, ErrorText, Field, FilterChips, KeyValue, ListCard, ListRow, PrimaryFab, Row, Screen, ScreenTitle, SearchBar, SectionHeader, SkeletonList, Tag, type IconName } from '../components/ui';
import { colors, fontFamilies, spacing } from '../theme';
import { formatDate, fullName } from '../utils/format';

export const CONTENT_STATUS: Record<string, { label: string; tone: 'neutral' | 'warning' | 'info' | 'success' | 'danger' }> = {
  DRAFT: { label: 'Rascunho', tone: 'neutral' },
  IN_REVIEW: { label: 'Em revisão', tone: 'warning' },
  APPROVED: { label: 'Aprovado', tone: 'info' },
  PUBLISHED: { label: 'Publicado', tone: 'success' },
  ARCHIVED: { label: 'Arquivado', tone: 'danger' },
};

// Espelha o fluxo da web: rascunho → revisão → aprovado → publicado → arquivado.
export const CONTENT_TRANSITIONS: Record<string, { to: string; label: string; icon: IconName }[]> = {
  DRAFT: [{ to: 'IN_REVIEW', label: 'Enviar para revisão', icon: 'send-check-outline' }],
  IN_REVIEW: [
    { to: 'APPROVED', label: 'Aprovar', icon: 'check-decagram-outline' },
    { to: 'DRAFT', label: 'Devolver a rascunho', icon: 'undo-variant' },
  ],
  APPROVED: [
    { to: 'PUBLISHED', label: 'Publicar', icon: 'publish' },
    { to: 'DRAFT', label: 'Devolver a rascunho', icon: 'undo-variant' },
  ],
  PUBLISHED: [{ to: 'ARCHIVED', label: 'Arquivar', icon: 'archive-arrow-down-outline' }],
  ARCHIVED: [{ to: 'DRAFT', label: 'Restaurar como rascunho', icon: 'restore' }],
};

export function ContentListScreen({
  items,
  loading,
  error,
  query,
  onChangeQuery,
  status,
  onChangeStatus,
  onOpen,
  onCreate,
  hasMore,
  loadingMore,
  onLoadMore,
  refreshing,
  onRefresh,
}: {
  items: any[];
  loading?: boolean;
  error?: string | null;
  query: string;
  onChangeQuery: (value: string) => void;
  status: string | null;
  onChangeStatus: (value: string) => void;
  onOpen: (id: string) => void;
  onCreate?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  return (
    <Screen
      testID="content-screen"
      refreshing={refreshing}
      onRefresh={onRefresh}
      fab={onCreate ? <PrimaryFab icon="file-plus-outline" label="Novo" onPress={onCreate} testID="create-content" /> : undefined}
    >
      <ScreenTitle title="Biblioteca de conteúdos" subtitle="Planos de encontro, materiais e atividades." />
      <SearchBar value={query} onChangeText={onChangeQuery} placeholder="Procurar por título ou tema" testID="content-search" />
      <FilterChips
        value={status ?? 'ALL'}
        onChange={onChangeStatus}
        options={[{ value: 'ALL', label: 'Todos' }, ...Object.entries(CONTENT_STATUS).map(([value, meta]) => ({ value, label: meta.label }))]}
      />
      {loading && items.length === 0 ? <SkeletonList rows={4} /> : null}
      {error ? <EmptyState icon="cloud-off-outline" title="Biblioteca indisponível" body={error} /> : null}
      {!loading && !error && items.length === 0 ? (
        <EmptyState icon="book-open-page-variant-outline" title="Sem conteúdos" body="Crie o primeiro plano de encontro ou material." action={onCreate ? 'Criar conteúdo' : undefined} onAction={onCreate} />
      ) : null}
      {items.length > 0 ? (
        <ListCard>
          {items.map((item, index) => {
            const meta = CONTENT_STATUS[String(item.status)] ?? CONTENT_STATUS.DRAFT;
            return (
              <ListRow
                key={item.id}
                testID={`content-${item.id}`}
                icon={item.isAiGenerated ? 'creation' : 'file-document-outline'}
                title={item.title}
                subtitle={[item.theme, item.estimatedTime ? `${item.estimatedTime} min` : null, item.createdBy ? fullName(item.createdBy) : null].filter(Boolean).join(' · ')}
                right={<Tag label={meta.label} tone={meta.tone} />}
                onPress={() => onOpen(item.id)}
                last={index === items.length - 1}
              />
            );
          })}
        </ListCard>
      ) : null}
      {hasMore && onLoadMore ? <BrandButton variant="ghost" label={loadingMore ? 'A carregar…' : 'Carregar mais'} loading={loadingMore} disabled={loadingMore} onPress={onLoadMore} testID="content-load-more" /> : null}
    </Screen>
  );
}

const SECTIONS: { key: string; label: string; icon: IconName }[] = [
  { key: 'pastoralObjective', label: 'Objetivo pastoral', icon: 'target' },
  { key: 'openingPrayer', label: 'Oração inicial', icon: 'hands-pray' },
  { key: 'mainContent', label: 'Conteúdo', icon: 'book-open-variant' },
  { key: 'dynamic', label: 'Dinâmica', icon: 'account-group-outline' },
  { key: 'materials', label: 'Materiais', icon: 'package-variant-closed' },
  { key: 'activity', label: 'Atividade', icon: 'puzzle-outline' },
  { key: 'familyTask', label: 'Tarefa em família', icon: 'home-heart' },
  { key: 'closingPrayer', label: 'Oração final', icon: 'candle' },
];

export function ContentDetailScreen({
  data,
  loading,
  error,
  onEdit,
  onChangeStatus,
  onShare,
  busy,
  canManage,
  refreshing,
  onRefresh,
}: {
  data: any;
  loading?: boolean;
  error?: string | null;
  onEdit?: () => void;
  onChangeStatus?: (status: string) => void;
  onShare?: () => void;
  busy?: boolean;
  canManage?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  if (loading && !data) {
    return (
      <Screen>
        <SkeletonList rows={3} />
      </Screen>
    );
  }
  if (error || !data) {
    return (
      <Screen testID="content-detail-screen">
        <EmptyState icon="cloud-off-outline" title="Conteúdo indisponível" body={error || 'Não encontrado.'} />
      </Screen>
    );
  }
  const meta = CONTENT_STATUS[String(data.status)] ?? CONTENT_STATUS.DRAFT;
  const transitions = canManage ? CONTENT_TRANSITIONS[String(data.status)] ?? [] : [];
  const activities: any[] = Array.isArray(data.activities) ? data.activities : [];

  return (
    <Screen testID="content-detail-screen" refreshing={refreshing} onRefresh={onRefresh}>
      <ScreenTitle eyebrow={data.theme || 'Conteúdo'} title={data.title} subtitle={[data.estimatedTime ? `${data.estimatedTime} min` : null, formatDate(data.updatedAt)].filter(Boolean).join(' · ') || undefined} action={<Tag label={meta.label} tone={meta.tone} />} />
      <Row>
        {onEdit ? <BrandButton icon="pencil-outline" label="Editar" onPress={onEdit} testID="edit-content" style={{ flex: 1 }} /> : null}
        {onShare ? <BrandButton variant="ghost" icon="share-variant-outline" label="Partilhar" onPress={onShare} style={{ flex: 1 }} /> : null}
      </Row>
      {data.biblicalRef || data.catechismRef || data.tags ? (
        <Card>
          <KeyValue label="Referência bíblica" value={data.biblicalRef} />
          <KeyValue label="Catecismo" value={data.catechismRef} />
          <KeyValue label="Etiquetas" value={data.tags} />
        </Card>
      ) : null}
      {SECTIONS.filter((section) => data[section.key]).map((section) => (
        <Card key={section.key}>
          <SectionHeader title={section.label} icon={section.icon} />
          <Text variant="bodyLarge" style={{ color: colors.inkSoft, lineHeight: 26 }}>
            {data[section.key]}
          </Text>
        </Card>
      ))}
      {activities.length > 0 ? (
        <>
          <SectionHeader title="Atividades" icon="puzzle-outline" />
          <ListCard>
            {activities.map((activity, index) => (
              <ListRow key={activity.id} icon="puzzle-outline" title={activity.title} subtitle={activity.description} meta={activity.points ? `${activity.points} pts` : undefined} last={index === activities.length - 1} />
            ))}
          </ListCard>
        </>
      ) : null}
      {transitions.length > 0 && onChangeStatus ? (
        <Card>
          <Text variant="labelMedium" style={{ color: colors.goldDark, marginBottom: spacing.xs }}>
            FLUXO DE PUBLICAÇÃO
          </Text>
          <Row style={{ flexWrap: 'wrap' }}>
            {transitions.map((transition) => (
              <BrandButton key={transition.to} variant={transition.to === 'PUBLISHED' || transition.to === 'APPROVED' ? 'gold' : 'ghost'} icon={transition.icon} label={transition.label} disabled={busy} onPress={() => onChangeStatus(transition.to)} style={{ flexGrow: 1 }} testID={`content-status-${transition.to}`} />
            ))}
          </Row>
        </Card>
      ) : null}
    </Screen>
  );
}

export function ContentFormScreen({
  initial,
  busy,
  error,
  onSubmit,
  mode,
}: {
  initial?: Partial<ContentInput> | null;
  busy?: boolean;
  error?: string | null;
  onSubmit: (values: ContentInput) => Promise<void> | void;
  mode: 'create' | 'edit';
}) {
  const [values, setValues] = useState<ContentInput>({ title: '', ...initial });
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (initial) setValues({ title: '', ...initial });
  }, [initial]);
  const set = (key: keyof ContentInput) => (value: string) => setValues((current) => ({ ...current, [key]: value }));
  const titleError = touched && values.title.trim().length < 3 ? 'Indique um título com pelo menos 3 caracteres.' : null;

  return (
    <Screen testID="content-form-screen">
      <ScreenTitle title={mode === 'create' ? 'Novo conteúdo' : 'Editar conteúdo'} subtitle="Plano de encontro ou material de apoio." />
      <ErrorText message={error} />
      <Field label="Título" icon="format-title" value={values.title} onChangeText={set('title')} autoCapitalize="sentences" error={titleError} testID="content-title" />
      <Field label="Tema" icon="lightbulb-on-outline" value={values.theme ?? ''} onChangeText={set('theme')} autoCapitalize="sentences" testID="content-theme" />
      <Field label="Objetivo pastoral" icon="target" value={values.pastoralObjective ?? ''} onChangeText={set('pastoralObjective')} multiline autoCapitalize="sentences" />
      <Field label="Oração inicial" icon="hands-pray" value={values.openingPrayer ?? ''} onChangeText={set('openingPrayer')} multiline autoCapitalize="sentences" />
      <Field label="Conteúdo principal" icon="book-open-variant" value={values.mainContent ?? ''} onChangeText={set('mainContent')} multiline numberOfLines={6} autoCapitalize="sentences" testID="content-main" />
      <Field label="Dinâmica" icon="account-group-outline" value={values.dynamic ?? ''} onChangeText={set('dynamic')} multiline autoCapitalize="sentences" />
      <Field label="Materiais" icon="package-variant-closed" value={values.materials ?? ''} onChangeText={set('materials')} multiline autoCapitalize="sentences" />
      <Field label="Atividade" icon="puzzle-outline" value={values.activity ?? ''} onChangeText={set('activity')} multiline autoCapitalize="sentences" />
      <Field label="Tarefa em família" icon="home-heart" value={values.familyTask ?? ''} onChangeText={set('familyTask')} multiline autoCapitalize="sentences" />
      <Field label="Oração final" icon="candle" value={values.closingPrayer ?? ''} onChangeText={set('closingPrayer')} multiline autoCapitalize="sentences" />
      <Row style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Field label="Duração (min)" icon="clock-outline" value={values.estimatedTime ? String(values.estimatedTime) : ''} onChangeText={(value) => setValues((current) => ({ ...current, estimatedTime: Number.parseInt(value, 10) || undefined }))} keyboardType="number-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Ref. bíblica" icon="book-cross" value={values.biblicalRef ?? ''} onChangeText={set('biblicalRef')} />
        </View>
      </Row>
      <BrandButton
        testID="content-submit"
        icon="content-save-outline"
        label={busy ? 'A guardar…' : mode === 'create' ? 'Criar conteúdo' : 'Guardar alterações'}
        loading={busy}
        disabled={busy}
        onPress={() => {
          setTouched(true);
          if (values.title.trim().length < 3) return;
          void onSubmit({ ...values, title: values.title.trim(), mainContent: values.mainContent?.trim() || undefined });
        }}
      />
      <Text variant="bodySmall" style={{ color: colors.muted, textAlign: 'center', marginTop: spacing.xs, fontFamily: fontFamilies.regular }}>
        Referências detalhadas e importação de ficheiros continuam na plataforma web.
      </Text>
    </Screen>
  );
}
