import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98] touch-manipulation [-webkit-tap-highlight-color:transparent]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-md [@media(hover:hover)]:hover:bg-primary/90 [@media(hover:hover)]:hover:shadow-lg active:bg-primary active:text-primary-foreground",
        destructive: "bg-destructive text-destructive-foreground [@media(hover:hover)]:hover:bg-destructive/90 active:bg-destructive active:text-destructive-foreground",
        outline: "border border-input bg-background [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-accent-foreground active:bg-background active:text-foreground",
        secondary: "bg-secondary text-secondary-foreground [@media(hover:hover)]:hover:bg-secondary/80 active:bg-secondary active:text-secondary-foreground",
        ghost: "[@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-accent-foreground active:bg-transparent active:text-foreground",
        link: "text-primary underline-offset-4 [@media(hover:hover)]:hover:underline active:text-primary",
        // Jazz-specific variants
        hero: "bg-gradient-to-r from-jazz-gold to-jazz-amber text-jazz-midnight font-semibold shadow-lg [@media(hover:hover)]:hover:shadow-xl [@media(hover:hover)]:hover:scale-[1.02] active:scale-[0.98] active:text-jazz-midnight",
        "hero-outline": "border-2 border-jazz-gold bg-transparent text-jazz-gold [@media(hover:hover)]:hover:bg-jazz-gold/10 [@media(hover:hover)]:hover:shadow-lg active:text-jazz-gold",
        jazz: "bg-jazz-gold text-jazz-midnight [@media(hover:hover)]:hover:bg-jazz-gold-glow shadow-md active:bg-jazz-gold active:text-jazz-midnight",
        "jazz-ghost": "text-jazz-gold [@media(hover:hover)]:hover:bg-jazz-gold/10 active:text-jazz-gold",
        "jazz-accent": "bg-accent text-accent-foreground [@media(hover:hover)]:hover:bg-accent/80 active:bg-accent active:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-14 rounded-lg px-10 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, onTouchEnd, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    // Handle touch end to blur button and prevent stuck focus states on mobile
    const handleTouchEnd = (e: React.TouchEvent<HTMLButtonElement>) => {
      // Blur the button after touch to clear focus state
      (e.currentTarget as HTMLButtonElement).blur();
      // Call any passed onTouchEnd handler
      onTouchEnd?.(e);
    };
    
    return (
      <Comp 
        className={cn(buttonVariants({ variant, size, className }))} 
        ref={ref} 
        onTouchEnd={handleTouchEnd}
        {...props} 
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
