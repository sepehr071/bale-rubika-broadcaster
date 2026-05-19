import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface-2/40 px-6 py-10 text-center',
        className,
      )}
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-3 text-ink-2">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-ink-muted">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
