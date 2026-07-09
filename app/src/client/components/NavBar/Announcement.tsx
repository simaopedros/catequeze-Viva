const ANNOUNCEMENT_URL = "https://github.com/wasp-lang/wasp";

export function Announcement() {
  return (
    <div className="relative flex w-full items-center justify-center gap-3 bg-[#071A2D] p-3 text-center font-semibold text-white">
      <a
        href={ANNOUNCEMENT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="hidden cursor-pointer transition-opacity hover:opacity-90 lg:block"
      >
        Software de código aberto
      </a>
      <div className="hidden w-0.5 self-stretch bg-white/20 lg:block"></div>
      <a
        href={ANNOUNCEMENT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="hidden cursor-pointer rounded-sm bg-background/20 px-2.5 py-1 text-xs tracking-wider transition-colors hover:bg-background/30 lg:block"
      >
        Ver o repositório no GitHub →
      </a>
      <a
        href={ANNOUNCEMENT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="cursor-pointer rounded-sm bg-background/20 px-2.5 py-1 text-xs transition-colors hover:bg-background/30 lg:hidden"
      >
        Ver o repositório no GitHub
      </a>
    </div>
  );
}
