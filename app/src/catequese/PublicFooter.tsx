import { Link } from 'react-router';
import { Cross } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Cross className="h-4 w-4 text-primary" />
          <span>Catequese Viva &copy; {new Date().getFullYear()}</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link to="/about" className="hover:text-foreground transition-colors">Sobre</Link>
          <Link to="/contact" className="hover:text-foreground transition-colors">Contato</Link>
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacidade</Link>
          <Link to="/terms" className="hover:text-foreground transition-colors">Termos</Link>
        </nav>
      </div>
    </footer>
  );
}
