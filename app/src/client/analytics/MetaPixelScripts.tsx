import { useEffect } from "react";
import { initMetaPixel, isMetaPixelConfigured } from "./metaTracking";

/**
 * Optional native Meta Pixel loader.
 * Set REACT_APP_META_PIXEL_ID to the same ID used in META_PIXEL_ID / GTM.
 * Events are still emitted via dataLayer for GTM; fbq mirrors standard events
 * when this component successfully initializes the pixel.
 */
export default function MetaPixelScripts() {
  useEffect(() => {
    if (!isMetaPixelConfigured()) return;
    initMetaPixel();
  }, []);

  return null;
}
