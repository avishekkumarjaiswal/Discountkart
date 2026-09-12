import * as React from "react"
import { cn } from "../../lib/utils"
import { motion } from "motion/react"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'danger';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none";
    
    const variants = {
      default: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400",
      outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground disabled:opacity-50",
      ghost: "hover:bg-accent hover:text-accent-foreground disabled:opacity-50",
      link: "text-blue-600 underline-offset-4 hover:underline disabled:opacity-50",
      danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-200 disabled:text-red-400",
    };

    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3",
      lg: "h-11 rounded-md px-8 text-base",
      icon: "h-10 w-10",
    };

    return (
      <motion.button
        whileTap={{ scale: props.disabled ? 1 : 0.97 }}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
