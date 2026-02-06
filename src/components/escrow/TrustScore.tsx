import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Shield, CheckCircle2, Star, TrendingUp } from 'lucide-react';
import { TrustScore as TrustScoreType } from '../../lib/mockData';
import { Progress } from '../ui/progress';

interface TrustScoreProps {
  trustScore: TrustScoreType;
  variant?: 'full' | 'compact';
  className?: string;
}

export function TrustScore({ trustScore, variant = 'full', className = '' }: TrustScoreProps) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-[#10B981]';
    if (score >= 75) return 'text-[#6EE7B7]';
    if (score >= 60) return 'text-[#FACC15]';
    return 'text-[#FB7185]';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Improvement';
  };

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Shield className={`w-4 h-4 ${getScoreColor(trustScore.score)}`} />
        <span className={`font-semibold ${getScoreColor(trustScore.score)}`}>
          {trustScore.score}
        </span>
        <span className="text-xs text-gray-500">{getScoreLabel(trustScore.score)}</span>
      </div>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="space-y-6">
        {/* Trust Score Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Trust Score</h3>
            <p className="text-sm text-gray-500">Based on transaction history and behavior</p>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-bold ${getScoreColor(trustScore.score)}`}>
              {trustScore.score}
            </div>
            <p className="text-sm text-gray-500">{getScoreLabel(trustScore.score)}</p>
          </div>
        </div>

        <Progress value={trustScore.score} className="h-2" />

        {/* Transaction Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Completed Transactions</p>
            <p className="text-lg font-semibold text-gray-900">
              {trustScore.completedTransactions}/{trustScore.totalTransactions}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Dispute Rate</p>
            <p className="text-lg font-semibold text-gray-900">{trustScore.disputeRate}%</p>
          </div>
        </div>

        {/* Ratings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-[#FACC15]" fill="#FACC15" />
            <div>
              <p className="text-xs text-gray-500">Buyer Rating</p>
              <p className="text-sm font-semibold text-gray-900">{Number(trustScore.buyerRating).toFixed(1)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-[#FACC15]" fill="#FACC15" />
            <div>
              <p className="text-xs text-gray-500">Seller Rating</p>
              <p className="text-sm font-semibold text-gray-900">{Number(trustScore.sellerRating).toFixed(1)}</p>
            </div>
          </div>
        </div>

        {/* Verifications */}
        <div>
          <p className="text-xs text-gray-500 mb-3">Verifications</p>
          <div className="flex flex-wrap gap-2">
            {trustScore.verifications.idVerified && (
              <Badge variant="secondary" className="bg-[#6EE7B7]/10 text-[#10B981] border-[#6EE7B7]/20">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                ID Verified
              </Badge>
            )}
            {trustScore.verifications.businessVerified && (
              <Badge variant="secondary" className="bg-[#6EE7B7]/10 text-[#10B981] border-[#6EE7B7]/20">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Business Verified
              </Badge>
            )}
            {trustScore.verifications.emailVerified && (
              <Badge variant="secondary" className="bg-[#6EE7B7]/10 text-[#10B981] border-[#6EE7B7]/20">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Email Verified
              </Badge>
            )}
            {trustScore.verifications.phoneVerified && (
              <Badge variant="secondary" className="bg-[#6EE7B7]/10 text-[#10B981] border-[#6EE7B7]/20">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Phone Verified
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
