import { ReactNode } from 'react';
import { Button } from '../../ui/button';

interface QuickActionGridProps {
  actions: Array<{
    icon: ReactNode;
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
  }>;
  columns?: number;
}

export function QuickActionGrid({ actions, columns = 2 }: QuickActionGridProps) {
  const colsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  }[columns] || 'grid-cols-2';

  return (
    <div className={`grid ${colsClass} gap-3`}>
      {actions.map((action, index) => (
        <Button
          key={index}
          onClick={action.onClick}
          variant={action.variant === 'primary' ? 'default' : action.variant === 'outline' ? 'outline' : 'secondary'}
          className={`flex flex-col items-center justify-center gap-2 h-24 ${
            action.variant === 'primary' ? 'bg-[#0047AB] text-white' : ''
          }`}
        >
          <span className="text-2xl">{action.icon}</span>
          <span className="text-xs text-center leading-tight">{action.label}</span>
        </Button>
      ))}
    </div>
  );
}
