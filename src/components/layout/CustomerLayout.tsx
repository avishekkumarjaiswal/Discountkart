import React, { Suspense, useEffect, useRef, useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Grid, Tag, User, MapPin, Search as SearchIcon, ArrowLeft, WifiOff, X, Download } from "lucide-react";
import { useLocation as useGlobalLocation } from "../../context/LocationContext";
import { useSearch } from "../../context/SearchContext";
import { AnimatePresence, motion } from "motion/react";
import { useAuth } from "../../context/AuthContext";
import { CompleteProfileModal } from "../modals/CompleteProfileModal";


const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

function UserHeaderAvatar({ user, userData }: { user: any; userData: any }) {
  const [imgError, setImgError] = useState(false);
  const photo = userData?.photoURL || user?.photoURL;
  const rawName = (userData?.name && userData.name !== 'User') 
    ? userData.name 
    : (user?.displayName && user.displayName !== 'User')
      ? user.displayName 
      : (user?.email ? user.email.split('@')[0] : 'User');
  const initial = rawName.charAt(0).toUpperCase();

  if (photo && !imgError) {
    return (
      <img
        src={photo}
        alt=""
        onError={() => setImgError(true)}
        className="w-7 h-7 rounded-full object-cover shrink-0 border border-blue-200"
      />
    );
  }

  return (
    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
      {initial}
    </div>
  );
}

