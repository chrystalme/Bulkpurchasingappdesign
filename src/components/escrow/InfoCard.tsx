import { ReactNode } from 'react';
import { Card } from '../ui/card';
import { LucideIcon } from 'lucide-react';

interface InfoCardProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  variant?: 'default' | 'info' | 'warning' | 'success' | 'danger';
  children?: ReactNode;
  className?: string;
}

export function InfoCard({ 
  icon: Icon, 
  title, 
  description, 
  variant = 'default', 
  children,
  className = '' 
}: InfoCardProps) {
  const variantStyles = {
    default: 'bg-white border-gray-200',
    info: 'bg-[#0047AB]/5 border-[#0047AB]/20',
    warning: 'bg-[#FACC15]/5 border-[#FACC15]/20',
    success: 'bg-[#6EE7B7]/5 border-[#6EE7B7]/20',
    danger: 'bg-[#FB7185]/5 border-[#FB7185]/20',
  };

  const iconStyles = {
    default: 'text-gray-500',
    info: 'text-[#0047AB]',
    warning: 'text-[#FACC15]',
    success: 'text-[#10B981]',
    danger: 'text-[#FB7185]',
  };

  return (
    <Card className={`p-4 ${variantStyles[variant]} ${className}`}>
      <div className="flex gap-3">
        {Icon && (
          <div className="flex-shrink-0">
            <Icon className={`w-5 h-5 ${iconStyles[variant]}`} />
          </div>
        )}
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
          <p className="text-sm text-gray-600">{description}</p>
          {children && <div className="mt-3">{children}</div>}
        </div>
      </div>
    </Card>
  );
}
