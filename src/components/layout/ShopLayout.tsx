import React, { Suspense, useState } from "react";
import { Outlet, Link, Navigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, RefreshCw, BarChart3, LogOut, Menu, X, Smartphone, Tags, PlusSquare, Store, CreditCard, CheckSquare, ExternalLink } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { AnimatePresence, motion } from "motion/react";

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);
export function ShopLayout() {
  const { user, userData, loading, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  if (loading) return <div>Loading...</div>;
  if (!user || userData?.role !== "shop") return <Navigate to="/shop/login" />;

  const isActive = (path: string) => {
    if (path === "/shop") return location.pathname === "/shop";
    if (path === "/shop/discounts") {
      return location.pathname === "/shop/discounts" || location.pathname.startsWith("/shop/discounts/edit");
    }
    if (path === "/shop/discounts/create") {
      return location.pathname === "/shop/discounts/create";
    }
    return location.pathname.startsWith(path);
  };

  const linkClass = (path: string, isButton = false) => {
    const baseClass =
      "flex items-center space-x-3 p-3 rounded-lg transition-colors";
    const activeClass = "text-white font-bold bg-blue-600";
    const inactiveClass = "text-gray-400 active:bg-gray-800 active:text-white md:hover:bg-gray-800 md:hover:text-white";

    return `${baseClass} ${isActive(path) ? activeClass : inactiveClass} ${isButton ? "mt-2" : ""}`;
  };

  const NavLinks = () => (
    <>
      <Link
        to="/shop"
        onClick={() => setMobileMenuOpen(false)}
        className={linkClass("/shop")}
      >
        <LayoutDashboard size={20} />
        <span>Dashboard</span>
      </Link>
      <Link
        to="/shop/discounts"
        onClick={() => setMobileMenuOpen(false)}
        className={linkClass("/shop/discounts")}
      >
        <Tags size={20} />
        <span>My Discounts</span>
      </Link>
      <Link
        to="/shop/discounts/create"
        onClick={() => setMobileMenuOpen(false)}
        className={linkClass("/shop/discounts/create")}
      >
        <PlusSquare size={20} />
        <span>Create Discount</span>
      </Link>
      <Link
        to="/shop/products"
        onClick={() => setMobileMenuOpen(false)}
        className={linkClass("/shop/products")}
      >
        <Package size={20} />
        <span>Products / Menu</span>
      </Link>
      <Link
        to="/shop/profile"
        onClick={() => setMobileMenuOpen(false)}
        className={linkClass("/shop/profile")}
      >
        <Store size={20} />
        <span>Shop Profile</span>
      </Link>
      <Link
        to="/shop/subscription"
        onClick={() => setMobileMenuOpen(false)}
        className={linkClass("/shop/subscription")}
      >
        <CreditCard size={20} />
        <span>Subscription</span>
      </Link>
      <Link
        to="/shop/redemptions"
        onClick={() => setMobileMenuOpen(false)}
        className={linkClass("/shop/redemptions", true)}
      >
        <CheckSquare size={20} />
        <span>Verify Code</span>
      </Link>
    </>
  );

  return (
    <div className="flex min-h-screen bg-gray-50 flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between bg-gray-900 text-white p-4 sticky top-0 z-50">
        <h1 className="text-xl font-bold">Shop Panel</h1>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 -mr-2 text-gray-400 rounded-full hover:bg-gray-800"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-[60] bg-gray-900 bg-opacity-50"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="fixed inset-y-0 left-0 w-64 bg-gray-900 text-white flex flex-col shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <h2 className="text-xl font-bold">Shop Panel</h2>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              <NavLinks />
            </nav>
            <div className="p-4 border-t border-gray-800 space-y-1">
              <Link
                to="/"
                className="flex items-center space-x-3 p-3 text-gray-400 active:bg-gray-800 active:text-white md:hover:bg-gray-800 md:hover:text-white rounded-lg w-full transition-colors"
              >
                <ExternalLink size={20} />
                <span>Customer View</span>
              </Link>
              <button
                onClick={logout}
                className="flex items-center space-x-3 p-3 text-gray-400 active:bg-gray-800 active:text-white md:hover:bg-gray-800 md:hover:text-white rounded-lg w-full transition-colors"
              >
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="w-64 bg-gray-900 text-white hidden md:flex flex-col h-screen sticky top-0">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold">Shop Panel</h2>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavLinks />
        </nav>
        <div className="p-4 border-t border-gray-800 space-y-1">
          <Link
            to="/"
            className="flex items-center space-x-3 p-3 text-gray-400 active:bg-gray-800 active:text-white md:hover:bg-gray-800 md:hover:text-white rounded-lg w-full transition-colors"
          >
            <ExternalLink size={20} />
            <span>Customer View</span>
          </Link>
          <button
            onClick={logout}
            className="flex items-center space-x-3 p-3 text-gray-400 active:bg-gray-800 active:text-white md:hover:bg-gray-800 md:hover:text-white rounded-lg w-full transition-colors"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile-first bottom navigation (similar to CustomerLayout but for shop) */}
      <div className={`md:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 z-50 pb-4 pt-2 ${mobileMenuOpen ? "hidden" : ""}`}>
        <nav className="max-w-5xl mx-auto flex justify-around p-2 w-full">
          <Link
            to="/shop"
            className={`flex flex-col items-center p-2 ${isActive("/shop")  ? "text-blue-600 font-medium" : "text-gray-500 active:text-blue-600 md:hover:text-blue-600"}`}
          >
            <LayoutDashboard size={24} />
            <span className="text-xs mt-1">Dashboard</span>
          </Link>
          <Link
            to="/shop/discounts"
            className={`flex flex-col items-center p-2 ${isActive("/shop/discounts") ? "text-blue-600 font-medium" : "text-gray-500 active:text-blue-600 md:hover:text-blue-600"}`}
          >
            <Tags size={24} />
            <span className="text-xs mt-1">Offers</span>
          </Link>
          <Link
            to="/shop/redemptions"
            className={`flex flex-col items-center p-2 ${isActive("/shop/redemptions") ? "text-blue-600 font-medium" : "text-gray-500 active:text-blue-600 md:hover:text-blue-600"}`}
          >
            <CheckSquare size={24} />
            <span className="text-xs mt-1">Verify</span>
          </Link>
          <Link
            to="/shop/profile"
            className={`flex flex-col items-center p-2 ${isActive("/shop/profile") ? "text-blue-600 font-medium" : "text-gray-500 active:text-blue-600 md:hover:text-blue-600"}`}
          >
            <Store size={24} />
            <span className="text-xs mt-1">Profile</span>
          </Link>
        </nav>
      </div>
      <main className="flex-1 p-4 md:p-8 pb-32 md:pb-8 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="min-h-full"
          >
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
