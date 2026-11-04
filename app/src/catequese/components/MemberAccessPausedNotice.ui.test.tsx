// @ts-nocheck — Wasp SDK tsc includes *.ui.test.tsx; this file is Vitest-only.
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemberAccessPausedNotice } from "./MemberAccessPausedNotice";
import pt from "../../i18n/locales/pt-BR/billing.json";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      key.split(".").reduce((node: any, part) => node?.[part], pt) ?? key,
  }),
}));

describe("MemberAccessPausedNotice", () => {
  it("asks the member to contact the parish administrator", () => {
    render(<MemberAccessPausedNotice kind="parish" />);
    const notice = screen.getByRole("status");
    expect(notice).toHaveTextContent(
      "O acesso da sua paróquia está temporariamente indisponível. Fale com o administrador da sua paróquia.",
    );
    expect(notice.textContent).not.toMatch(
      /pagamento|assinatura|fatura|plano|inadimpl|billing|subscription/i,
    );
  });

  it("uses the diocese wording for a diocese member", () => {
    render(<MemberAccessPausedNotice kind="diocese" />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "O acesso da sua diocese está temporariamente indisponível. Fale com o administrador da sua diocese.",
    );
  });
});
