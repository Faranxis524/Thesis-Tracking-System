import * as React from "react"

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variantStyles = {
    default: 'border-transparent bg-blue-100 text-blue-800',
    secondary: 'border-transparent bg-slate-100 text-slate-800',
    destructive: 'border-transparent bg-red-100 text-red-800',
    outline: 'text-slate-950 border border-slate-200'
  }
  
  return (
    <div
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${variantStyles[variant]} ${className || ''}`}
      {...props}
    />
  )
}

export { Badge }
