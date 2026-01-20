import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  targetDate: string;
  label?: string;
  onExpire?: () => void;
  className?: string;
}

export function CountdownTimer({ targetDate, label, onExpire, className = '' }: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({ hours: 0, minutes: 0, seconds: 0, isExpired: false });

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeRemaining({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
        if (onExpire) onExpire();
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeRemaining({ hours, minutes, seconds, isExpired: false });
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [targetDate, onExpire]);

  const formatTime = (num: number) => String(num).padStart(2, '0');

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Clock className="w-4 h-4 text-gray-500" />
      {label && <span className="text-sm text-gray-600">{label}</span>}
      <div className="flex items-center gap-1 font-mono">
        <span className={`text-lg ${timeRemaining.isExpired ? 'text-[#FB7185]' : 'text-[#0047AB]'}`}>
          {formatTime(timeRemaining.hours)}:{formatTime(timeRemaining.minutes)}:{formatTime(timeRemaining.seconds)}
        </span>
        {!timeRemaining.isExpired && <span className="text-xs text-gray-500">remaining</span>}
        {timeRemaining.isExpired && <span className="text-xs text-[#FB7185]">expired</span>}
      </div>
    </div>
  );
}
