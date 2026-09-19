import React, { useState } from 'react';
import { Share } from 'react-native';
import { resolveMediaUrl } from '../api/mediaUrl';
import type { SocialPost } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { ConfirmDialog } from '../components/ui';
import { useMutation } from './useMutation';

/** Partilhar (registo + folha do SO) e apagar publicações, com diálogo de confirmação. */
export function usePostActions(onDeleted?: () => void) {
  const { api } = useAuth();
  const [pending, setPending] = useState<SocialPost | null>(null);

  const remove = useMutation((post: SocialPost) => api.deleteSocialPost(post.id), {
    successMessage: 'Publicação apagada.',
    onSuccess: () => onDeleted?.(),
  });

  async function share(post: SocialPost) {
    const url = resolveMediaUrl(`/c/${post.slug}`);
    api.registerSocialShare(post.id).catch(() => undefined);
    if (url) await Share.share({ message: post.body ? `${post.body.slice(0, 120)}\n${url}` : url, url }).catch(() => undefined);
  }

  const dialog = (
    <ConfirmDialog
      visible={Boolean(pending)}
      title="Apagar publicação"
      body="A publicação, os comentários e as reações são removidos da Comunidade."
      confirmLabel="Apagar"
      destructive
      loading={remove.busy}
      onCancel={() => setPending(null)}
      onConfirm={async () => {
        if (!pending) return;
        await remove.run(pending);
        setPending(null);
      }}
    />
  );

  return {
    share,
    requestDelete: (post: SocialPost) => setPending(post),
    canDelete: (post: SocialPost) => Boolean(post.isOwn),
    dialog,
  };
}
