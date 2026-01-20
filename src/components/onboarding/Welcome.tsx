import { Button } from '../ui/button';
import { Users, ShoppingCart, DollarSign, TrendingDown } from 'lucide-react';

interface WelcomeProps {
  onGetStarted: () => void;
}

export function Welcome({ onGetStarted }: WelcomeProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 lg:p-12 bg-gradient-to-b from-[#0047AB] to-[#6EE7B7]">
      <div className="text-center space-y-8 max-w-2xl">
        <div className="relative w-64 h-64 lg:w-80 lg:h-80 mx-auto mb-8">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <div className="w-32 h-32 bg-white/30 rounded-full flex items-center justify-center">
                <Users className="w-16 h-16 text-white" />
              </div>
            </div>
          </div>
          <ShoppingCart className="absolute top-8 right-8 w-12 h-12 text-white animate-bounce" />
          <DollarSign className="absolute bottom-12 left-4 w-10 h-10 text-[#FACC15] animate-pulse" />
          <TrendingDown className="absolute top-16 left-8 w-10 h-10 text-[#6EE7B7]" />
        </div>

        <div className="space-y-4">
          <h1 className="text-white">Save Together,<br />Buy Smarter</h1>
          <p className="text-white/90 max-w-sm mx-auto">
            Join forces with friends and neighbors to unlock bulk discounts and save money on everyday purchases.
          </p>
        </div>

        <div className="space-y-3 pt-8 max-w-md mx-auto">
          <Button 
            onClick={onGetStarted}
            className="w-full bg-white text-[#0047AB] hover:bg-white/90"
            size="lg"
          >
            Get Started
          </Button>
          <Button 
            className="w-full bg-white/80 text-[#0047AB] border border-white hover:bg-white/70"
            size="lg"
          >
            Learn More
          </Button>
        </div>

        <div className="pt-6 flex items-center justify-center gap-4">
          <div className="flex items-center gap-2 text-white/80 text-sm">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <span>10K+ Users</span>
          </div>
          <div className="flex items-center gap-2 text-white/80 text-sm">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
            <span>40% Savings</span>
          </div>
        </div>
      </div>
    </div>
  );
}
