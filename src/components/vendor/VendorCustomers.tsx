import { useState } from 'react';
import { ArrowLeft, Search, Star, Users, Mail } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Screen } from '../../App';
import { mockVendorCustomers } from '../../lib/mockData';

interface VendorCustomersProps {
  navigate: (screen: Screen) => void;
}

export function VendorCustomers({ navigate }: VendorCustomersProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCustomers = mockVendorCustomers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTrustScoreColor = (score: number) => {
    if (score >= 90) return 'text-[#10B981]';
    if (score >= 75) return 'text-[#6EE7B7]';
    if (score >= 60) return 'text-[#FACC15]';
    return 'text-[#FB7185]';
  };

  return (
    <div className="min-h-screen bg-[#F4F4F5] pb-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('vendor-dashboard')} className="p-1">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex-1">
            <h1 className="font-semibold text-gray-900">Customers</h1>
            <p className="text-xs text-gray-500">{mockVendorCustomers.length} total customers</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Customer Stats */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0047AB]/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-[#0047AB]" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Total Customers</p>
                <p className="text-lg font-semibold text-gray-900">{mockVendorCustomers.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#10B981]/10 flex items-center justify-center">
                <Star className="w-5 h-5 text-[#10B981]" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Avg. Trust Score</p>
                <p className="text-lg font-semibold text-gray-900">
                  {(mockVendorCustomers.reduce((sum, c) => sum + c.trustScore, 0) / mockVendorCustomers.length).toFixed(0)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Customers List */}
        <div className="space-y-3">
          {filteredCustomers.length === 0 ? (
            <Card className="p-8">
              <div className="text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-2">No customers found</p>
                <p className="text-sm text-gray-500">Try a different search term</p>
              </div>
            </Card>
          ) : (
            filteredCustomers.map((customer) => (
              <Card key={customer.id} className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={customer.avatar} />
                    <AvatarFallback>{customer.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-0.5">{customer.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Mail className="w-3 h-3" />
                          <span>{customer.email}</span>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                        <Star className={`w-3 h-3 mr-1 ${getTrustScoreColor(customer.trustScore)}`} fill="currentColor" />
                        {customer.trustScore}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-600">Orders</p>
                        <p className="text-sm font-semibold text-gray-900">{customer.totalOrders}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Total Spent</p>
                        <p className="text-sm font-semibold text-[#10B981]">${customer.totalSpent.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Last Order</p>
                        <p className="text-sm text-gray-900">
                          {new Date(customer.lastOrderDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <Button variant="outline" size="sm" className="flex-1">
                        View Orders
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        Contact
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
