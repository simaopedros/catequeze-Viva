/**
 * Server-side i18n: the shared config only ships the pt-BR "core" namespaces
 * synchronously (to keep the client bundle small). The server needs every
 * namespace (emails, onboarding errors, ...), so it registers the full bundle
 * once here. Import this module instead of `../../i18n/config` in server code.
 */
import i18n, { areAppNamespacesLoaded, registerFullPtBrResources } from '../../i18n/config';
import { resources_pt_BR } from '../../i18n/resources_pt_BR';

if (!areAppNamespacesLoaded()) {
  registerFullPtBrResources(resources_pt_BR as Record<string, Record<string, unknown>>);
}

export default i18n;
