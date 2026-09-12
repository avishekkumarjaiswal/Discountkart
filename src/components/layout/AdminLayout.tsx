import React, { Suspense, useState } from 'react';
import { Outlet, Link, Navigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Store, Users, LogOut, Receipt, CreditCard, Settings, Tag, MapPin, Menu, X, Smartphone, Grid } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AnimatePresence, motion } from 'motion/react';
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

export function AdminLayout() {
  const { user, userData, loading, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) return <div>Loading...</div>;
  if (!user || userData?.role !== 'admin') return <Navigate to="/admin/login" />;

  const isActive = (path: string) => {
    // Handle both exact match and trailing slash for the base path
    if (path === '/admin') {
      return location.pathname === '/admin' || location.pathname === '/admin/';
    }
    return location.pathname.startsWith(path);
  };

  const navClass = (path: string) => 
    `flex items-center space-x-3 p-3 rounded-lg transition-colors ${
      isActive(path) 
        ? 'bg-blue-600 text-white font-bold' 
        : 'text-gray-400 active:bg-gray-800 active:text-white md:hover:bg-gray-800 md:hover:text-white'
    }`;

  const NavLinks = () => (
    <>
      <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className={navClass('/admin')}>
        <LayoutDashboard size={20} />
        <span>Dashboard</span>
      </Link>
      <Link to="/admin/shops" onClick={() => setMobileMenuOpen(false)} className={navClass('/admin/shops')}>
        <Store size={20} />
        <span>Shops</span>
      </Link>
      <Link to="/admin/users" onClick={() => setMobileMenuOpen(false)} className={navClass('/admin/users')}>
        <Users size={20} />
        <span>Users</span>
      </Link>
      <Link to="/admin/transactions" onClick={() => setMobileMenuOpen(false)} className={navClass('/admin/transactions')}>
        <Receipt size={20} />
        <span>Transactions</span>
      </Link>
      <Link to="/admin/payment-requests" onClick={() => setMobileMenuOpen(false)} className={navClass('/admin/payment-requests')}>
        <CreditCard size={20} />
        <span>Payment Requests</span>
      </Link>
      <Link to="/admin/payment-settings" onClick={() => setMobileMenuOpen(false)} className={navClass('/admin/payment-settings')}>
        <Settings size={20} />
        <span>Payment Settings</span>
      </Link>
      <Link to="/admin/promo-codes" onClick={() => setMobileMenuOpen(false)} className={navClass('/admin/promo-codes')}>
        <Tag size={20} />
        <span>Promo Codes</span>
      </Link>
      <Link to="/admin/categories" onClick={() => setMobileMenuOpen(false)} className={navClass('/admin/categories')}>
        <Grid size={20} />
        <span>Categories</span>
      </Link>
      <Link to="/admin/locations" onClick={() => setMobileMenuOpen(false)} className={navClass('/admin/locations')}>
        <MapPin size={20} />
        <span>Locations</span>
      </Link>
    </>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between bg-gray-900 text-white p-6 sticky top-0 z-50">
        <h1 className="text-xl font-bold">Admin Panel</h1>
        <button onClick={() => setMobileMenuOpen(true)} className="p-2 -mr-2 text-gray-400 rounded-full hover:bg-gray-800">
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[60] bg-gray-900 bg-opacity-50" onClick={() => setMobileMenuOpen(false)}>
          <div className="fixed inset-y-0 left-0 w-64 bg-gray-900 text-white flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 flex justify-between items-center">
              <h2 className="text-xl font-bold">Admin Panel</h2>
              <button onClick={() => setMobileMenuOpen(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className={navClass('/admin')}>
                <LayoutDashboard size={20} />
                <span>Dashboard</span>
              </Link>
              <Link to="/admin/shops" onClick={() => setMobileMenuOpen(false)} className={navClass('/admin/shops')}>
                <Store size={20} />
                <span>Shops</span>
              </Link>
              <Link to="/admin/users" onClick={() => setMobileMenuOpen(false)} className={navClass('/admin/users')}>
                <Users size={20} />
                <span>Users</span>
              </Link>
              <Link to="/admin/transactions" onClick={() => setMobileMenuOpen(false)} className={navClass('/admin/transactions')}>
                <Receipt size={20} />
                <span>Transactions</span>
              </Link>
              <Link to="/admin/payment-requests" onClick={() => setMobileMenuOpen(false)} className={navClass('/admin/payment-requests')}>
                <CreditCard size={20} />
                <span>Payment Requests</span>
              </Link>
              <Link to="/admin/payment-settings" onClick={() => setMobileMenuOpen(false)} className={navClass('/admin/payment-settings')}>
                <Settings size={20} />
                <span>Payment Settings</span>
              </Link>
              <Link to="/admin/promo-codes" onClick={() => setMobileMenuOpen(false)} className={navClass('/admin/promo-codes')}>
                <Tag size={20} />
                <span>Promo Codes</span>
              </Link>
              <Link to="/admin/categories" onClick={() => setMobileMenuOpen(false)} className={navClass('/admin/categories')}>
                <Grid size={20} />
                <span>Categories</span>
              </Link>
              <Link to="/admin/locations" onClick={() => setMobileMenuOpen(false)} className={navClass('/admin/locations')}>
                <MapPin size={20} />
                <span>Locations</span>
              </Link>
            </nav>
            <div className="p-4 border-t border-gray-800 space-y-2">
              <Link to="/" className="flex items-center space-x-3 p-3 text-gray-400 active:bg-gray-800 active:text-white md:hover:bg-gray-800 md:hover:text-white rounded-lg w-full transition-colors">
                <Smartphone size={20} />
                <span>Customer View</span>
              </Link>
              <button onClick={logout} className="flex items-center space-x-3 p-3 text-gray-400 active:bg-gray-800 active:text-white md:hover:bg-gray-800 md:hover:text-white rounded-lg w-full transition-colors">
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="w-64 bg-gray-900 text-white hidden md:flex flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold">Admin Panel</h2>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {NavLinks()}
        </nav>
        <div className="p-4 border-t border-gray-800 space-y-2">
              <Link to="/" className="flex items-center space-x-3 p-3 text-gray-400 active:bg-gray-800 active:text-white md:hover:bg-gray-800 md:hover:text-white rounded-lg w-full transition-colors">
                <Smartphone size={20} />
                <span>Customer View</span>
              </Link>
          <button onClick={logout} className="flex items-center space-x-3 p-3 text-gray-400 active:bg-gray-800 active:text-white md:hover:bg-gray-800 md:hover:text-white rounded-lg w-full transition-colors">
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8 overflow-x-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="min-h-full"
          >
            <Suspense fallback={<PageLoader />}><Outlet /></Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation */}
      {!mobileMenuOpen && (
      <div className="md:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 z-50 pb-safe">
        <nav className="flex justify-around p-2 w-full">
          <Link to="/admin" className={`flex flex-col items-center p-2 ${isActive('/admin') ? 'text-blue-600 font-medium' : 'text-gray-500 active:text-blue-600 md:hover:text-blue-600'}`}>
            <LayoutDashboard size={24} />
            <span className="text-xs mt-1">Dashboard</span>
          </Link>
          <Link to="/admin/shops" className={`flex flex-col items-center p-2 ${isActive('/admin/shops') ? 'text-blue-600 font-medium' : 'text-gray-500 active:text-blue-600 md:hover:text-blue-600'}`}>
            <Store size={24} />
            <span className="text-xs mt-1">Shops</span>
          </Link>
          <Link to="/admin/payment-requests" className={`flex flex-col items-center p-2 ${isActive('/admin/payment-requests') ? 'text-blue-600 font-medium' : 'text-gray-500 active:text-blue-600 md:hover:text-blue-600'}`}>
            <CreditCard size={24} />
            <span className="text-xs mt-1">Payments</span>
          </Link>
          <Link to="/admin/promo-codes" className={`flex flex-col items-center p-2 ${isActive('/admin/promo-codes') ? 'text-blue-600 font-medium' : 'text-gray-500 active:text-blue-600 md:hover:text-blue-600'}`}>
            <Tag size={24} />
            <span className="text-xs mt-1">Promos</span>
          </Link>
        </nav>
      </div>
      )}
    </div>
  );
}
