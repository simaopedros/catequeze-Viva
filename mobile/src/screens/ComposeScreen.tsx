import React, { useState } from 'react';
import { copy } from '../copy/ptBR';
import { ShareCard } from '../components/PostCard';
import { Banner, BrandButton, ErrorText, Field, Screen, ScreenTitle } from '../components/ui';
import type { SocialShare } from '../api/types';

export function ComposeScreen({
  canPublish,
  accessLoading,
  onPublish,
  preview,
  busy,
  error,
  onOpenBible,
}: {
  canPublish: boolean;
  accessLoading?: boolean;
  onPublish: (body: string, share?: { kind: string; sourceId: string } | null) => Promise<void> | void;
  onPreviewShare?: (kind: string, sourceId: string) => Promise<void> | void;
  preview?: SocialShare | null;
  busy?: boolean;
  error?: string | null;
  onOpenBible?: () => void;
}) {
  const [body, setBody] = useState('');

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
      {preview ? (
        <ShareCard kind={preview.kind} title={preview.title} subtitle={preview.subtitle} excerpt={preview.excerpt} />
      ) : onOpenBible ? (
        <BrandButton variant="ghost" label={copy.compose.includeVerse} onPress={onOpenBible} testID="compose-open-bible" />
      ) : null}
      <BrandButton
        testID="compose-submit"
        label={busy ? copy.compose.publishing : copy.compose.publish}
        disabled={(!canPublish && !accessLoading) || busy || !body.trim()}
        onPress={() => onPublish(body.trim(), null)}
      />
    </Screen>
  );
}
