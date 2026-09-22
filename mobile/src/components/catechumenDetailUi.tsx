import { LinearGradient } from 'expo-linear-gradient';
import {
  BookOpen,
  ChevronRight,
  Church,
  FileText,
  GraduationCap,
  Mail,
  Phone,
  Users,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CatechumenDetailView } from '../catechumens/catechumensPresentation';
import { colors, elevation, radius, spacing } from '../theme';

const HERO_GRADIENT = ['#173B61', '#2E6BA8'] as const;

export function CatechumenHeroCard({ detail }: { detail: CatechumenDetailView }) {
  const metaParts = [
    detail.ageYears != null ? `${detail.ageYears} anos` : null,
    detail.parishName,
  ].filter(Boolean);

  return (
    <View style={styles.heroCard} testID="catechumen-hero">
      <LinearGradient colors={[...HERO_GRADIENT]} style={styles.heroAvatar}>
        <Text style={styles.heroInitials}>{detail.initials}</Text>
      </LinearGradient>
      <View style={styles.heroBody}>
        <Text style={styles.heroName}>{detail.name}</Text>
        {detail.birthDateLabel ? (
          <Text style={styles.heroMeta}>Nascimento: {detail.birthDateLabel}</Text>
        ) : null}
        {metaParts.length > 0 ? (
          <Text style={styles.heroMeta}>{metaParts.join(' · ')}</Text>
        ) : null}
      </View>
    </View>
  );
}

export function CatechumenSection({
  title,
  children,
  testID,
}: {
  title: string;
  children: React.ReactNode;
  testID?: string;
}) {
  return (
    <View style={styles.section} testID={testID}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

export function CatechumenInfoRow({
  icon: Icon,
  label,
  value,
  onPress,
  testID,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  onPress?: () => void;
  testID?: string;
}) {
  const content = (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Icon size={18} color={colors.primary[700]} strokeWidth={2.2} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
      {onPress ? <ChevronRight size={20} color={colors.text.placeholder} /> : null}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.92 }}>
      {content}
    </Pressable>
  );
}

export function CatechumenEnrollmentRow({
  className,
  stageName,
  onPress,
  testID,
}: {
  className: string;
  stageName?: string;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <CatechumenInfoRow
      testID={testID}
      icon={GraduationCap}
      label="Turma"
      value={[className, stageName].filter(Boolean).join(' · ')}
      onPress={onPress}
    />
  );
}

export function CatechumenGuardianRow({
  name,
  email,
}: {
  name: string;
  email?: string;
}) {
  return (
    <View style={styles.guardianRow}>
      <View style={styles.infoIconWrap}>
        <Users size={18} color={colors.primary[700]} strokeWidth={2.2} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoValue}>{name}</Text>
        {email ? <Text style={styles.infoLabel}>{email}</Text> : null}
      </View>
    </View>
  );
}

export function CatechumenJourneyRow({ name, milestoneCount }: { name: string; milestoneCount: number }) {
  return (
    <CatechumenInfoRow
      icon={Church}
      label="Jornada"
      value={milestoneCount > 0 ? `${name} · ${milestoneCount} marco(s)` : name}
    />
  );
}

export function CatechumenDocumentsSummary({ count }: { count: number }) {
  return (
    <CatechumenInfoRow
      icon={FileText}
      label="Documentos"
      value={count === 0 ? 'Nenhum documento cadastrado' : `${count} documento(s) no dossiê`}
    />
  );
}

export function catechumenContactRows(detail: CatechumenDetailView) {
  const rows: Array<{ key: string; icon: LucideIcon; label: string; value: string }> = [];
  if (detail.email) rows.push({ key: 'email', icon: Mail, label: 'E-mail', value: detail.email });
  if (detail.householdPhone) {
    rows.push({ key: 'phone', icon: Phone, label: 'Telefone da família', value: detail.householdPhone });
  }
  return rows;
}

export function CatechumenEmptyHint({ text }: { text: string }) {
  return (
    <View style={styles.emptyHint}>
      <BookOpen size={18} color={colors.text.placeholder} strokeWidth={2} />
      <Text style={styles.emptyHintText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    marginBottom: spacing[5],
    ...elevation.card,
  },
  heroAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInitials: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.white,
  },
  heroBody: {
    flex: 1,
    minWidth: 0,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
  },
  heroMeta: {
    marginTop: spacing[1],
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.muted,
  },
  section: {
    marginBottom: spacing[4],
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: colors.text.muted,
    marginBottom: spacing[2],
    marginLeft: spacing[1],
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  guardianRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    minWidth: 0,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.text.muted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  emptyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
  },
  emptyHintText: {
    flex: 1,
    fontSize: 14,
    color: colors.text.muted,
  },
});
