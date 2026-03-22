import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { productsAPI } from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import { formatINR, getProductImage } from '../utils/display';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  ShoppingCart, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Clock, 
  BarChart3,
  Star,
  Truck,
  Shield,
  ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';

const ProductDetail = () => {
  const { id } = useParams();
  const { joinProductRoom, leaveProductRoom } = useSocket();
  
  const [product, setProduct] = useState(null);
  const [demandMetrics, setDemandMetrics] = useState(null);
  const [pricingHistory, setPricingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [currentPrice, setCurrentPrice] = useState(null);

  useEffect(() => {
    fetchProductData();
    joinProductRoom(id);

    return () => {
      leaveProductRoom(id);
    };
  }, [id]);

  const fetchProductData = async () => {
    try {
      setLoading(true);
      
      // Try to fetch product data, but handle errors gracefully
      let productResponse, demandResponse, historyResponse;
      
      try {
        productResponse = await productsAPI.getById(id);
      } catch (error) {
        console.error('Error fetching product:', error);
        // Create mock product data
        productResponse = {
          data: {
            id: parseInt(id),
            name: `Product ${id}`,
            description: 'A great product with amazing features',
            current_price: 99.99,
            base_price: 99.99,
            stock_quantity: 50,
            sku: `PROD-${id}`,
            category_name: 'Electronics',
            image_url: '',
            avg_competitor_price: 99.99
          }
        };
      }
      
      try {
        demandResponse = await productsAPI.getDemandMetrics(id);
      } catch (error) {
        console.error('Error fetching demand metrics:', error);
        demandResponse = { data: null };
      }
      
      try {
        historyResponse = await productsAPI.getPricingHistory(id, 10);
      } catch (error) {
        console.error('Error fetching pricing history:', error);
        historyResponse = { data: [] };
      }

      setProduct(productResponse.data);
      setDemandMetrics(demandResponse.data);
      setPricingHistory(historyResponse.data);
      setCurrentPrice(productResponse.data.current_price);
    } catch (error) {
      console.error('Error fetching product data:', error);
      toast.error('Failed to load product details');
      
      // Set fallback data
      setProduct({
        id: parseInt(id),
        name: `Product ${id}`,
        description: 'A great product with amazing features',
        current_price: 99.99,
        base_price: 99.99,
        stock_quantity: 50,
        sku: `PROD-${id}`,
        category_name: 'Electronics',
        image_url: '',
        avg_competitor_price: 99.99
      });
      setDemandMetrics(null);
      setPricingHistory([]);
      setCurrentPrice(99.99);
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (change) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1 && newQuantity <= (product?.stock_quantity || 10)) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = () => {
    try {
      // Get existing cart from localStorage
      const existingCart = JSON.parse(localStorage.getItem('cart') || '[]');
      
      // Check if product already in cart
      const existingItemIndex = existingCart.findIndex(item => item.id === product.id);
      
      if (existingItemIndex >= 0) {
        // Update quantity if already exists
        existingCart[existingItemIndex].quantity += quantity;
      } else {
        // Add new item to cart
        existingCart.push({
          id: product.id,
          name: product.name,
          price: currentPrice || product.current_price,
          quantity: quantity,
          sku: product.sku,
          image_url: product.image_url
        });
      }
      
      // Save to localStorage
      localStorage.setItem('cart', JSON.stringify(existingCart));
      
      toast.success(`${product.name} added to cart!`);
      setQuantity(1); // Reset quantity
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add item to cart');
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Product not found</p>
          <Link to="/products" className="mt-4 text-primary-600 hover:text-primary-700">
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  const isInStock = product.stock_quantity > 0;
  const priceChange = currentPrice - product.base_price;
  const priceChangePercent = ((priceChange / product.base_price) * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-gray-500 mb-8">
          <Link to="/products" className="hover:text-gray-700">Products</Link>
          <span>›</span>
          <span className="text-gray-900">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Image */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-soft overflow-hidden">
              <img
                src={getProductImage(product)}
                alt={product.name}
                className="w-full h-96 object-cover"
              />
            </div>
            
            {/* Stock Status */}
            <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-soft">
              <div className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-900">
                  {isInStock ? `${product.stock_quantity} in stock` : 'Out of stock'}
                </span>
              </div>
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                isInStock 
                  ? 'bg-success-100 text-success-800' 
                  : 'bg-danger-100 text-danger-800'
              }`}>
                {isInStock ? 'Available' : 'Unavailable'}
              </span>
            </div>
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            {/* Title and Category */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-sm text-primary-600 font-medium">
                  {product.category_name}
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-sm text-gray-500">SKU: {product.sku}</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>
              <p className="text-gray-600 leading-relaxed">{product.description}</p>
            </div>

            {/* Pricing */}
            <div className="bg-white p-6 rounded-lg shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center space-x-3">
                    <p className="text-3xl font-bold text-gray-900">
                      {formatPrice(currentPrice || product.current_price)}
                    </p>
                    {product.current_price !== product.base_price && (
                      <div className="flex items-center space-x-2">
                        {priceChange >= 0 ? (
                          <TrendingUp className="h-5 w-5 text-success-600" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-danger-600" />
                        )}
                        <span className={`text-sm font-medium ${
                          priceChange >= 0 ? 'text-success-600' : 'text-danger-600'
                        }`}>
                          {priceChange >= 0 ? '+' : ''}{priceChangePercent}%
                        </span>
                      </div>
                    )}
                  </div>
                  {product.current_price !== product.base_price && (
                    <p className="text-sm text-gray-500">
                      Original: {formatPrice(product.base_price)}
                    </p>
                  )}
                </div>
              </div>

              {/* Competitor Price Comparison */}
              {product.avg_competitor_price && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">Market Comparison</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Average competitor price</span>
                    <span className="font-medium text-gray-900">
                      {formatPrice(product.avg_competitor_price)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm text-gray-500">You save</span>
                    <span className="font-medium text-success-600">
                      {formatPrice(product.avg_competitor_price - product.current_price)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Add to Cart */}
            {isInStock && (
              <div className="bg-white p-6 rounded-lg shadow-soft">
                <div className="flex items-center space-x-4 mb-4">
                  <label className="text-sm font-medium text-gray-700">Quantity:</label>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleQuantityChange(-1)}
                      className="w-10 h-10 rounded-lg border-2 border-gray-300 bg-white flex items-center justify-center hover:bg-gray-100 hover:border-gray-400 transition-colors text-gray-700 font-bold text-lg"
                    >
                      -
                    </button>
                    <span className="w-16 text-center font-medium text-gray-900 text-lg font-semibold">{quantity}</span>
                    <button
                      onClick={() => handleQuantityChange(1)}
                      className="w-10 h-10 rounded-lg border-2 border-gray-300 bg-white flex items-center justify-center hover:bg-gray-100 hover:border-gray-400 transition-colors text-gray-700 font-bold text-lg"
                    >
                      +
                    </button>
                  </div>
                </div>
                
                <button
                  onClick={handleAddToCart}
                  className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                >
                  <ShoppingCart className="h-5 w-5" />
                  <span>Add to Cart</span>
                </button>
              </div>
            )}

            {/* Features */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white rounded-lg shadow-soft">
                <Truck className="h-6 w-6 text-primary-600 mx-auto mb-2" />
                <p className="text-xs text-gray-600">Free Shipping</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-soft">
                <Shield className="h-6 w-6 text-primary-600 mx-auto mb-2" />
                <p className="text-xs text-gray-600">1 Year Warranty</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-soft">
                <Clock className="h-6 w-6 text-primary-600 mx-auto mb-2" />
                <p className="text-xs text-gray-600">24/7 Support</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing History */}
        {pricingHistory.length > 0 && (
          <div className="mt-8 bg-white p-6 rounded-lg shadow-soft">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Price History</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pricingHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="created_at" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatPrice(value)} />
                  <Line type="monotone" dataKey="new_price" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;
