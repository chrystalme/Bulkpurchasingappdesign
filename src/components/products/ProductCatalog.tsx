import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { ArrowLeft, Search, Filter, Star, Plus, RotateCcw } from 'lucide-react';
import type { Screen } from '../../App';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { apiClient } from '../../lib/api';
import type { Product } from '../../lib/types';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState, EmptyState } from '../ui/ErrorState';
import { fetchProducts } from '../../store/slices';
import { fetchGroups } from '../../store/slices/groupsSlice';
import {
  selectProducts,
  selectProductsLoading,
  selectProductsError,
} from '../../store/selectors';
import { sanitizeSearchInput, validateSearchInput } from '../../lib/sanitizer';
import { AddToGroupCartDialog } from './AddToGroupCartDialog';
import { useAuth } from '../../contexts/AuthContext';
import { getProductImage } from '../../lib/productImages';

interface ProductCatalogProps {
  navigate: (screen: Screen, groupId?: string) => void;
  groupId: string | null;
}

export function ProductCatalog({ navigate, groupId }: ProductCatalogProps) {
  const dispatch = useDispatch();
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [lowMoqOnly, setLowMoqOnly] = useState(false);
  const [showAddToCartDialog, setShowAddToCartDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Redux selectors
  const products = useSelector(selectProducts);
  const loading = useSelector(selectProductsLoading);
  const error = useSelector(selectProductsError);

  // Load products and groups on mount (only if not already loaded)
  useEffect(() => {
    if (products.length === 0) {
      dispatch(fetchProducts() as any);
    }
    dispatch(fetchGroups());
    loadCategories();
  }, [dispatch, products.length]);

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

  const handleRetry = () => {
    dispatch(fetchProducts() as any);
  };




  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      !selectedCategory ||
      selectedCategory === 'All' ||
      product.category === selectedCategory;
    const matchesMinPrice = !minPrice || product.bulkPrice >= parseFloat(minPrice);
    const matchesMaxPrice = !maxPrice || product.bulkPrice <= parseFloat(maxPrice);
    const matchesLowMoq = !lowMoqOnly || (product.moq || 0) <= 20;
    return matchesSearch && matchesCategory && matchesMinPrice && matchesMaxPrice && matchesLowMoq;
  });

  const handleAddToCart = (product: Product) => {
    // Buying requires an account — guests are sent to login first.
    if (!isAuthenticated) {
      navigate('login');
      return;
    }
    setSelectedProduct(product);
    setShowAddToCartDialog(true);
  };

  return (
    <div className='min-h-screen bg-[#F4F4F5]'>
      {/* Header */}
      <div className='bg-white border-b border-gray-200 p-4 lg:p-6 sticky top-0 z-10'>
        <div className='flex items-center gap-3 mb-3'>
          <Button
            variant='ghost'
            size='icon'
            onClick={() =>
              groupId ? navigate('group-detail', groupId) : navigate('home')
            }
          >
            <ArrowLeft className='w-5 h-5' />
          </Button>
          <h3>Product Catalog</h3>
        </div>

        {/* Search */}
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
          <Input
            placeholder='Search products...'
            value={searchQuery}
            onChange={e => {
              const value = e.target.value;
              if (validateSearchInput(value)) {
                setSearchQuery(sanitizeSearchInput(value));
              }
            }}
            className='pl-10 pr-10'
            maxLength={200}
          />
          <Button
            variant='ghost'
            size='icon'
            className='absolute right-0 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#0047AB]'
            onClick={() => setIsFilterOpen(true)}
          >
            <Filter className='w-5 h-5' />
          </Button>
        </div>

        {/* Category Filters */}
        <div className='flex gap-2 mt-3 overflow-x-auto pb-2'>
          {categories.map(category => (
            <Badge
              key={category}
              variant={
                selectedCategory === category ||
                (category === 'All' && !selectedCategory)
                  ? 'default'
                  : 'outline'
              }
              className={`cursor-pointer whitespace-nowrap ${
                selectedCategory === category ||
                (category === 'All' && !selectedCategory)
                  ? 'bg-[#0047AB] hover:bg-[#0047AB]/90'
                  : ''
              }`}
              onClick={() =>
                setSelectedCategory(category === 'All' ? null : category)
              }
            >
              {category}
            </Badge>
          ))}
        </div>
      </div>

      {!loading && !error && !groupId && (
        <div className='px-4 lg:px-6 pt-4'>
          <EmptyState
            title='No group selected'
            description='Browse products freely, then create or join a group to add items to cart.'
            icon={Search}
          />
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className='p-4 lg:p-6'>
          <LoadingState count={8} />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className='p-4 lg:p-6'>
          <ErrorState
            title='Failed to load products'
            description={error}
            onRetry={handleRetry}
            showRetry={true}
          />
        </div>
      )}

      {/* Products Grid */}
      {!loading && !error && (
        <div className='p-4 lg:p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4'>
          {filteredProducts.map(product => (
            <Card
              key={product.id}
              className='cursor-pointer hover:shadow-md transition-shadow'
            >
              <CardContent className='p-3'>
                <div className='w-full h-32 bg-gray-100 rounded-lg mb-3 overflow-hidden'>
                  <ImageWithFallback
                    src={getProductImage(product.image)}
                    alt={product.name}
                    className='w-full h-full object-cover'
                  />
                </div>

                <div className='mb-2'>
                  <h5 className='line-clamp-2 mb-1'>{product.name}</h5>
                  <div className='flex items-center gap-1 text-sm text-gray-500'>
                    <Star className='w-3 h-3 fill-[#FACC15] text-[#FACC15]' />
                    <span>{product.vendorRating}</span>
                    <span className='mx-1'>•</span>
                    <span className='truncate'>{product.vendorName}</span>
                  </div>
                </div>

                <div className='space-y-2'>
                  <div className='flex items-baseline gap-2'>
                    <span className='text-[#0047AB]'>₦{product.bulkPrice}</span>
                    <span className='text-gray-400 line-through text-sm'>
                      ₦{product.retailPrice}
                    </span>
                  </div>

                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-xs font-semibold text-[#0047AB] bg-[#0047AB]/10 px-2 py-0.5 rounded-full'>
                      MOQ: {product.moq} units
                    </span>
                    {product.retailPrice > 0 && product.bulkPrice < product.retailPrice && (
                      <Badge
                        variant='secondary'
                        className='bg-[#FACC15]/20 text-[#0047AB] font-bold'
                      >
                        -
                        {Math.round(
                          ((product.retailPrice - product.bulkPrice) /
                            product.retailPrice) *
                            100,
                        )}
                        %
                      </Badge>
                    )}
                  </div>

                  <Button
                    className='w-full bg-[#6EE7B7] hover:bg-[#6EE7B7]/90 text-[#0047AB]'
                    size='sm'
                    onClick={() => handleAddToCart(product)}
                  >
                    <Plus className='w-4 h-4 mr-1' />
                    Add to Cart
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddToGroupCartDialog
        open={showAddToCartDialog}
        onClose={() => {
          setShowAddToCartDialog(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        navigate={navigate}
      />

      {/* Empty State */}
      {!loading && !error && filteredProducts.length === 0 && (
        <div className='flex flex-col items-center justify-center p-12 text-center'>
          <Search className='w-16 h-16 text-gray-300 mb-4' />
          <h4 className='text-gray-500 mb-2'>
            {products.length === 0 ? 'No products available' : 'No products found'}
          </h4>
          <p className='text-gray-400'>
            {products.length === 0
              ? 'Please check back later for new listings.'
              : 'Try adjusting your search or filters'}
          </p>
        </div>
      )}

      {/* Filter Dialog */}
      <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-[#0047AB]" />
              Filter Products
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Price Range (₦)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Input
                    type="number"
                    placeholder="Min Price"
                    value={minPrice}
                    onChange={e => setMinPrice(e.target.value)}
                  />
                </div>
                <div>
                  <Input
                    type="number"
                    placeholder="Max Price"
                    value={maxPrice}
                    onChange={e => setMaxPrice(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Category</Label>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <Button
                    key={cat}
                    type="button"
                    variant={selectedCategory === cat || (!selectedCategory && cat === 'All') ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-full text-xs"
                    onClick={() => setSelectedCategory(cat === 'All' ? null : cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={lowMoqOnly}
                  onChange={e => setLowMoqOnly(e.target.checked)}
                  className="rounded text-[#0047AB] focus:ring-[#0047AB]"
                />
                <span className="font-medium text-gray-800">Low MOQ Only (≤ 20 units)</span>
              </label>
            </div>
          </div>

          <DialogFooter className="flex justify-between sm:justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setMinPrice('');
                setMaxPrice('');
                setLowMoqOnly(false);
                setSelectedCategory(null);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
            <Button
              type="button"
              className="bg-[#0047AB] hover:bg-[#0047AB]/90 text-white"
              onClick={() => setIsFilterOpen(false)}
            >
              Apply Filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
