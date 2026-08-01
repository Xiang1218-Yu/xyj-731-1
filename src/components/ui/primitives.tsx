// 基础 UI 原语：Button / Card / Badge / IconButton，保持视觉统一
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';
import clsx from 'clsx';

type Variant = 'primary' | 'ghost' | 'outline' | 'danger';
type Size = 'sm' | 'md' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-pine-900 text-paper-50 hover:bg-pine-700 shadow-soft border border-pine-950/20',
  ghost: 'bg-transparent text-pine-900 hover:bg-pine-900/10',
  outline:
    'bg-paper-50/70 text-pine-900 border border-pine-900/20 hover:bg-paper-200/70',
  danger:
    'bg-coral-500 text-white hover:bg-coral-600 shadow-soft border border-coral-600/30',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  icon: 'h-9 w-9 rounded-xl flex items-center justify-center',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={twMerge(
        clsx(
          'inline-flex items-center justify-center font-medium transition-all duration-150 select-none',
          'active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none',
          VARIANTS[variant],
          SIZES[size],
          className,
        ),
      )}
      {...props}
    >
      {children}
    </button>
  );
}

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={twMerge(clsx('panel-card p-4', className))}>{children}</div>
  );
}

interface BadgeProps {
  children: ReactNode;
  color?: string;
  className?: string;
}

export function Badge({ children, color = '#0f3d33', className }: BadgeProps) {
  return (
    <span
      className={twMerge(clsx('chip text-white', className))}
      style={{ backgroundColor: color }}
    >
      {children}
    </span>
  );
}
