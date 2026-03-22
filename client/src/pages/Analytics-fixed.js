import React, { useState, useEffect, useCallback } from 'react';
import { analyticsAPI, productsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { formatINR } from '../utils/display';
import { useSocket } from '../contexts/SocketContext';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  ShoppingCart, 
  Users, 
  Activity,
  BarChart3,
  PieChart,
  Calendar,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RePieChart, Pie, Cell } from 'recharts';
import toast from 'react-hot-toast';

const Analytics = () => {
  const { user } = useAuth();
  const { socket, joinProductRoom } = useSocket();
  const [pricingData, setPricingData] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [competitorData, setCompetitorData] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [timeframe, setTimeframe] = useState('7d');
  const [loading, setLoading] = useState(true);

  const fetchAnalyticsData = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      
      const [pricingResponse, orderResponse, competitorResponse, dashboardResponse] = await Promise.all([
        analyticsAPI.getPricing(timeframe),
        analyticsAPI.getOrders(timeframe, user?.id),
        analyticsAPI.getCompetitorPrices(),
        analyticsAPI.getDashboard(user?.id)
      ]);

      setPricingData(pricingResponse.data);
      setOrderData(orderResponse.data);
      setCompetitorData(competitorResponse.data);
      setDashboardData(dashboardResponse.data);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      if (!silent) toast.error('Failed to load analytics data');
      
      // Set mock data if API fails
      setMockData();
    } finally {
      if (!silent) setLoading(false);
    }
  }, [timeframe, user?.id]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Periodic refresh (align with pricing cron cadence)
  useEffect(() => {
    const intervalMs = 10 * 60 * 1000;
    const id = setInterval(() => fetchAnalyticsData({ silent: true }), intervalMs);
    return () => clearInterval(id);
  }, [fetchAnalyticsData]);

  // "Real time": refetch right after the backend emits a global price update
  useEffect(() => {
    if (!socket) return;
    let timer = null;

    const onGlobalPriceUpdate = () => {
      // Debounce: many product updates may fire during one cron run.
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        fetchAnalyticsData({ silent: true });
      }, 1500);
    };

    socket.on('global-price-update', onGlobalPriceUpdate);
    return () => {
      if (timer) clearTimeout(timer);
      socket.off('global-price-update', onGlobalPriceUpdate);
    };
  }, [socket, fetchAnalyticsData]);

  // Ensure analytics receives per-product `price-update` events too.
  // The server only emits `price-update` to `product-${id}` rooms.
  useEffect(() => {
    if (!socket || !joinProductRoom) return;

    let cancelled = false;

    (async () => {
      try {
        const resp = await productsAPI.getAll({ limit: 200 });
        if (cancelled) return;
        const ids = (resp.data || []).map((p) => p.id).filter(Boolean);
        for (const id of ids) {
          joinProductRoom(id);
        }
      } catch (e) {
        // Non-fatal: global-price-update should still cover most cases.
        console.warn('Failed to join product rooms for analytics:', e?.message || e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [socket, joinProductRoom]);

  useEffect(() => {
    if (!socket) return;
    let timer = null;

    const onPriceUpdate = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fetchAnalyticsData({ silent: true }), 1500);
    };

    socket.on('price-update', onPriceUpdate);
    return () => {
      if (timer) clearTimeout(timer);
      socket.off('price-update', onPriceUpdate);
    };
  }, [socket, fetchAnalyticsData]);

  const setMockData = () => {
    // Use user profile data if available
    const userName = user?.name || 'Demo User';
    const userEmail = user?.email || 'demo@example.com';
    
    setPricingData([
      { date: '2026-03-04', price_changes: 3, avg_price_change: 2.50 },
      { date: '2026-03-05', price_changes: 5, avg_price_change: 3.20 },
      { date: '2026-03-06', price_changes: 2, avg_price_change: 1.80 },
      { date: '2026-03-07', price_changes: 4, avg_price_change: 2.90 },
      { date: '2026-03-08', price_changes: 6, avg_price_change: 3.50 },
      { date: '2026-03-09', price_changes: 3, avg_price_change: 2.10 },
      { date: '2026-03-10', price_changes: 5, avg_price_change: 2.75 },
    ]);

    setOrderData([
      { date: '2026-03-04', total_orders: 12, total_revenue: 1250.50 },
      { date: '2026-03-05', total_orders: 18, total_revenue: 1890.75 },
      { date: '2026-03-06', total_orders: 15, total_revenue: 1580.25 },
      { date: '2026-03-07', total_orders: 22, total_revenue: 2450.00 },
      { date: '2026-03-08', total_orders: 19, total_revenue: 2100.50 },
      { date: '2026-03-09', total_orders: 25, total_revenue: 2750.75 },
      { date: '2026-03-10', total_orders: 20, total_revenue: 2200.00 },
    ]);

    setCompetitorData([
      {
        product_id: 1,
        product_name: 'Wireless Headphones',
        competitors: [
          { name: 'Amazon', price: 99.99 },
          { name: 'Best Buy', price: 104.99 },
          { name: 'Target', price: 97.99 }
        ]
      },
      {
        product_id: 2,
        product_name: 'Smart Watch',
        competitors: [
          { name: 'Amazon', price: 199.99 },
          { name: 'Best Buy', price: 209.99 },
          { name: 'Target', price: 189.99 }
        ]
      }
    ]);

    setDashboardData({
      total_products: 5,
      total_orders: 131,
      total_revenue: 14222.75,
      avg_order_value: 108.49,
      price_updates_today: 5,
      top_products: [
        { id: 2, name: 'Smart Watch', orders: 35, revenue: 6899.65 },
        { id: 1, name: 'Wireless Headphones', orders: 28, revenue: 2666.24 },
        { id: 3, name: 'Running Shoes', orders: 25, revenue: 2063.00 }
      ],
      recent_orders: [
        { id: 1, customer: userName, total: 199.99, status: 'completed' },
        { id: 2, customer: userName, total: 299.98, status: 'processing' },
        { id: 3, customer: userName, total: 89.99, status: 'completed' }
      ],
      user_profile: {
        name: userName,
        email: userEmail,
        total_spent: 14222.75,
        total_orders: 131,
        member_since: '2026-01-15'
      }
    });
  };

  const formatPrice = (price) => {
    return formatINR(price);
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor your business performance and pricing trends</p>
        </div>
        
        {/* Timeframe Selector */}
        <div className="mt-4 md:mt-0">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="1d">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dashboard Stats */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-primary-600" />
                <span className="text-sm font-medium text-gray-600">Active Products</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {dashboardData.total_products || 0}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Price updates today: {dashboardData.price_updates_today || 0}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-success-600" />
                <span className="text-sm font-medium text-gray-600">Total Revenue</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatPrice(dashboardData.total_revenue || 0)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {dashboardData.total_orders || 0} orders
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="h-5 w-5 text-warning-600" />
                <span className="text-sm font-medium text-gray-600">Avg Order Value</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatPrice(dashboardData.avg_order_value || 0)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Per transaction
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-danger-600" />
                <span className="text-sm font-medium text-gray-600">Conversion Rate</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              3.2%
            </p>
            <p className="text-sm text-gray-500 mt-1">
              <span className="flex items-center text-success-600">
                <ArrowUp className="h-3 w-3 mr-1" />
                0.5% from last week
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pricing Trends */}
        {pricingData && (
          <div className="bg-white p-6 rounded-lg shadow-soft">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing Trends</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pricingData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => [formatPrice(value), 'Avg Change']} />
                  <Line type="monotone" dataKey="avg_price_change" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Order Analytics */}
        {orderData && (
          <div className="bg-white p-6 rounded-lg shadow-soft">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Analytics</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={orderData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => [value, 'Orders']} />
                  <Bar dataKey="total_orders" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Top Products */}
      {dashboardData?.top_products && (
        <div className="bg-white p-6 rounded-lg shadow-soft">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Products</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dashboardData.top_products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.orders}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatPrice(product.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Competitor Analysis */}
      {competitorData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-soft">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Competitor Price Analysis</h2>
          <div className="space-y-4">
            {competitorData.map((product) => (
              <div key={product.product_id} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">{product.product_name}</h3>
                <div className="grid grid-cols-3 gap-4">
                  {product.competitors.map((competitor, index) => (
                    <div key={competitor.name} className="text-center">
                      <p className="text-sm font-medium text-gray-900">{competitor.name}</p>
                      <p className="text-lg font-semibold text-primary-600">
                        {formatPrice(competitor.price)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
