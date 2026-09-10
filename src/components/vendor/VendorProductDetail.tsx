import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  ArrowLeft,
  Edit,
  Package,
  Star,
  Store,
  CalendarDays,
  Hash,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import { apiClient } from '../../lib/api';
import { selectVendorProducts } from '../../store/selectors/vendorsSelectors';
import type { NavigateFn } from '../../App';
import type { Product } from '../../lib/types';
import { formatCurrency, formatDate } from '../../lib/formatters';

/** Product rows also carry columns the app does not model yet. */
type ProductRow = Product & {
  created_at?: string;
  is_active?: boolean;
};

interface VendorProductDetailProps {
  navigate: NavigateFn;
  productId?: string | null;
}

export function VendorProductDetail({
  navigate,
  productId,
}: VendorProductDetailProps) {
  // Paint immediately from the list already in the store, then confirm with the API.
  const storedProducts = useSelector(selectVendorProducts);
  const cached = storedProducts.find((p) => p.id === productId) as
    | ProductRow
    | undefined;

  const [product, setProduct] = useState<ProductRow | null>(cached ?? null);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadProduct = async () => {
      if (!productId) {
        setError('No product selected');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.products.getById(productId);
        if (cancelled) return;
        if (response.success && response.data) {
          setProduct(response.data as ProductRow);
        } else {
          setError(response.error || 'Product not found');
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message || 'Failed to load product');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProduct();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const handleBack = () => navigate('vendor-products');
  const handleEdit = () =>
    navigate('vendor-product-edit', undefined, product?.id ?? productId);

  const savingsPercent =
    product && product.retailPrice > 0 && product.bulkPrice < product.retailPrice
      ? Math.round(
          ((product.retailPrice - product.bulkPrice) / product.retailPrice) * 100,
        )
      : 0;

  if (loading && !product) {
    return (
      <div className="p-4">
        <LoadingState count={3} />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-4 space-y-4">
        <ErrorState onRetry={() => navigate('vendor-products')} />
        <Button variant="outline" className="w-full" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to products
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F4F5]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="p-1" aria-label="Back to products">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex-1">
            <h1 className="font-semibold text-gray-900">Product Details</h1>
            <p className="text-xs text-gray-500">How buyers see this listing</p>
          </div>
          <Button
            size="sm"
            onClick={handleEdit}
            className="bg-[#0047AB] hover:bg-[#003D96]"
          >
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        {/* Image + identity */}
        <Card className="p-4">
          <div className="w-full h-48 rounded-lg bg-[#EBF1FB] flex items-center justify-center mb-4">
            <Package className="w-16 h-16 text-[#0047AB]" />
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h2 className="font-semibold text-gray-900 mb-2">{product.name}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="secondary"
                  className="bg-gray-100 text-gray-700 text-xs"
                >
                  {product.category}
                </Badge>
                {product.is_active === false ? (
                  <Badge className="bg-gray-200 text-gray-700 text-xs">
                    Inactive
                  </Badge>
                ) : (
                  <Badge className="bg-[#6EE7B7]/30 text-[#064E3B] text-xs">
                    Active
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Pricing */}
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Pricing</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600">Bulk Price</p>
              <p className="text-xl font-bold text-[#10B981]">
                {formatCurrency(product.bulkPrice)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Per unit, at MOQ</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Retail Price</p>
              <p className="text-xl text-gray-500 line-through">
                {formatCurrency(product.retailPrice)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Market price</p>
            </div>
          </div>
          {savingsPercent > 0 && (
            <div className="mt-4 bg-[#6EE7B7]/10 border border-[#6EE7B7]/20 rounded-lg p-3">
              <p className="text-sm text-[#10B981]">
                Buyers save {savingsPercent}% per unit when buying in bulk
              </p>
            </div>
          )}
        </Card>

        {/* Listing details */}
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Listing Details</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 flex items-center gap-2">
                <Package className="w-4 h-4 text-gray-400" />
                Minimum Order Quantity
              </span>
              <span className="font-medium text-gray-900">
                {product.moq} units
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 flex items-center gap-2">
                <Store className="w-4 h-4 text-gray-400" />
                Vendor
              </span>
              <span className="font-medium text-gray-900">
                {product.vendorName || '—'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 flex items-center gap-2">
                <Star className="w-4 h-4 text-gray-400" />
                Vendor Rating
              </span>
              <span className="font-medium text-gray-900">
                {product.vendorRating ? product.vendorRating.toFixed(1) : '—'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-gray-400" />
                Listed
              </span>
              <span className="font-medium text-gray-900">
                {formatDate(product.created_at, undefined, 'Unknown')}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 flex items-center gap-2">
                <Hash className="w-4 h-4 text-gray-400" />
                Product ID
              </span>
              <span className="font-medium text-gray-900 text-xs">
                {product.id.slice(0, 8)}…
              </span>
            </div>
          </div>
        </Card>

        <div className="space-y-3 pt-2">
          <Button
            onClick={handleEdit}
            className="w-full bg-[#0047AB] hover:bg-[#003D96] text-white h-12"
          >
            <Edit className="w-5 h-5 mr-2" />
            Edit Product
          </Button>
          <Button variant="outline" onClick={handleBack} className="w-full h-12">
            Back to Products
          </Button>
        </div>
      </div>
    </div>
  );
}
