import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { OriginBadge } from "./OriginBadge";

vi.mock("react-i18next", async () => {
  const { mockUseTranslation } = await import(
    "../../__tests__/ui/hierarchyFixtures"
  );
  return {
    useTranslation: (ns?: string) => mockUseTranslation(ns),
  };
});

describe("OriginBadge", () => {
  it("mostra Diocese · oficial para recurso herdado da cúria", () => {
    render(<OriginBadge ownerType="DIOCESE" inherited policy="LOCKED" />);
    const badge = screen.getByTestId("origin-badge");
    expect(badge).toHaveTextContent("Diocese");
    expect(badge).toHaveTextContent("oficial");
  });

  it("mostra Paróquia · local para conteúdo próprio da paróquia", () => {
    render(<OriginBadge ownerType="PARISH" inherited={false} policy="LOCAL" />);
    const badge = screen.getByTestId("origin-badge");
    expect(badge).toHaveTextContent("Paróquia");
    expect(badge).toHaveTextContent("local");
  });

  it("mostra Paróquia · complementar quando a paróquia herda para a turma", () => {
    render(
      <OriginBadge ownerType="PARISH" inherited policy="REQUIRED_EXTENDABLE" />,
    );
    expect(screen.getByTestId("origin-badge")).toHaveTextContent(
      "complementar",
    );
  });

  it("não renderiza origem de plataforma", () => {
    const { container } = render(
      <OriginBadge ownerType="PLATFORM" inherited={false} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
