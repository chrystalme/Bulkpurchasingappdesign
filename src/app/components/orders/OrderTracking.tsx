import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ArrowLeft, Package, CreditCard, Truck, CheckCircle, MapPin } from 'lucide-react';
import type { Screen } from '../../App';

interface OrderTrackingProps {
  navigate: (screen: Screen) => void;
}

export function OrderTracking({ navigate }: OrderTrackingProps) {
  const order = {
    id: 'ORD-001',
    status: 'shipped',
    items: [
      { name: 'Premium Organic Rice (25kg)', quantity: 12 },
      { name: 'Olive Oil Extra Virgin (5L)', quantity: 8 },
    ],
    total: 194.96,
    ordered: '2025-10-28',
    paid: '2025-10-28',
    shipped: '2025-11-01',
    estimatedDelivery: '2025-11-05',
  };

  const statusSteps = [
    {
      id: 'ordered',
      label: 'Ordered',
      icon: Package,
      completed: true,
      date: order.ordered,
    },
    {
      id: 'paid',
      label: 'Payment Confirmed',
      icon: CreditCard,
      completed: true,
      date: order.paid,
    },
    {
      id: 'shipped',
      label: 'Shipped',
      icon: Truck,
      completed: true,
      date: order.shipped,
    },
    {
      id: 'delivered',
      label: 'Delivered',
      icon: CheckCircle,
      completed: false,
      date: order.estimatedDelivery,
    },
  ];

  const currentStepIndex = statusSteps.findIndex(step => step.id === order.status);

  return (
    <div className="min-h-screen bg-[#F4F4F5]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 lg:p-6 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('group-detail')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h3>Order Tracking</h3>
            <p className="text-sm text-gray-500">{order.id}</p>
          </div>
          <Badge className="bg-[#6EE7B7] text-[#0047AB]">
            {order.status}
          </Badge>
        </div>
      </div>

      <div className="p-4 lg:p-6">
        <div className="max-w-3xl mx-auto space-y-4">
        {/* Tracking Timeline */}
        <Card>
          <CardContent className="p-6">
            <h4 className="mb-6">Delivery Status</h4>
            <div className="relative">
              {statusSteps.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = step.completed;
                const isCurrent = index === currentStepIndex;

                return (
                  <div key={step.id} className="relative">
                    {index < statusSteps.length - 1 && (
                      <div
                        className={`absolute left-5 top-12 w-0.5 h-16 ${
                          isCompleted ? 'bg-[#6EE7B7]' : 'bg-gray-200'
                        }`}
                      />
                    )}
                    <div className="flex gap-4 pb-8">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isCompleted
                            ? 'bg-[#6EE7B7] text-white'
                            : isCurrent
                            ? 'bg-[#0047AB] text-white'
                            : 'bg-gray-200 text-gray-400'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 pt-1">
                        <div className="flex items-center justify-between mb-1">
                          <h5 className={isCompleted || isCurrent ? 'text-[#0047AB]' : 'text-gray-400'}>
                            {step.label}
                          </h5>
                          {(isCompleted || isCurrent) && (
                            <span className="text-sm text-gray-500">
                              {new Date(step.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          )}
                        </div>
                        {isCurrent && !isCompleted && (
                          <p className="text-sm text-gray-600">
                            Estimated: {new Date(step.date).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Live Tracking Map */}
        <Card>
          <CardContent className="p-0">
            <div className="w-full h-48 bg-gradient-to-br from-[#0047AB]/10 to-[#6EE7B7]/10 rounded-t-lg flex items-center justify-center relative overflow-hidden">
              {/* Mock Map Illustration */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-[#0047AB] rounded-full animate-pulse" />
                <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-[#6EE7B7] rounded-full animate-pulse" />
                <div className="absolute bottom-1/4 right-1/3 w-2 h-2 bg-[#0047AB] rounded-full animate-pulse" />
              </div>
              <div className="relative z-10 text-center">
                <MapPin className="w-12 h-12 text-[#0047AB] mx-auto mb-2" />
                <p className="text-sm text-gray-600">Your order is on the way!</p>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#0047AB]/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Truck className="w-5 h-5 text-[#0047AB]" />
                </div>
                <div className="flex-1">
                  <h5 className="mb-1">Out for Delivery</h5>
                  <p className="text-sm text-gray-600">
                    Your package is with our delivery partner and will arrive by {new Date(order.estimatedDelivery).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardContent className="p-4">
            <h4 className="mb-3">Order Items</h4>
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Package className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                      <h5 className="text-sm">{item.name}</h5>
                      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Delivery Details */}
        <Card>
          <CardContent className="p-4">
            <h4 className="mb-3">Delivery Address</h4>
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm">
                    123 Main Street, Victoria Island<br />
                    Lagos, Nigeria<br />
                    +234 801 234 5678
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardContent className="p-4">
            <h4 className="mb-3">Payment Summary</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span>₦{(order.total - 5).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Shipping</span>
                <span>₦5.00</span>
              </div>
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="flex items-center justify-between">
                  <span>Total Paid</span>
                  <span className="text-[#0047AB]">₦{order.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-2">
          <Button
            className="w-full bg-[#0047AB] hover:bg-[#0047AB]/90"
            onClick={() => navigate('review')}
          >
            Rate This Order
          </Button>
          <Button variant="outline" className="w-full">
            Contact Support
          </Button>
        </div>
        </div>
      </div>
    </div>
  );
}