export function CustomerLayout() {
  const location = useLocation();
  const { location: globalLocation } = useGlobalLocation();
  const { searchTerm, setSearchTerm } = useSearch();
  const navigate = useNavigate();
  const headerRef = useRef<HTMLElement>(null);

  const { user, userData } = useAuth();
  const isMainTab = ["/", "/categories", "/my-offers", "/profile"].includes(
    location.pathname,
  );

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [dismissedPhoneModal, setDismissedPhoneModal] = useState(() => {
    return sessionStorage.getItem('dismissedPhoneModal') === 'true';
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  

  return (
    <>
      

    <div className="flex flex-col min-h-screen bg-gray-50/80">
      <header
        ref={headerRef}
        className="bg-white/90 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-40"
      >
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between p-4">
          <div className="flex items-center">
            {!isMainTab && (
              <button
                onClick={() =>
                  window.history.state?.idx > 0 ? navigate(-1) : navigate("/")
                }
                className="mr-3 p-2 -ml-2 rounded-full active:scale-90 active:bg-gray-100 transition-all md:hover:bg-gray-100"
              >
                <ArrowLeft size={24} />
              </button>
            )}
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">DiscountKart</h1>
              <button
                onClick={() => navigate("/location")}
                className="flex items-center text-blue-600 text-xs sm:text-sm font-semibold active:opacity-70 transition-opacity min-h-[24px]"
              >
                <MapPin size={14} className="mr-1 shrink-0" />
                <span className="truncate max-w-[150px] sm:max-w-none block">
                  {globalLocation || "Select Location"}
                </span>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2 md:space-x-6">
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link
                to="/"
                className={`text-sm font-medium transition-colors ${location.pathname === "/" ? "text-blue-600 font-bold" : "text-gray-600 hover:text-blue-600"}`}
              >
                Home
              </Link>
              <Link
                to="/categories"
                className={`text-sm font-medium transition-colors ${location.pathname.startsWith("/categories") ? "text-blue-600 font-bold" : "text-gray-600 hover:text-blue-600"}`}
              >
                Categories
              </Link>
              <Link
                to="/my-offers"
                className={`text-sm font-medium transition-colors ${location.pathname.startsWith("/my-offers") ? "text-blue-600 font-bold" : "text-gray-600 hover:text-blue-600"}`}
              >
                My Offers
              </Link>
              <Link
                to="/profile"
                className={`text-sm font-medium transition-colors ${location.pathname.startsWith("/profile") ? "text-blue-600 font-bold" : "text-gray-600 hover:text-blue-600"}`}
              >
                Profile
              </Link>
            </nav>

            {location.pathname !== "/search" && (
              <button
                onClick={() => navigate("/search")}
                className="p-2.5 rounded-full bg-gray-100/80 text-gray-700 hover:bg-gray-200/80 active:scale-95 transition-all"
              >
                <SearchIcon size={20} />
              </button>
            )}

            {user ? (
              <Link
                to="/profile"
                className="flex items-center gap-2 p-1 pl-1.5 pr-3 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition border border-blue-200/80"
              >
                <UserHeaderAvatar user={user} userData={userData} />
                <span className="text-xs font-bold truncate max-w-[90px] hidden sm:inline-block">
                  {userData?.name || user.displayName || user.email?.split('@')[0] || 'Profile'}
                </span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="px-3.5 py-1.5 text-xs font-bold rounded-full bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>

        {location.pathname === "/search" && (
          <div className="bg-white/90 backdrop-blur-md w-full border-t border-gray-100">
            <div className="max-w-5xl mx-auto p-4 flex items-center space-x-3">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <SearchIcon size={18} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-3 border border-gray-200 bg-gray-50/80 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-colors"
                  placeholder="Search for shops, categories, or areas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
          </div>
        )}
        {!isOnline && (
          <div className="bg-amber-500 text-white text-xs font-semibold py-1.5 px-4 text-center flex items-center justify-center gap-1.5 shadow-inner">
            <WifiOff size={14} />
            <span>You are currently offline. Showing cached discounts.</span>
          </div>
        )}
      </header>

      {/* PWA App Install Banner */}
      {showInstallBanner && (
        <div className="fixed top-16 left-4 right-4 max-w-md mx-auto bg-gray-900 text-white p-3 rounded-2xl shadow-2xl z-50 flex items-center justify-between gap-3 border border-gray-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-black text-sm shrink-0">DK</div>
            <div className="min-w-0">
              <p className="font-bold text-xs truncate">Install DiscountKart App</p>
              <p className="text-[10px] text-gray-400 truncate">Instant discounts right on your home screen</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={handleInstallClick} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition active:scale-95 flex items-center gap-1">
              <Download size={13} />
              <span>Install</span>
            </button>
            <button onClick={() => setShowInstallBanner(false)} className="p-1 text-gray-400 hover:text-white">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 pb-24 md:pb-8 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.25, 1, 0.5, 1] }}
            className="min-h-full"
          >
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile-first bottom navigation (strictly hidden on desktop) */}
      <div className="block md:hidden fixed bottom-0 left-0 right-0 w-full bg-white/95 backdrop-blur-xl border-t border-gray-200/80 z-50 pb-safe shadow-lg">
        <nav className="max-w-5xl mx-auto flex justify-around items-center py-2 px-2 w-full">
          {[
            { path: "/", label: "Home", icon: Home },
            { path: "/categories", label: "Categories", icon: Grid },
            { path: "/my-offers", label: "My Offers", icon: Tag },
            { path: "/profile", label: "Profile", icon: User },
          ].map((item) => {
            const isActive =
              item.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative flex flex-col items-center py-1.5 px-4 transition-transform active:scale-95"
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute inset-0 bg-blue-50/90 rounded-xl -z-10"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <item.icon
                  size={20}
                  className={`transition-colors ${isActive ? "text-blue-600" : "text-gray-500"}`}
                />
                <span
                  className={`text-[10px] sm:text-[11px] mt-1 transition-colors ${isActive ? "text-blue-600 font-bold" : "text-gray-500 font-medium"}`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {user && userData && !userData.phone && !dismissedPhoneModal && location.pathname !== '/login' && (
        <CompleteProfileModal 
          isOpen={true} 
          forceComplete={true} 
          onClose={() => {
            setDismissedPhoneModal(true);
            sessionStorage.setItem('dismissedPhoneModal', 'true');
          }}
        />
      )}
    </div>
    </>
  );
}
