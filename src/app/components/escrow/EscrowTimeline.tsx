import { CheckCircle2, Circle, Clock, Shield, Package, Eye, DollarSign } from 'lucide-react';
import { EscrowTransaction } from '../../lib/mockData';

interface EscrowTimelineProps {
  transaction: EscrowTransaction;
  className?: string;
}

interface TimelineStep {
  id: string;
  label: string;
  icon: any;
  completed: boolean;
  active: boolean;
  timestamp?: string;
}

export function EscrowTimeline({ transaction, className = '' }: EscrowTimelineProps) {
  const getSteps = (): TimelineStep[] => {
    const steps: TimelineStep[] = [
      {
        id: 'paid',
        label: 'Payment Secured',
        icon: DollarSign,
        completed: !!transaction.paidAt,
        active: false,
        timestamp: transaction.paidAt,
      },
      {
        id: 'shipped',
        label: 'Order Shipped',
        icon: Package,
        completed: !!transaction.shippedAt,
        active: transaction.status === 'locked' && !!transaction.paidAt && !transaction.shippedAt,
        timestamp: transaction.shippedAt,
      },
      {
        id: 'delivered',
        label: 'Delivered',
        icon: CheckCircle2,
        completed: !!transaction.deliveredAt,
        active: !!transaction.shippedAt && !transaction.deliveredAt,
        timestamp: transaction.deliveredAt,
      },
      {
        id: 'inspect',
        label: 'Inspection',
        icon: Eye,
        completed: transaction.status === 'released',
        active: transaction.status === 'pending_inspection',
        timestamp: undefined,
      },
      {
        id: 'released',
        label: 'Funds Released',
        icon: Shield,
        completed: transaction.status === 'released',
        active: false,
        timestamp: transaction.releasedAt,
      },
    ];

    return steps;
  };

  const steps = getSteps();

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`${className}`}>
      <div className="relative">
        {/* Desktop/Tablet: Horizontal Timeline */}
        <div className="hidden md:block">
          <div className="flex items-start justify-between relative">
            {/* Progress Line */}
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200">
              <div
                className="h-full bg-[#0047AB] transition-all duration-500"
                style={{
                  width: `${(steps.filter((s) => s.completed).length / (steps.length - 1)) * 100}%`,
                }}
              />
            </div>

            {/* Steps */}
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.id} className="flex flex-col items-center relative z-10" style={{ width: `${100 / steps.length}%` }}>
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      step.completed
                        ? 'bg-[#0047AB] border-[#0047AB] text-white'
                        : step.active
                        ? 'bg-white border-[#0047AB] text-[#0047AB] animate-pulse'
                        : 'bg-white border-gray-300 text-gray-400'
                    }`}
                  >
                    {step.completed ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <p className={`text-xs mt-2 text-center ${step.completed || step.active ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                    {step.label}
                  </p>
                  {step.timestamp && (
                    <p className="text-xs text-gray-400 mt-1 text-center">{formatTimestamp(step.timestamp)}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile: Vertical Timeline */}
        <div className="md:hidden space-y-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === steps.length - 1;

            return (
              <div key={step.id} className="relative flex gap-3">
                {/* Connector Line */}
                {!isLast && (
                  <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gray-200">
                    {step.completed && <div className="w-full bg-[#0047AB] h-full" />}
                  </div>
                )}

                {/* Icon */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 flex-shrink-0 transition-all ${
                    step.completed
                      ? 'bg-[#0047AB] border-[#0047AB] text-white'
                      : step.active
                      ? 'bg-white border-[#0047AB] text-[#0047AB] animate-pulse'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  {step.completed ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>

                {/* Content */}
                <div className="flex-1 pb-4">
                  <p className={`text-sm ${step.completed || step.active ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                    {step.label}
                  </p>
                  {step.timestamp && (
                    <p className="text-xs text-gray-400 mt-1">{formatTimestamp(step.timestamp)}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
