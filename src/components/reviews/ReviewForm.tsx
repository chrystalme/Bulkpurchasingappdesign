import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { ArrowLeft, Star, CheckCircle2 } from 'lucide-react';
import type { Screen } from '../../App';

interface ReviewFormProps {
  navigate: (screen: Screen) => void;
}

export function ReviewForm({ navigate }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const vendor = {
    id: '1',
    name: 'Fresh Farm Collective',
    rating: 4.8,
    image: 'https://api.dicebear.com/7.x/initials/svg?seed=FFC',
  };

  const handleSubmit = () => {
    setShowConfirmation(true);
    setTimeout(() => {
      setShowConfirmation(false);
      navigate('home');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#F4F4F5]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 lg:p-6 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('tracking')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h3>Rate Your Experience</h3>
        </div>
      </div>

      <div className="p-4 lg:p-6">
        <div className="max-w-2xl mx-auto space-y-4">
        {/* Vendor Info */}
        <Card className="bg-gradient-to-br from-[#0047AB]/5 to-[#6EE7B7]/5">
          <CardContent className="p-6 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-white rounded-full flex items-center justify-center shadow-sm">
              <Avatar className="h-16 w-16">
                <AvatarImage src={vendor.image} />
                <AvatarFallback>FF</AvatarFallback>
              </Avatar>
            </div>
            <h4 className="mb-1">{vendor.name}</h4>
            <div className="flex items-center justify-center gap-1">
              <Star className="w-4 h-4 fill-[#FACC15] text-[#FACC15]" />
              <span className="text-sm text-gray-600">{vendor.rating} average rating</span>
            </div>
          </CardContent>
        </Card>

        {/* Rating */}
        <Card>
          <CardContent className="p-6">
            <h4 className="mb-4 text-center">How was your experience?</h4>
            <div className="flex items-center justify-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-10 h-10 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-[#FACC15] text-[#FACC15]'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-gray-500">
              {rating === 0 && 'Tap to rate'}
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
            </p>
          </CardContent>
        </Card>

        {/* Review Text */}
        <Card>
          <CardContent className="p-4">
            <h4 className="mb-3">Share Your Experience</h4>
            <Textarea
              placeholder="Tell others about your experience with this vendor. What did you like? What could be improved?"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-sm text-gray-500 mt-2">
              {review.length} / 500 characters
            </p>
          </CardContent>
        </Card>

        {/* Quick Tags */}
        <Card>
          <CardContent className="p-4">
            <h4 className="mb-3">Quick Tags (Optional)</h4>
            <div className="flex flex-wrap gap-2">
              {[
                'Fast Delivery',
                'Great Quality',
                'Good Communication',
                'Fair Pricing',
                'Professional',
                'Would Buy Again',
              ].map((tag) => (
                <Button
                  key={tag}
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                >
                  {tag}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          className="w-full bg-[#0047AB] hover:bg-[#0047AB]/90"
          size="lg"
          onClick={handleSubmit}
          disabled={rating === 0}
        >
          Submit Review
        </Button>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate('home')}
        >
          Skip for Now
        </Button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              <div className="w-16 h-16 bg-[#6EE7B7]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-[#6EE7B7]" />
              </div>
              Thank You!
            </DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-2">
            <p className="text-gray-600">
              Your review has been submitted successfully.
            </p>
            <p className="text-sm text-gray-500">
              It will help others make better purchasing decisions.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}