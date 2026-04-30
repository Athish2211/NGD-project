import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ordersAPI } from '../services/api';
import { formatINR, getProductImage } from '../utils/display';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  ArrowRight,
  Package,
  DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';

const Cart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCartItems();
  }, []);

  const loadCartItems = () => {
    try {
      const savedCart = localStorage.getItem('cart');
      const items = savedCart ? JSON.parse(savedCart) : [];
      setCartItems(items);
    } catch (error) {
      console.error('Error loading cart:', error);
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  };

  const saveCartItems = (items) => {
    localStorage.setItem('cart', JSON.stringify(items));
    setCartItems(items);
  };

  const updateQuantity = (id, newQuantity) => {
    if (newQuantity < 1) return;
    
    const updatedItems = cartItems.map(item =>
      item.id === id ? { ...item, quantity: newQuantity } : item
    );
    saveCartItems(updatedItems);
  };

  const removeItem = (id) => {
    const updatedItems = cartItems.filter(item => item.id !== id);
    saveCartItems(updatedItems);
    toast.success('Item removed from cart');
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity) || 1;
      return total + (price * quantity);
    }, 0);
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    try {
      const orderData = {
        items: cartItems.map(item => ({
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          price: parseFloat(item.price) || 0
        })),
        total_amount: calculateTotal(),
        status: 'pending',
        customer_email: 'customer@example.com'
      };

      console.log('Creating order with data:', orderData);
      
      const response = await ordersAPI.create(orderData);
      
      if (response.data) {
        // Clear cart after successful order
        saveCartItems([]);
        toast.success(`Order #${response.data.id || '000'} placed successfully! Total: ${formatPrice(calculateTotal())}`);
        
        // Show order details in console
        console.log('Order created successfully:', response.data);
        
        // Optionally redirect to orders page after a delay
        setTimeout(() => {
          window.location.href = '/orders';
        }, 2000);
      } else {
        throw new Error('No order data received');
      }
      
    } catch (error) {
      console.error('Checkout error:', error);
      const msg =
        error?.response?.data?.error ||
        error?.message ||
        'Please try again';
      toast.error(`Failed to place order: ${msg}`);
    }
  };

  const formatPrice = (price) => {
    return formatINR(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Loading cart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-soft rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Shopping Cart</h1>
          </div>

          {cartItems.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
              <p className="text-gray-600 mb-6">Add some products to get started!</p>
              <Link
                to="/products"
                className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
              >
                <Package className="h-5 w-5" />
                <span>Browse Products</span>
              </Link>
            </div>
          ) : (
            <div className="p-6">
              <div className="space-y-4 mb-6">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    <img
                      src={getProductImage(item)}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{item.name}</h3>
                      <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                      <p className="text-lg font-semibold text-primary-600">
                        {formatPrice(parseFloat(item.price) || 0)}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-10 h-10 rounded-lg border-2 border-gray-300 bg-white flex items-center justify-center hover:bg-gray-100 hover:border-gray-400 transition-colors text-gray-700 font-bold text-lg"
                      >
                        -
                      </button>
                      <span className="w-16 text-center font-medium text-gray-900 text-lg font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-10 h-10 rounded-lg border-2 border-gray-300 bg-white flex items-center justify-center hover:bg-gray-100 hover:border-gray-400 transition-colors text-gray-700 font-bold text-lg"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatPrice((parseFloat(item.price) || 0) * parseInt(item.quantity))}
                      </p>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-sm text-gray-600">Subtotal ({cartItems.length} items)</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatPrice(calculateTotal())}
                    </p>
                  </div>
                  
                  <button
                    onClick={handleCheckout}
                    className="flex items-center space-x-2 px-8 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                  >
                    <ArrowRight className="h-5 w-5" />
                    <span>Checkout</span>
                  </button>
                </div>

                <Link
                  to="/products"
                  className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700 transition-colors"
                >
                  <Package className="h-4 w-4" />
                  <span>Continue Shopping</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Cart;
