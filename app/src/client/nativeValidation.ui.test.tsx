import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { installNativeValidationMessages } from "./nativeValidation";

const t = (key: string, options?: Record<string, unknown>) =>
  options ? `${key}:${JSON.stringify(options)}` : key;

describe("installNativeValidationMessages", () => {
  let uninstall: () => void;

  beforeEach(() => {
    uninstall = installNativeValidationMessages(t);
  });
  afterEach(() => {
    uninstall();
    document.body.innerHTML = "";
  });

  it("replaces the browser message for required and email fields", () => {
    document.body.innerHTML = `
      <form>
        <input id="name" required />
        <input id="email" type="email" value="nope" />
      </form>`;
    const name = document.getElementById("name") as HTMLInputElement;
    const email = document.getElementById("email") as HTMLInputElement;

    name.checkValidity();
    email.checkValidity();

    expect(name.validationMessage).toBe("validation.native_required");
    expect(email.validationMessage).toBe("validation.native_email");
  });

  it("uses the field's pattern message and clears it on input", () => {
    document.body.innerHTML = `<input id="time" pattern="\\d\\d:\\d\\d" value="7pm" data-pattern-message="Use HH:MM" />`;
    const time = document.getElementById("time") as HTMLInputElement;

    time.checkValidity();
    expect(time.validationMessage).toBe("Use HH:MM");

    time.value = "19:30";
    time.dispatchEvent(new Event("input", { bubbles: true }));
    expect(time.checkValidity()).toBe(true);
  });

  it("keeps custom errors set by the app", () => {
    document.body.innerHTML = `<input id="x" />`;
    const el = document.getElementById("x") as HTMLInputElement;
    el.setCustomValidity("App error");
    el.checkValidity();
    expect(el.validationMessage).toBe("App error");
  });
});
