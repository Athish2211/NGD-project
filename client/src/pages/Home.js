import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productsAPI } from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import { formatINR, getProductImage } from '../utils/display';
import { ArrowRight, Activity, Zap, Shield, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const productsResponse = await productsAPI.getAll({ limit: 6 });
        setFeaturedProducts(productsResponse.data);
      } catch (error) {
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!socket) return;
    
    const handleGlobalPriceUpdate = (data) => {
      setFeaturedProducts(prevProducts => prevProducts.map(p => 
        String(p.id) === String(data.productId)
          ? { ...p, current_price: data.newPrice }
          : p
      ));
    };

    socket.on('global-price-update', handleGlobalPriceUpdate);
    return () => socket.off('global-price-update', handleGlobalPriceUpdate);
  }, [socket]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full border-t-4 border-indigo-600 animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-t-4 border-emerald-500 animate-spin" style={{ animationDirection: 'reverse' }}></div>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-indigo-600">
            <Sparkles className="w-8 h-8 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-24 pb-16 overflow-hidden">
      
      {/* Hero Section */}
      <section className="relative px-6 py-24 sm:py-32 overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 rounded-3xl mx-4 mt-6 shadow-[0_20px_50px_rgba(8,_112,_184,_0.7)] group">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-fuchsia-500 rounded-full mix-blend-multiply filter blur-[80px] opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-[80px] opacity-70 animate-blob animation-delay-2000"></div>
        
        <div className="relative z-10 text-center max-w-5xl mx-auto space-y-8 flex flex-col items-center">

          
          <h1 className="text-5xl sm:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 drop-shadow-sm tracking-tight leading-tight">
            Smart Commerce. <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-emerald-300">Perfectly Priced.</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl font-light leading-relaxed">
            Experience an intelligent ecosystem that continuously adapts to market demands and trends, guaranteeing you always get the absolute best value instantly.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-5 pt-8 justify-center w-full">
            <Link to="/products" className="group relative inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white bg-gradient-to-r from-teal-500 to-emerald-600 rounded-xl overflow-hidden shadow-[0_0_40px_rgba(20,184,166,0.4)] transition-all hover:scale-105 hover:shadow-[0_0_60px_rgba(20,184,166,0.6)]">
              <span className="relative z-10 flex items-center">Browse Products <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" /></span>
              <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-emerald-600 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </Link>
            
            <Link to="/register" className="group inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white bg-white/10 backdrop-blur-md rounded-xl border border-white/20 hover:bg-white/20 transition-all hover:scale-105">
              Create Account
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products Spotlight */}
      <section className="px-4 max-w-7xl mx-auto w-full">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Trending Now</h2>
            <p className="text-slate-500 mt-2 font-medium">Dynamically curated items soaring in demand right now.</p>
          </div>
          <Link to="/products" className="hidden sm:inline-flex items-center text-teal-600 font-bold hover:text-teal-700 transition-colors">
            View All Collection <ArrowRight className="ml-1 w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredProducts.map((product) => (
            <Link
              key={product.id}
              to={`/products/${product.id}`}
              className="group relative flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-teal-500/10 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute top-4 right-4 z-10">
                <span className="px-3 py-1 text-xs font-bold bg-emerald-100/90 backdrop-blur-sm text-emerald-700 rounded-full shadow-sm border border-emerald-200">
                  {product.category_name}
                </span>
              </div>
              <div className="relative h-64 overflow-hidden bg-slate-50">
                <img
                  src={getProductImage(product)}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                  <span className="text-white font-bold flex items-center"><Zap className="w-4 h-4 text-yellow-400 mr-2"/> Lightning Fast Deal</span>
                </div>
              </div>
              <div className="p-6 flex flex-col flex-grow bg-white">
                 <h3 className="text-xl font-bold text-slate-800 group-hover:text-teal-600 transition-colors line-clamp-1 mb-2">
                  {product.name}
                </h3>
                <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed mb-6 font-medium">
                  {product.description}
                </p>
                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Live Price</span>
                    <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                      {formatINR(product.current_price)}
                    </span>
                  </div>
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center group-hover:bg-teal-50 transition-colors">
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-teal-600 transition-colors" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Premium Features Grid */}
      <section className="px-4 max-w-7xl mx-auto w-full mb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-3xl p-8 hover:shadow-lg transition-shadow">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30 mb-6 text-white transform -rotate-6">
              <Activity className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">Live Volatility</h3>
            <p className="text-slate-600 font-medium leading-relaxed">
              Our servers ping the market continually, reflecting exact real-world supply logic without hesitation.
            </p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 rounded-3xl p-8 hover:shadow-lg transition-shadow">
            <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-6 text-white transform rotate-3">
              <Shield className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">Secure Limits</h3>
            <p className="text-slate-600 font-medium leading-relaxed">
              Automated bounds guarantee that prices never surge unpredictably, enforcing strict consumer safety limits instantly.
            </p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-100 rounded-3xl p-8 hover:shadow-lg transition-shadow">
            <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-600/30 mb-6 text-white transform -rotate-3">
              <Zap className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">Neural Reactivity</h3>
            <p className="text-slate-600 font-medium leading-relaxed">
              WebSocket interconnected systems broadcast adjustments within milliseconds locally without page reloads.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;
