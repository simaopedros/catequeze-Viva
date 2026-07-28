/**
 * Contrato de acessibilidade do CreateHouseholdModal.
 *
 * Este modal era um `<div>` com backdrop clicável: sem role, sem foco preso,
 * sem Escape, e o botão de fechar sem nome. Foi reescrito sobre o Dialog do
 * Radix. Os testes abaixo travam esse contrato — se alguém voltar a montar o
 * modal à mão, eles quebram.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateHouseholdModal from "./CreateHouseholdModal";
import { createHousehold } from "wasp/client/operations";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    // devolve a própria chave: o teste verifica estrutura, não tradução
    t: (key: string) => key,
  }),
}));

vi.mock("../../client/hooks/useActiveParish", () => ({
  useActiveParish: () => ({ activeParishId: "paroquia-teste" }),
}));

vi.mock("../../client/hooks/useViaCep", () => ({
  useViaCep: () => ({ data: null, loading: false }),
}));

function setup(
  props: Partial<Parameters<typeof CreateHouseholdModal>[0]> = {},
) {
  const onClose = vi.fn();
  const onCreated = vi.fn();
  const utils = render(
    <CreateHouseholdModal
      isOpen
      onClose={onClose}
      onCreated={onCreated}
      {...props}
    />,
  );
  return { onClose, onCreated, ...utils };
}

describe("CreateHouseholdModal — contrato de diálogo", () => {
  beforeEach(() => {
    vi.mocked(createHousehold).mockClear();
  });

  it("expõe um dialog com nome acessível", async () => {
    setup();
    const dialog = await screen.findByRole("dialog");
    // O nome vem do DialogTitle via aria-labelledby, não de um <div> qualquer.
    // Não se checa aria-modal: o Radix o omite de propósito e confia em
    // contenção de foco + inertização do resto da página, porque
    // aria-modal="true" tem bugs conhecidos em leitores de tela.
    expect(dialog).toHaveAccessibleName();
    expect(dialog).toHaveAttribute("aria-labelledby");
  });

  it("mantém as classes de centralização no desktop", async () => {
    setup();
    const dialog = await screen.findByRole("dialog");
    // Regressão: `sm:inset-auto` depois de `sm:left-[50%] sm:top-[50%]` fazia o
    // tailwind-merge descartar as posicionais, e o diálogo abria fora da tela.
    const cls = dialog.className;
    expect(cls).toContain("sm:inset-auto");
    expect(cls).toContain("sm:left-[50%]");
    expect(cls).toContain("sm:top-[50%]");
  });

  it("move o foco para dentro do dialog ao abrir", async () => {
    setup();
    const dialog = await screen.findByRole("dialog");
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true),
    );
  });

  it("fecha com Escape", async () => {
    const user = userEvent.setup();
    const { onClose } = setup();
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("oferece um botão de fechar com nome acessível", async () => {
    const dialogless = setup();
    const dialog = await screen.findByRole("dialog");
    const fechar = within(dialog)
      .getAllByRole("button")
      .filter((b) => b.getAttribute("type") !== "submit");
    // o antigo botão de fechar era um <button> só com o ícone <X/>
    expect(fechar.some((b) => (b.textContent || "").trim().length > 0)).toBe(
      true,
    );
    dialogless.unmount();
  });

  it("mantém o foco preso no dialog ao tabular", async () => {
    const user = userEvent.setup();
    setup();
    const dialog = await screen.findByRole("dialog");
    for (let i = 0; i < 12; i++) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });
});

describe("CreateHouseholdModal — formulário", () => {
  beforeEach(() => {
    vi.mocked(createHousehold).mockClear();
  });

  it("liga cada campo ao seu rótulo", async () => {
    setup();
    const dialog = await screen.findByRole("dialog");
    const campos = within(dialog).getAllByRole("textbox");
    expect(campos.length).toBeGreaterThan(0);
    for (const campo of campos) {
      // getByRole só encontra por nome se o rótulo estiver associado
      expect(campo).toHaveAccessibleName();
    }
  });

  it("envia com Enter, sem precisar clicar no botão", async () => {
    const user = userEvent.setup();
    setup();
    const dialog = await screen.findByRole("dialog");
    const nome = within(dialog).getAllByRole("textbox")[0];
    await user.click(nome);
    await user.keyboard("Família Silva{Enter}");
    await waitFor(() =>
      expect(createHousehold).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Família Silva" }),
      ),
    );
  });

  it("não envia com o nome vazio", async () => {
    const user = userEvent.setup();
    setup();
    const dialog = await screen.findByRole("dialog");
    const nome = within(dialog).getAllByRole("textbox")[0];
    await user.click(nome);
    await user.keyboard("{Enter}");
    await waitFor(() => expect(createHousehold).not.toHaveBeenCalled());
  });
});
