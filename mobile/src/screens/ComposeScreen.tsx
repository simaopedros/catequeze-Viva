import React, { useState } from 'react';
import { copy } from '../copy/ptBR';
import { ShareCard } from '../components/PostCard';
import { Banner, BrandButton, ErrorText, Field, Screen, ScreenTitle } from '../components/ui';
import type { SocialShare } from '../api/types';

export function ComposeScreen({
  canPublish,
  accessLoading,
  onPublish,
  onPreviewShare,
  preview,
  busy,
  error,
  onOpenBible,
  initialKind = 'VERSE',
  initialSourceId = '',
}: {
  canPublish: boolean;
  accessLoading?: boolean;
  onPublish: (body: string, share?: { kind: string; sourceId: string } | null) => Promise<void> | void;
  onPreviewShare?: (kind: string, sourceId: string) => Promise<void> | void;
  preview?: SocialShare | null;
  busy?: boolean;
  error?: string | null;
  onOpenBible?: () => void;
  initialKind?: string;
  initialSourceId?: string;
}) {
  const [body, setBody] = useState('');
  const [kind, setKind] = useState(initialKind);
  const [sourceId, setSourceId] = useState(initialSourceId);

  return (
    <Screen testID="compose-screen">
      <ScreenTitle
        title={copy.compose.title}
        subtitle={
          accessLoading ? copy.compose.checking : canPublish ? copy.compose.canPublish : copy.compose.needsSub
        }
      />
      <ErrorText message={error} />
      {!canPublish && !accessLoading ? <Banner>{copy.compose.needsSub}</Banner> : null}
      <Field
        label={copy.compose.body}
        placeholder={copy.compose.bodyPlaceholder}
        value={body}
        onChangeText={setBody}
        multiline
        testID="compose-body"
      />
      <Field label={copy.compose.shareKind} value={kind} onChangeText={setKind} testID="compose-share-kind" />
      <Field
        label={copy.compose.shareId}
        value={sourceId}
        onChangeText={setSourceId}
        testID="compose-share-id"
      />
      {onPreviewShare ? (
        <BrandButton
          variant="ghost"
          label={copy.compose.previewShare}
          onPress={() => sourceId.trim() && onPreviewShare(kind.trim() || 'VERSE', sourceId.trim())}
          testID="compose-preview"
        />
      ) : null}
      {preview ? (
        <ShareCard kind={preview.kind} title={preview.title} subtitle={preview.subtitle} excerpt={preview.excerpt} />
      ) : onOpenBible ? (
        <BrandButton variant="ghost" label={copy.compose.includeVerse} onPress={onOpenBible} testID="compose-open-bible" />
      ) : null}
      <BrandButton
        testID="compose-submit"
        label={busy ? copy.compose.publishing : copy.compose.publish}
        disabled={(!canPublish && !accessLoading) || busy || !body.trim()}
        onPress={() =>
          onPublish(body.trim(), sourceId.trim() ? { kind: kind.trim() || 'VERSE', sourceId: sourceId.trim() } : null)
        }
      />
    </Screen>
  );
}
