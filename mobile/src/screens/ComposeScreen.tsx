import React, { useState } from 'react';
import { BrandButton, ErrorText, Field, Screen, ScreenTitle } from '../components/ui';
import { ShareCard } from '../components/PostCard';
import type { SocialShare } from '../api/types';

export function ComposeScreen({
  canPublish,
  onPublish,
  onPreviewShare,
  preview,
  busy,
  error,
}: {
  canPublish: boolean;
  onPublish: (body: string, share?: { kind: string; sourceId: string } | null) => Promise<void> | void;
  onPreviewShare?: (kind: string, sourceId: string) => Promise<void> | void;
  preview?: SocialShare | null;
  busy?: boolean;
  error?: string | null;
}) {
  const [body, setBody] = useState('');
  const [kind, setKind] = useState('VERSE');
  const [sourceId, setSourceId] = useState('');

  return (
    <Screen testID="compose-screen">
      <ScreenTitle
        title="Nova publicação"
        subtitle={canPublish ? 'Partilhe um momento ou um versículo com a Comunidade.' : 'A publicação exige assinatura.'}
      />
      <ErrorText message={error} />
      <Field label="Texto" value={body} onChangeText={setBody} multiline testID="compose-body" />
      <Field label="Tipo de partilha (opcional)" value={kind} onChangeText={setKind} />
      <Field
        label="ID da fonte (ex. bookId:chapter:verse)"
        value={sourceId}
        onChangeText={setSourceId}
        testID="compose-share-id"
      />
      {onPreviewShare ? (
        <BrandButton
          variant="ghost"
          label="Pré-visualizar partilha"
          onPress={() => sourceId && onPreviewShare(kind, sourceId)}
        />
      ) : null}
      {preview ? (
        <ShareCard kind={preview.kind} title={preview.title} subtitle={preview.subtitle} excerpt={preview.excerpt} />
      ) : null}
      <BrandButton
        testID="compose-submit"
        label={busy ? 'A publicar…' : 'Publicar'}
        disabled={!canPublish || busy || !body.trim()}
        onPress={() => onPublish(body.trim(), sourceId ? { kind, sourceId } : null)}
      />
    </Screen>
  );
}
