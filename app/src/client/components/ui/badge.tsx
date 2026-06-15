import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-white',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground',
        brand: 'border-transparent bg-primary/10 text-primary',
        success: 'border-transparent bg-success/10 text-success',
        warning: 'border-transparent bg-warning/10 text-warning',
        info: 'border-transparent bg-info/10 text-info',
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
