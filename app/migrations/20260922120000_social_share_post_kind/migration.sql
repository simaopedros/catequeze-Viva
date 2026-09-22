-- Allow republicar publicações da Comunidade como anexo nativo.
ALTER TYPE "SocialShareKind" ADD VALUE IF NOT EXISTS 'POST';
