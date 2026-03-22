import React, { useState, useEffect } from 'react';
import { ordersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { formatINR, getProductImage } from '../utils/display';
import { 
  Package, 
  Calendar, 
  Truck, 
  CheckCircle, 
  Clock, 
  XCircle,
  Filter,
  Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

const Orders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showOrderDetail, setShowOrderDetail] = useState(false);

  useEffect(() => {
    // Fully disable local-order demo data; remove any stale local orders key.
    try {
      localStorage.removeItem('orders');
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [filter, user?.id]);

  const fetchOrders = async () => {
    try {
      setLoading(true);

      if (!user?.id) {
        setOrders([]);
        return;
      }

      const filters = filter !== 'all' ? { status: filter } : {};
      const response = await ordersAPI.getByUserId(user.id, filters);
      const serverOrders = response.data || [];

      // Sort by most recent first
      const sortedOrders = [...serverOrders].sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB - dateA;
      });

      setOrders(sortedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      const msg =
        error?.response?.data?.error ||
        error?.message ||
        'Failed to load orders';
      toast.error(msg);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return formatINR(price);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-warning-600" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-success-600" />;
      case 'processing':
        return <Clock className="h-5 w-5 text-warning-600" />;
      case 'shipped':
        return <Truck className="h-5 w-5 text-primary-600" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-danger-600" />;
      default:
        return <Package className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-warning-100 text-warning-800';
      case 'completed':
        return 'bg-success-100 text-success-800';
      case 'processing':
        return 'bg-warning-100 text-warning-800';
      case 'shipped':
        return 'bg-primary-100 text-primary-800';
      case 'cancelled':
        return 'bg-danger-100 text-danger-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleOrderClick = async (order) => {
    try {
      const response = await ordersAPI.getById(order.id);
      setSelectedOrder(response.data);
      setShowOrderDetail(true);
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast.error('Failed to load order details');
    }
  };

  const closeOrderDetail = () => {
    setShowOrderDetail(false);
    setSelectedOrder(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Your Orders</h1>
          <p className="text-gray-600 mt-1">
            Track and manage your orders
          </p>
        </div>
        
        {/* Filter and Refresh */}
        <div className="mt-4 md:mt-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Orders</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <button
              onClick={() => fetchOrders()}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Activity className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
          <p className="text-gray-600 mb-4">
            {filter !== 'all' ? `No ${filter} orders` : 'You haven\'t placed any orders yet'}
          </p>
          <a
            href="/products"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            Browse Products
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white p-6 rounded-lg shadow-soft hover:shadow-medium transition-shadow cursor-pointer"
              onClick={() => handleOrderClick(order)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(order.status)}
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Order #{order.order_number || order.id}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">
                    {formatPrice(order.total_amount || order.total)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {order.items?.length || order.item_count || 0} {(order.items?.length || order.item_count || 0) === 1 ? 'item' : 'items'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order Detail Modal */}
      {showOrderDetail && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Order #{selectedOrder.order_number}
                </h2>
                <button
                  onClick={closeOrderDetail}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              {/* Order Status */}
              <div className="flex items-center space-x-3 mb-6 p-4 bg-gray-50 rounded-lg">
                {getStatusIcon(selectedOrder.status)}
                <div>
                  <p className="font-medium text-gray-900 capitalize">{selectedOrder.status}</p>
                  <p className="text-sm text-gray-500">
                    {formatDate(selectedOrder.created_at)}
                  </p>
                </div>
              </div>

              {/* Order Items */}
              <div className="space-y-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Order Items</h3>
                {selectedOrder.items?.map((item, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    <img
                      src={getProductImage(item)}
                      alt={item.product_name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.product_name}</p>
                      <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                      <p className="text-sm text-gray-500">
                        {formatPrice(item.unit_price)} each
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatPrice(item.total_price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium text-gray-900">
                      {formatPrice(selectedOrder.total_amount)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span className="font-medium text-success-600">Free</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="text-lg font-semibold text-gray-900">Total</span>
                    <span className="text-lg font-bold text-primary-600">
                      {formatPrice(selectedOrder.total_amount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              {selectedOrder.shipping_address && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Shipping Address</h3>
                  <p className="text-gray-600">{selectedOrder.shipping_address}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
