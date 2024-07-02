import { cn } from '@/lib/utils'

interface ButtonProps extends React.ComponentProps<'button'> {}

export default function Button({ className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'w-full px-4 py-2 mt-2 font-bold bg-green-400 rounded-lg text-zinc-900 hover:bg-green-500',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
