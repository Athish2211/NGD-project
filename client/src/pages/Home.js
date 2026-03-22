import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productsAPI, analyticsAPI } from '../services/api';
import { formatINR, getProductImage } from '../utils/display';
import { TrendingUp, Package, ShoppingCart, DollarSign, Users, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get featured products
        const productsResponse = await productsAPI.getAll({ limit: 6 });
        setFeaturedProducts(productsResponse.data);

        // Get dashboard stats
        const statsResponse = await analyticsAPI.getDashboard();
        setDashboardStats(statsResponse.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-12 px-4">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
          <span className="gradient-text">Dynamic Pricing</span>
          <br />
          Smart E-Commerce
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Experience real-time pricing that adapts to demand, competition, and market trends. 
          Get the best deals with our intelligent pricing engine.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/products"
            className="px-8 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            Browse Products
          </Link>
          <Link
            to="/register"
            className="px-8 py-3 border border-primary-600 text-primary-600 rounded-lg font-medium hover:bg-primary-50 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* Stats Section */}
      {dashboardStats && (
        <section className="py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-soft text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-primary-100 rounded-full mx-auto mb-4">
                <Package className="h-6 w-6 text-primary-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardStats.active_products?.total_products || 0}
              </p>
              <p className="text-sm text-gray-600">Active Products</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-soft text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-success-100 rounded-full mx-auto mb-4">
                <DollarSign className="h-6 w-6 text-success-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatPrice(dashboardStats.today_orders?.total_revenue || 0)}
              </p>
              <p className="text-sm text-gray-600">Today's Revenue</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-soft text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-warning-100 rounded-full mx-auto mb-4">
                <ShoppingCart className="h-6 w-6 text-warning-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardStats.today_orders?.total_orders || 0}
              </p>
              <p className="text-sm text-gray-600">Today's Orders</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-soft text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-info-100 rounded-full mx-auto mb-4">
                <Activity className="h-6 w-6 text-info-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(dashboardStats.today_metrics?.total_views || 0)}
              </p>
              <p className="text-sm text-gray-600">Today's Views</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-soft text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mx-auto mb-4">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(dashboardStats.today_metrics?.unique_viewers || 0)}
              </p>
              <p className="text-sm text-gray-600">Unique Visitors</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-soft text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-danger-100 rounded-full mx-auto mb-4">
                <TrendingUp className="h-6 w-6 text-danger-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardStats.recent_price_changes?.length || 0}
              </p>
              <p className="text-sm text-gray-600">Price Updates</p>
            </div>
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Products</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Discover our handpicked selection of products with dynamic pricing that adapts to market conditions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredProducts.map((product) => (
            <Link
              key={product.id}
              to={`/products/${product.id}`}
              className="bg-white rounded-lg shadow-soft overflow-hidden card-hover group"
            >
              <div className="aspect-w-16 aspect-h-9 bg-gray-100">
                <img
                  src={getProductImage(product)}
                  alt={product.name}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-primary-600 font-medium">
                    {product.category_name}
                  </span>
                  <span className="text-xs bg-success-100 text-success-800 px-2 py-1 rounded-full">
                    In Stock
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                  {product.name}
                </h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {product.description}
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatPrice(product.current_price)}
                    </p>
                    {product.current_price !== product.base_price && (
                      <p className="text-sm text-gray-500 line-through">
                        {formatPrice(product.base_price)}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Stock</p>
                    <p className="text-sm font-medium text-gray-900">
                      {product.stock_quantity}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link
            to="/products"
            className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            View All Products
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Dynamic Pricing?</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Our intelligent pricing system ensures you always get the best value based on real-time market data.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mx-auto mb-4">
              <TrendingUp className="h-8 w-8 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Smart Pricing</h3>
            <p className="text-gray-600">
              Prices automatically adjust based on demand, competition, and market trends.
            </p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-success-100 rounded-full mx-auto mb-4">
              <Activity className="h-8 w-8 text-success-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Real-Time Updates</h3>
            <p className="text-gray-600">
              Get instant notifications when prices change and never miss a great deal.
            </p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-warning-100 rounded-full mx-auto mb-4">
              <DollarSign className="h-8 w-8 text-warning-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Best Value</h3>
            <p className="text-gray-600">
              Our algorithm ensures you get competitive pricing compared to other retailers.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
