import { useState } from 'react';
import { Link } from 'react-router';
import { Cross, Menu, X } from 'lucide-react';

export function PublicNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold text-primary">
          <Cross className="h-5 w-5" />
          <span>Catequese Viva</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <Link to="/about" className="hover:text-foreground transition-colors">Sobre</Link>
          <Link to="/pricing" className="hover:text-foreground transition-colors">Planos</Link>
          <Link to="/contact" className="hover:text-foreground transition-colors">Contato</Link>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className="inline-flex h-9 items-center rounded-md border border-input bg-background px-4 text-sm hover:bg-accent transition-colors">
            Entrar
          </Link>
          <Link to="/signup" className="inline-flex h-9 items-center rounded-md bg-primary text-primary-foreground px-4 text-sm font-medium hover:bg-primary/90 transition-colors">
            Criar conta
          </Link>
        </div>

        {/* Mobile menu button */}
        <button className="md:hidden p-2" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile nav */}
      {open && (
        <div className="md:hidden border-t bg-background px-4 py-3 space-y-2">
          <Link to="/about" className="block py-2 text-sm text-muted-foreground" onClick={() => setOpen(false)}>Sobre</Link>
          <Link to="/pricing" className="block py-2 text-sm text-muted-foreground" onClick={() => setOpen(false)}>Planos</Link>
          <Link to="/contact" className="block py-2 text-sm text-muted-foreground" onClick={() => setOpen(false)}>Contato</Link>
          <div className="flex gap-2 pt-2">
            <Link to="/login" className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent transition-colors" onClick={() => setOpen(false)}>Entrar</Link>
            <Link to="/signup" className="inline-flex h-9 items-center justify-center rounded-md bg-primary text-primary-foreground px-4 text-sm font-medium hover:bg-primary/90 transition-colors" onClick={() => setOpen(false)}>Criar conta</Link>
          </div>
        </div>
      )}
    </header>
  );
}
