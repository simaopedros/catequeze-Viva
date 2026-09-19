/**
 * Serves the domain-association files that let https://catechis.app links
 * open directly in the mobile app (iOS universal links / Android app links).
 *
 * Both stay 404 until the matching env vars are set in production:
 * - APPLE_TEAM_ID                  Apple Developer Team ID (ex. ABCDE12345)
 * - ANDROID_SHA256_CERT_FINGERPRINT  SHA-256 do certificado de assinatura Play
 */
import type { Application } from 'express';

const IOS_BUNDLE_ID = 'app.catechis.mobile';
const ANDROID_PACKAGE = 'app.catechis.mobile';

export function registerWellKnown(app: Application): void {
  app.get('/.well-known/apple-app-site-association', (_req, res) => {
    const teamId = process.env.APPLE_TEAM_ID;
    if (!teamId) {
      return res.status(404).end();
    }
    return res.type('application/json').send({
      applinks: {
        details: [
          {
            appID: `${teamId}.${IOS_BUNDLE_ID}`,
            paths: ['/c/*', '/comunidade/*'],
          },
        ],
      },
    });
  });

  app.get('/.well-known/assetlinks.json', (_req, res) => {
    const fingerprint = process.env.ANDROID_SHA256_CERT_FINGERPRINT;
    if (!fingerprint) {
      return res.status(404).end();
    }
    return res.type('application/json').send([
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: ANDROID_PACKAGE,
          sha256_cert_fingerprints: [fingerprint],
        },
      },
    ]);
  });
}
