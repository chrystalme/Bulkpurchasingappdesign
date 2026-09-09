import { ReactNode } from 'react';
import { Card, CardContent } from '../../ui/card';

interface StatCardProps {
  icon?: ReactNode;
  label: string;
  value: string | number;
  suffix?: string;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'secondary';
  className?: string;
}

const colorStyles = {
  primary: 'bg-white/10 border-white/20',
  success: 'bg-green-50 border-green-200',
  warning: 'bg-yellow-50 border-yellow-200',
  danger: 'bg-red-50 border-red-200',
  secondary: 'bg-gray-50 border-gray-200',
};

const iconColorStyles = {
  primary: 'text-white',
  success: 'text-green-600',
  warning: 'text-yellow-600',
  danger: 'text-red-600',
  secondary: 'text-gray-600',
};

const valueColorStyles = {
  primary: 'text-white',
  success: 'text-green-900',
  warning: 'text-yellow-900',
  danger: 'text-red-900',
  secondary: 'text-gray-900',
};

export function StatCard({
  icon,
  label,
  value,
  suffix,
  color = 'secondary',
  className,
}: StatCardProps) {
  return (
    <Card className={`${colorStyles[color]} ${className || ''}`}>
      <CardContent className="p-3 text-center">
        {icon && (
          <div className={`w-5 h-5 ${iconColorStyles[color]} mx-auto mb-1`}>
            {icon}
          </div>
        )}
        <div className={valueColorStyles[color]}>
          {value}
          {suffix && <span className="text-xs ml-1">{suffix}</span>}
        </div>
        <div className={`text-xs ${color === 'primary' ? 'text-white/80' : 'text-gray-600'}`}>
          {label}
        </div>
      </CardContent>
    </Card>
  );
}
