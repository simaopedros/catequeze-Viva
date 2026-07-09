import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-sm border font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[#071A2D] text-white',
        secondary: 'border-transparent bg-muted text-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground',
        brand: 'border-transparent bg-[#071A2D]/08 text-[#071A2D]',
        success: 'border-transparent bg-muted text-foreground',
        warning: 'border-transparent bg-muted text-foreground',
        info: 'border-transparent bg-muted text-foreground',
        dot: 'border-transparent gap-1.5',
      },
      size: {
        sm: 'px-2 py-0 text-[10px] leading-none',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  }
);

function dotColor(variant: string | null | undefined): string {
  switch (variant) {
    case 'dot': return 'bg-primary';
    case 'success': return 'bg-success';
    case 'warning': return 'bg-warning';
    case 'destructive': return 'bg-destructive';
    case 'info': return 'bg-info';
    default: return 'bg-primary';
  }
}

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {variant?.includes('dot') || variant === 'dot' ? (
        <span className={cn('h-1.5 w-1.5 rounded-full', dotColor(variant))} aria-hidden="true" />
      ) : null}
      {props.children}
    </div>
  );
}

export { Badge, badgeVariants };
