import * as React from 'react';
import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/* shadcn/ui Button. Вариант «block» добавлен по DESIGN.md: блочная фаска сверху и тень снизу. */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-[color,background-color,box-shadow,transform] duration-150 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-destructive/40 select-none",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[inset_0_2px_0_rgb(255_255_255/0.28),inset_0_-3px_0_rgb(0_0_0/0.22)] hover:bg-primary/90 active:translate-y-px active:shadow-[inset_0_1px_0_rgb(255_255_255/0.2),inset_0_-1px_0_rgb(0_0_0/0.2)]',
        accent:
          'bg-accent text-accent-foreground shadow-[inset_0_2px_0_rgb(255_255_255/0.35),inset_0_-3px_0_rgb(0_0_0/0.2)] hover:bg-accent/90 active:translate-y-px',
        destructive:
          'bg-destructive text-white shadow-[inset_0_2px_0_rgb(255_255_255/0.2),inset_0_-3px_0_rgb(0_0_0/0.25)] hover:bg-destructive/90 active:translate-y-px',
        outline:
          'border border-border bg-background/40 text-foreground hover:bg-muted hover:text-foreground active:translate-y-px',
        secondary:
          'bg-secondary text-secondary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.08),inset_0_-2px_0_rgb(0_0_0/0.25)] hover:bg-secondary/80 active:translate-y-px',
        ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-12 rounded-md px-6 text-base has-[>svg]:px-5',
        icon: 'size-10',
        'icon-sm': 'size-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
