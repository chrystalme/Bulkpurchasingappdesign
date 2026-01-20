import { useState } from 'react';
import { ArrowLeft, Plus, Upload, DollarSign } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Screen } from '../../App';
import { toast } from 'sonner';

interface VendorAddProductProps {
  navigate: (screen: Screen) => void;
}

export function VendorAddProduct({ navigate }: VendorAddProductProps) {
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [bulkPrice, setBulkPrice] = useState('');
  const [retailPrice, setRetailPrice] = useState('');
  const [moq, setMoq] = useState('');
  const [stock, setStock] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!productName || !category || !bulkPrice || !retailPrice || !moq) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      toast.success('Product added successfully!');
      navigate('vendor-products');
    }, 1500);
  };

  const savings = retailPrice && bulkPrice ? 
    (((parseFloat(retailPrice) - parseFloat(bulkPrice)) / parseFloat(retailPrice)) * 100).toFixed(0) : 0;

  return (
    <div className="min-h-screen bg-[#F4F4F5] pb-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('vendor-dashboard')} className="p-1">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex-1">
            <h1 className="font-semibold text-gray-900">Add New Product</h1>
            <p className="text-xs text-gray-500">Create a bulk purchase listing</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 max-w-2xl mx-auto space-y-4">
        {/* Product Images */}
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Product Images</h3>
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-[#0047AB]/10 flex items-center justify-center mx-auto mb-3">
              <Upload className="w-8 h-8 text-[#0047AB]" />
            </div>
            <p className="text-sm text-gray-600 mb-2">Upload product images</p>
            <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
            <Button type="button" variant="outline" size="sm" className="mt-3">
              Choose Files
            </Button>
          </div>
        </Card>

        {/* Basic Information */}
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Basic Information</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="productName">
                Product Name <span className="text-[#FB7185]">*</span>
              </Label>
              <Input
                id="productName"
                placeholder="e.g., Monocrystalline Solar Panel 300W"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="category">
                Category <span className="text-[#FB7185]">*</span>
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Solar Energy">Solar Energy</SelectItem>
                  <SelectItem value="Batteries">Batteries</SelectItem>
                  <SelectItem value="Electronics">Electronics</SelectItem>
                  <SelectItem value="Office Supplies">Office Supplies</SelectItem>
                  <SelectItem value="Groceries">Groceries</SelectItem>
                  <SelectItem value="Industrial">Industrial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Product Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your product, its features, and benefits..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>
          </div>
        </Card>

        {/* Pricing */}
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Pricing & MOQ</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="retailPrice">
                  Retail Price (₦) <span className="text-[#FB7185]">*</span>
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="retailPrice"
                    type="number"
                    step="0.01"
                    placeholder="299.99"
                    value={retailPrice}
                    onChange={(e) => setRetailPrice(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Original market price</p>
              </div>

              <div>
                <Label htmlFor="bulkPrice">
                  Bulk Price (₦) <span className="text-[#FB7185]">*</span>
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="bulkPrice"
                    type="number"
                    step="0.01"
                    placeholder="175.99"
                    value={bulkPrice}
                    onChange={(e) => setBulkPrice(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Your bulk discount price</p>
              </div>
            </div>

            {bulkPrice && retailPrice && parseFloat(bulkPrice) < parseFloat(retailPrice) && (
              <div className="bg-[#6EE7B7]/10 border border-[#6EE7B7]/20 rounded-lg p-3">
                <p className="text-sm text-[#10B981]">
                  💰 Customers save {savings}% when buying in bulk!
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="moq">
                  Minimum Order Quantity (MOQ) <span className="text-[#FB7185]">*</span>
                </Label>
                <Input
                  id="moq"
                  type="number"
                  placeholder="5"
                  value={moq}
                  onChange={(e) => setMoq(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Minimum units per order</p>
              </div>

              <div>
                <Label htmlFor="stock">Available Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  placeholder="100"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">Units in stock</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Shipping & Delivery */}
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Shipping Information</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="weight">Product Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                placeholder="15.5"
              />
            </div>

            <div>
              <Label htmlFor="deliveryTime">Estimated Delivery Time</Label>
              <Select defaultValue="3-5">
                <SelectTrigger id="deliveryTime">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-2">1-2 business days</SelectItem>
                  <SelectItem value="3-5">3-5 business days</SelectItem>
                  <SelectItem value="5-7">5-7 business days</SelectItem>
                  <SelectItem value="7-14">7-14 business days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Submit Buttons */}
        <div className="space-y-3 pt-2">
          <Button
            type="submit"
            disabled={isProcessing}
            className="w-full bg-[#0047AB] hover:bg-[#0047AB]/90 text-white h-12"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Adding Product...
              </div>
            ) : (
              <>
                <Plus className="w-5 h-5 mr-2" />
                Add Product
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('vendor-dashboard')}
            className="w-full h-12"
          >
            Cancel
          </Button>
        </div>

        {/* Tips */}
        <Card className="p-4 bg-gray-50 border-gray-200">
          <h4 className="font-medium text-gray-900 mb-2 text-sm">💡 Tips for Success</h4>
          <ul className="space-y-1 text-xs text-gray-600">
            <li>• Use high-quality images showing the product clearly</li>
            <li>• Set competitive bulk prices to attract group buyers</li>
            <li>• Keep MOQ reasonable (3-10 units typically works best)</li>
            <li>• Provide detailed descriptions including specifications</li>
            <li>• Update stock levels regularly to avoid overselling</li>
          </ul>
        </Card>
      </form>
    </div>
  );
}
