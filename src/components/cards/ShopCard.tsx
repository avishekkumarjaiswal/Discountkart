import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Star, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { generateShopSlug } from '../../utils/slug';
import { getShopHoursStatus } from '../../utils/shopHours';


interface ShopCardProps {
  key?: any;
  shop: any;
}

export const ShopCard = React.memo(function ShopCard({ shop }: ShopCardProps) {
  const navigate = useNavigate();
  const status = getShopHoursStatus(shop.openingTime, shop.closingTime);

  return (
    <motion.div 
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/shops/${generateShopSlug(shop)}`)}
      className="group bg-white rounded-2xl shadow-sm border border-gray-100/80 overflow-hidden cursor-pointer flex flex-col h-full hover:shadow-lg hover:border-blue-200/80 transition-all duration-300"
    >
      <div className="relative w-full aspect-[4/3] bg-gray-100 shrink-0 overflow-hidden">
        {shop.coverImageUrl ? (
          <img 
            src={shop.coverImageUrl} 
            alt={shop.shopName}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-50 text-blue-200">
            <span className="text-4xl font-bold">{shop.shopName?.charAt(0)}</span>
          </div>
        )}

        {/* Store Hours Status Pill Badge */}
        <div className={`absolute top-2 right-2 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-sm transition ${
          status.isOpen 
            ? status.isClosingSoon
              ? 'bg-amber-500/90 text-white' 
              : 'bg-emerald-600/90 text-white'
            : 'bg-gray-900/80 text-gray-200'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            status.isOpen 
              ? status.isClosingSoon 
                ? 'bg-amber-200 animate-pulse' 
                : 'bg-emerald-200 animate-pulse'
              : 'bg-gray-400'
          }`} />
          <span>{status.badgeText}</span>
        </div>

        {shop.isPromoted && (
          <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
            Promoted
          </div>
        )}
      </div>
      <div className="p-3 sm:p-4 flex flex-col flex-1">
        <h3 className="font-bold text-gray-900 line-clamp-1">{shop.shopName}</h3>
        
        <p className="text-xs text-gray-500 mt-1 flex items-center">
          <MapPin size={12} className="mr-1 opacity-70 flex-shrink-0" />
          <span className="line-clamp-1">{shop.area}, {shop.city}</span>
        </p>

        <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
          <Clock size={11} className="text-gray-400 shrink-0" />
          <span className="truncate">{status.timeText} ({status.formattedRange})</span>
        </p>
        
        {shop.rating > 0 && (
          <div className="flex items-center gap-1 mt-2">
            <Star size={12} className="text-yellow-400 fill-current" />
            <span className="text-xs font-bold text-gray-700">{shop.rating}</span>
            <span className="text-[10px] text-gray-400">({shop.ratingCount})</span>
          </div>
        )}
        
        <div className="mt-auto pt-3">
          {shop.mainDiscount ? (
            <div className="bg-blue-50 border border-blue-100/80 rounded-lg p-2.5 flex items-center justify-center">
              <span className="text-xs font-bold text-blue-700 block truncate text-center">
                {shop.mainDiscount.discountType === 'percentage' 
                  ? `${shop.mainDiscount.discountValue}% OFF Available` 
                  : `₹${shop.mainDiscount.discountValue} OFF Available`}
              </span>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-2.5 text-center text-xs font-medium text-gray-600">
              Explore Shop
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});
