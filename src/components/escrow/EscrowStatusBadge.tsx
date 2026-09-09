import { Badge } from '../ui/badge';
import { Shield, Lock, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface EscrowStatusBadgeProps {
  status: 'locked' | 'pending_inspection' | 'released' | 'disputed' | 'refunded';
  className?: string;
}

export function EscrowStatusBadge({ status, className = '' }: EscrowStatusBadgeProps) {
  const statusConfig = {
    locked: {
      label: 'Funds Locked',
      icon: Lock,
      variant: 'secondary' as const,
      className: 'bg-[#0047AB]/10 text-[#0047AB] border-[#0047AB]/20',
    },
    pending_inspection: {
      label: 'Pending Inspection',
      icon: Shield,
      variant: 'default' as const,
      className: 'bg-[#FACC15]/10 text-[#FACC15] border-[#FACC15]/20',
    },
    released: {
      label: 'Funds Released',
      icon: CheckCircle2,
      variant: 'default' as const,
      className: 'bg-[#6EE7B7]/10 text-[#10B981] border-[#6EE7B7]/20',
    },
    disputed: {
      label: 'Disputed',
      icon: AlertTriangle,
      variant: 'destructive' as const,
      className: 'bg-[#FB7185]/10 text-[#FB7185] border-[#FB7185]/20',
    },
    refunded: {
      label: 'Refunded',
      icon: XCircle,
      variant: 'secondary' as const,
      className: 'bg-gray-100 text-gray-700 border-gray-200',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`${config.className} flex items-center gap-1 px-3 py-1 ${className}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{config.label}</span>
    </Badge>
  );
}
