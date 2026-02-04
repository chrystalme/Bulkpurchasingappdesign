import { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { ArrowLeft, Search, Filter, Star, Plus } from 'lucide-react';
import type { Screen } from '../../App';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { toast } from 'sonner@2.0.3';
import { apiClient } from '../../lib/api';
import type { Product } from '../../lib/types';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState, EmptyState } from '../ui/ErrorState';

interface ProductCatalogProps {
  navigate: (screen: Screen, groupId?: string) => void;
  groupId: string | null;
}

export function ProductCatalog({ navigate, groupId }: ProductCatalogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load products on mount
  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.products.getAll();
      if (response.success && response.data) {
        setProducts(response.data);
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await apiClient.products.getCategories();
      if (response.success && response.data) {
        setCategories(['All', ...response.data]);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddToCart = (productName: string) => {
    toast.success(`${productName} added to group cart!`);
  };

  const productImages = {
    'rice-bag': 'https://images.unsplash.com/photo-1633536706496-873ce0d46277?w=400&h=300&fit=crop',
    'lightbulbs': 'https://images.unsplash.com/photo-1696269568998-2008e2b7cd59?w=400&h=300&fit=crop',
    'paper': 'https://images.unsplash.com/photo-1705682644779-ba6b02ae3fb2?w=400&h=300&fit=crop',
    'olive-oil': 'https://images.unsplash.com/photo-1621244320421-cc9782f5ce28?w=400&h=300&fit=crop',
    'usb-cables': 'https://images.unsplash.com/photo-1696269568998-2008e2b7cd59?w=400&h=300&fit=crop',
    'printer-paper': 'https://images.unsplash.com/photo-1705682644779-ba6b02ae3fb2?w=400&h=300&fit=crop',
  };

  return (
    <div className="min-h-screen bg-[#F4F4F5]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 lg:p-6 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('group-detail', groupId)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h3>Product Catalog</h3>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2"
          >
            <Filter className="w-5 h-5" />
          </Button>
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
          {categories.map((category) => (
            <Badge
              key={category}
              variant={selectedCategory === category || (category === 'All' && !selectedCategory) ? 'default' : 'outline'}
              className={`cursor-pointer whitespace-nowrap ${
                selectedCategory === category || (category === 'All' && !selectedCategory)
                  ? 'bg-[#0047AB] hover:bg-[#0047AB]/90'
                  : ''
              }`}
              onClick={() => setSelectedCategory(category === 'All' ? null : category)}
            >
              {category}
            </Badge>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="p-4 lg:p-6">
          <LoadingState count={8} />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-4 lg:p-6">
          <ErrorState
            title="Failed to load products"
            description={error}
            onRetry={loadProducts}
            showRetry={true}
          />
        </div>
      )}

      {/* Products Grid */}
      {!loading && !error && (
        <div className="p-4 lg:p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
          {filteredProducts.map((product) => (
            <Card
              key={product.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
            >
              <CardContent className="p-3">
                <div className="w-full h-32 bg-gray-100 rounded-lg mb-3 overflow-hidden">
                  <ImageWithFallback
                    src={productImages[product.image as keyof typeof productImages]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="mb-2">
                  <h5 className="line-clamp-2 mb-1">{product.name}</h5>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Star className="w-3 h-3 fill-[#FACC15] text-[#FACC15]" />
                    <span>{product.vendorRating}</span>
                    <span className="mx-1">•</span>
                    <span className="truncate">{product.vendorName}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[#0047AB]">₦{product.bulkPrice}</span>
                    <span className="text-gray-400 line-through text-sm">₦{product.retailPrice}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">MOQ: {product.moq}</span>
                    <Badge variant="secondary" className="bg-[#FACC15]/20 text-[#0047AB]">
                      -{Math.round(((product.retailPrice - product.bulkPrice) / product.retailPrice) * 100)}%
                    </Badge>
                  </div>

                  <Button
                    className="w-full bg-[#6EE7B7] hover:bg-[#6EE7B7]/90 text-[#0047AB]"
                    size="sm"
                    onClick={() => handleAddToCart(product.name)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add to Cart
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredProducts.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <Search className="w-16 h-16 text-gray-300 mb-4" />
          <h4 className="text-gray-500 mb-2">No products found</h4>
          <p className="text-gray-400">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}