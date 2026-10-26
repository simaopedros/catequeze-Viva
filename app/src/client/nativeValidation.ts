type Translate = (key: string, options?: Record<string, unknown>) => string;

type ValidatableElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function isValidatable(target: EventTarget | null): target is ValidatableElement {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

/** Localized text for the first failing constraint, or "" when only a custom error is set. */
export function nativeValidationMessage(el: ValidatableElement, t: Translate): string {
  const v = el.validity;
  const input = el instanceof HTMLInputElement ? el : null;
  if (v.valueMissing) {
    if (input?.type === "checkbox") return t("validation.native_required_checkbox");
    if (el instanceof HTMLSelectElement) return t("validation.native_required_select");
    return t("validation.native_required");
  }
  if (v.typeMismatch) {
    if (input?.type === "email") return t("validation.native_email");
    if (input?.type === "url") return t("validation.native_url");
    return t("validation.native_invalid");
  }
  if (v.patternMismatch) {
    return el.dataset.patternMessage || t("validation.native_pattern");
  }
  if (v.tooShort) {
    return t("validation.native_too_short", { min: (el as HTMLInputElement).minLength });
  }
  if (v.tooLong) {
    return t("validation.native_too_long", { max: (el as HTMLInputElement).maxLength });
  }
  if (v.rangeUnderflow) return t("validation.native_min", { min: input?.min });
  if (v.rangeOverflow) return t("validation.native_max", { max: input?.max });
  if (v.stepMismatch || v.badInput) return t("validation.native_invalid");
  return "";
}

/**
 * Browsers show built-in validation bubbles in the OS language. Replace them
 * with the app's language for every form, without touching each one.
 */
export function installNativeValidationMessages(t: Translate): () => void {
  if (typeof document === "undefined") return () => undefined;

  const onInvalid = (event: Event) => {
    const el = event.target;
    if (!isValidatable(el)) return;
    if (el.validity.customError && !el.dataset.nativeMessage) return;
    el.setCustomValidity("");
    const message = nativeValidationMessage(el, t);
    if (message) {
      el.dataset.nativeMessage = "1";
      el.setCustomValidity(message);
    }
  };

  const onEdit = (event: Event) => {
    const el = event.target;
    if (!isValidatable(el) || !el.dataset.nativeMessage) return;
    delete el.dataset.nativeMessage;
    el.setCustomValidity("");
  };

  document.addEventListener("invalid", onInvalid, true);
  document.addEventListener("input", onEdit, true);
  document.addEventListener("change", onEdit, true);
  return () => {
    document.removeEventListener("invalid", onInvalid, true);
    document.removeEventListener("input", onEdit, true);
    document.removeEventListener("change", onEdit, true);
  };
}
