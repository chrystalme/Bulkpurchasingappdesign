import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import { 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Users,
  Star,
} from 'lucide-react';
import { apiClient } from '../../lib/api';
import type { VendorStats } from '../../lib/types/vendor.types';

type DateRange = '7d' | '30d' | '90d' | '1y';

interface VendorMetric {
  label: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
}

interface ChartData {
  month: string;
  revenue: number;
}

export function VendorAnalytics({ vendorId = '5' }: { vendorId?: string }) {
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [chartData, setChartData] = useState<ChartData[]>([]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const vid = Number(vendorId);
      const response = await apiClient.vendors.getDashboard(vid);
      if (response.success && response.data) {
        setStats(response.data);
        // Generate mock chart data based on date range
        generateChartData(dateRange);
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = (range: DateRange) => {
    const data: ChartData[] = [];
    const now = new Date();
    let monthsBack = 0;

    switch (range) {
      case '7d':
        monthsBack = 1;
        break;
      case '30d':
        monthsBack = 1;
        break;
      case '90d':
        monthsBack = 3;
        break;
      case '1y':
        monthsBack = 12;
        break;
    }

    for (let i = monthsBack - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      data.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        revenue: Math.floor(Math.random() * 10000) + 2000,
      });
    }
    setChartData(data);
  };

  useEffect(() => {
    loadAnalytics();
  }, [vendorId]);

  useEffect(() => {
    generateChartData(dateRange);
  }, [dateRange]);

  const handleRetry = async () => {
    await loadAnalytics();
  };

  if (loading && !stats) {
    return (
      <div className="space-y-4">
        <div className="h-12" />
        <LoadingState count={4} />
      </div>
    );
  }

  if (error && !stats) {
    return <ErrorState onRetry={handleRetry} />;
  }

  const metrics: VendorMetric[] = stats
    ? [
        {
          label: 'Total Revenue',
          value: `$${stats.totalRevenue.toLocaleString()}`,
          change: 12.5,
          icon: <DollarSign className="h-8 w-8" />,
          color: 'bg-green-100 text-green-700',
        },
        {
          label: 'Monthly Revenue',
          value: `$${stats.monthlyRevenue.toLocaleString()}`,
          change: 8.3,
          icon: <TrendingUp className="h-8 w-8" />,
          color: 'bg-blue-100 text-blue-700',
        },
        {
          label: 'Total Orders',
          value: stats.totalOrders,
          change: 5.2,
          icon: <Package className="h-8 w-8" />,
          color: 'bg-purple-100 text-purple-700',
        },
        {
          label: 'Total Customers',
          value: stats.totalCustomers,
          change: 3.1,
          icon: <Users className="h-8 w-8" />,
          color: 'bg-orange-100 text-orange-700',
        },
      ]
    : [];

  const maxRevenue = Math.max(...chartData.map((d) => d.revenue));
  const avgRevenue = Math.round(chartData.reduce((acc, d) => acc + d.revenue, 0) / chartData.length);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendor Analytics</h1>
          <p className="text-gray-600 mt-1">Track sales performance and key metrics</p>
        </div>
        <Select value={dateRange} onValueChange={(value) => setDateRange(value as DateRange)}>
          <SelectTrigger className="w-40 text-gray-900">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">{metric.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{metric.value}</p>
                  {metric.change !== undefined && (
                    <div className="flex items-center mt-2 text-xs">
                      {metric.change >= 0 ? (
                        <>
                          <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                          <span className="text-green-600 font-medium">+{metric.change}%</span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                          <span className="text-red-600 font-medium">{metric.change}%</span>
                        </>
                      )}
                      <span className="text-gray-500 ml-1">vs last period</span>
                    </div>
                  )}
                </div>
                <div className={`${metric.color} p-3 rounded-lg`}>{metric.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Sales performance over selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-64 flex items-flex-end gap-2 bg-gray-50 p-4 rounded-lg">
                {chartData.map((data, idx) => {
                  const heightPercent = (data.revenue / maxRevenue) * 100;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center justify-end gap-2">
                      <div className="w-full bg-blue-600 rounded-t-lg hover:bg-blue-700 transition-colors" style={{ height: `${heightPercent}%`, minHeight: '20px' }} title={`$${data.revenue}`} />
                      <span className="text-xs text-gray-600 text-center">{data.month}</span>
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-3 gap-4 border-t pt-4">
                <div>
                  <p className="text-xs text-gray-600 font-medium">Highest</p>
                  <p className="text-lg font-bold text-gray-900">${maxRevenue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Average</p>
                  <p className="text-lg font-bold text-gray-900">${avgRevenue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Total</p>
                  <p className="text-lg font-bold text-gray-900">
                    ${chartData.reduce((acc, d) => acc + d.revenue, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance</CardTitle>
            <CardDescription>Key metrics summary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Customer Satisfaction</span>
                  <Badge className="bg-green-100 text-green-800">
                    {Number(stats?.averageRating).toFixed(1)} / 5
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-400 h-2 rounded-full transition-all"
                    style={{ width: `${(stats?.averageRating || 0) * 20}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Product Catalog</span>
                  <Badge variant="outline">{stats?.totalProducts} items</Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: '75%' }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Order Fulfillment</span>
                  <Badge className="bg-blue-100 text-blue-800">
                    {stats && stats.totalOrders > 0
                      ? Math.round(((stats.totalOrders - stats.pendingOrders) / stats.totalOrders) * 100)
                      : 0}
                    %
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{
                      width:
                        stats && stats.totalOrders > 0
                          ? `${((stats.totalOrders - stats.pendingOrders) / stats.totalOrders) * 100}%`
                          : '0%',
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Reviews</span>
                  <span className="font-semibold text-gray-900 flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {stats?.totalReviews}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Pending Orders</span>
                  <span className="font-semibold text-gray-900">{stats?.pendingOrders}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Products</CardTitle>
          <CardDescription>Best performing items</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'Industrial Supplies Bundle', sales: 245, revenue: '$12,250' },
              { name: 'Premium Hardware Kit', sales: 189, revenue: '$9,450' },
              { name: 'Bulk Office Equipment', sales: 156, revenue: '$7,800' },
              { name: 'Wholesale Packaging', sales: 142, revenue: '$5,680' },
              { name: 'Industrial Tools Set', sales: 118, revenue: '$4,720' },
            ].map((product, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <p className="text-xs text-gray-600">{product.sales} sales</p>
                </div>
                <p className="font-semibold text-gray-900">{product.revenue}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="mt-4">
          <ErrorState onRetry={handleRetry} showRetry={true} />
        </div>
      )}
    </div>
  );
}
