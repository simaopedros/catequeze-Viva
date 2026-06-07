import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
  backTo?: string;
}

export function PageHeader({ title, subtitle, children, className, backTo }: PageHeaderProps) {
  const titleBlock = (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
    </div>
  );

  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4', className)}>
      <div className="flex items-center gap-3">
        {backTo && (
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link to={backTo}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
        )}
        {titleBlock}
      </div>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  );
}
