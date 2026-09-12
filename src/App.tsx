
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LocationProvider } from './context/LocationContext';
import { SearchProvider } from './context/SearchContext';
import { CustomerLayout } from './components/layout/CustomerLayout';
import { ShopLayout } from './components/layout/ShopLayout';
import { AdminLayout } from './components/layout/AdminLayout';

import ScrollToTop from './components/ScrollToTop';
import { ErrorBoundary } from './components/ErrorBoundary';


// Loading Fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

// Lazy-loaded Customer Pages
const Home = React.lazy(() => import('./pages/customer/Home'));
const LocationSelect = React.lazy(() => import('./pages/customer/LocationSelect'));
const ShopDiscovery = React.lazy(() => import('./pages/customer/ShopDiscovery'));
const CategoryDiscovery = React.lazy(() => import('./pages/customer/CategoryDiscovery'));
const ShopDetails = React.lazy(() => import('./pages/customer/ShopDetails'));
const OfferDetails = React.lazy(() => import('./pages/customer/OfferDetails'));
const Login = React.lazy(() => import('./pages/customer/Login'));
const OTPGenerated = React.lazy(() => import('./pages/customer/OTPGenerated'));
const MyOffers = React.lazy(() => import('./pages/customer/MyOffers'));
const Profile = React.lazy(() => import('./pages/customer/Profile'));
const Search = React.lazy(() => import('./pages/customer/Search'));

// Lazy-loaded Shop Pages
const ShopDashboard = React.lazy(() => import('./pages/shop/Dashboard'));
const ShopLogin = React.lazy(() => import('./pages/shop/Login'));
const CreateDiscount = React.lazy(() => import('./pages/shop/CreateDiscount'));
const EditDiscount = React.lazy(() => import('./pages/shop/EditDiscount'));
const MyDiscounts = React.lazy(() => import('./pages/shop/MyDiscounts'));
const Products = React.lazy(() => import('./pages/shop/Products'));
const VerifyOTP = React.lazy(() => import('./pages/shop/VerifyOTP'));
const ShopProfile = React.lazy(() => import('./pages/shop/ShopProfile'));
const Subscription = React.lazy(() => import('./pages/shop/Subscription'));

// Lazy-loaded Admin Pages
const AdminDashboard = React.lazy(() => import('./pages/admin/Dashboard'));
const AdminLogin = React.lazy(() => import('./pages/admin/Login'));
const AdminShops = React.lazy(() => import('./pages/admin/Shops'));
const AdminUsers = React.lazy(() => import('./pages/admin/Users'));
const AdminTransactions = React.lazy(() => import('./pages/admin/Transactions'));
const PaymentRequests = React.lazy(() => import('./pages/admin/PaymentRequests'));
const PaymentSettings = React.lazy(() => import('./pages/admin/PaymentSettings'));
const AdminLocations = React.lazy(() => import('./pages/admin/Locations'));
const AdminCategories = React.lazy(() => import('./pages/admin/Categories'));
const PromoCodes = React.lazy(() => import('./pages/admin/PromoCodes'));

export default function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <SearchProvider>
          <ErrorBoundary>
          <BrowserRouter>
            <ScrollToTop />
            <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Customer Routes */}
              <Route element={<CustomerLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/location" element={<LocationSelect />} />
                <Route path="/search" element={<Search />} />
                <Route path="/shops" element={<ShopDiscovery />} />
                <Route path="/shops/:shopId" element={<ShopDetails />} />
                <Route path="/categories" element={<CategoryDiscovery />} />
                <Route path="/categories/:categoryId" element={<CategoryDiscovery />} />
                <Route path="/discounts/:discountId" element={<OfferDetails />} />
                <Route path="/login" element={<Login />} />
                <Route path="/otp/:redemptionId" element={<OTPGenerated />} />
                <Route path="/my-offers" element={<MyOffers />} />
                <Route path="/profile" element={<Profile />} />
              </Route>

              {/* Shop Routes */}
              <Route path="/shop/login" element={<ShopLogin />} />
              <Route element={<ShopLayout />}>
                <Route path="/shop" element={<ShopDashboard />} />
                <Route path="/shop/discounts" element={<MyDiscounts />} />
                <Route path="/shop/discounts/create" element={<CreateDiscount />} />
                <Route path="/shop/discounts/edit/:discountId" element={<EditDiscount />} />
                <Route path="/shop/products" element={<Products />} />
                <Route path="/shop/redemptions" element={<VerifyOTP />} />
                <Route path="/shop/profile" element={<ShopProfile />} />
                <Route path="/shop/subscription" element={<Subscription />} />
              </Route>

              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/shops" element={<AdminShops />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/transactions" element={<AdminTransactions />} />
                <Route path="/admin/payment-requests" element={<PaymentRequests />} />
                <Route path="/admin/payment-settings" element={<PaymentSettings />} />
                <Route path="/admin/locations" element={<AdminLocations />} />
                <Route path="/admin/categories" element={<AdminCategories />} />
                <Route path="/admin/promo-codes" element={<PromoCodes />} />
              </Route>
            </Routes>
            </Suspense>
          </BrowserRouter>
          </ErrorBoundary>
        </SearchProvider>
      </LocationProvider>
    </AuthProvider>
  );
}
