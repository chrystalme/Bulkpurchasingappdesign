import { useState } from 'react';
import { ArrowLeft, Plus, Search, Edit, Trash2, Eye, Package } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Screen } from '../../App';
import { mockProducts } from '../../lib/mockData';

interface VendorProductsProps {
  navigate: (screen: Screen) => void;
  vendorId?: string;
}

export function VendorProducts({ navigate, vendorId = '5' }: VendorProductsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const vendorProducts = mockProducts.filter(p => p.vendorId === vendorId);
  
  const filteredProducts = vendorProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(vendorProducts.map(p => p.category))];

  return (
    <div className="min-h-screen bg-[#F4F4F5] pb-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('vendor-dashboard')} className="p-1">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex-1">
            <h1 className="font-semibold text-gray-900">My Products</h1>
            <p className="text-xs text-gray-500">{vendorProducts.length} products listed</p>
          </div>
          <Button
            onClick={() => navigate('vendor-add-product')}
            size="sm"
            className="bg-[#0047AB] hover:bg-[#0047AB]/90"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Products List */}
      <div className="p-4 space-y-3">
        {filteredProducts.length === 0 ? (
          <Card className="p-8">
            <div className="text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">No products found</p>
              <p className="text-sm text-gray-500 mb-4">
                {searchQuery ? 'Try a different search term' : 'Start by adding your first product'}
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => navigate('vendor-add-product')}
                  className="bg-[#0047AB] hover:bg-[#0047AB]/90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              )}
            </div>
          </Card>
        ) : (
          filteredProducts.map((product) => (
            <Card key={product.id} className="p-4">
              <div className="flex gap-4">
                <div className="w-20 h-20 rounded-lg bg-[#0047AB]/10 flex items-center justify-center flex-shrink-0">
                  <Package className="w-10 h-10 text-[#0047AB]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
                      <Badge variant="secondary" className="bg-gray-100 text-gray-700 text-xs">
                        {product.category}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div>
                      <p className="text-xs text-gray-600">Bulk Price</p>
                      <p className="text-sm font-semibold text-[#10B981]">${product.bulkPrice}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Retail Price</p>
                      <p className="text-sm text-gray-900 line-through">${product.retailPrice}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">MOQ</p>
                      <p className="text-sm font-semibold text-gray-900">{product.moq} units</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" className="text-[#FB7185] border-[#FB7185]/20 hover:bg-[#FB7185]/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
