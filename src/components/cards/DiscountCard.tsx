import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, MapPin } from 'lucide-react';
import { motion } from 'motion/react';

interface DiscountCardProps {
  key?: any;
  discount: any;
  shop?: any;
}

export const DiscountCard = React.memo(function DiscountCard({ discount, shop }: DiscountCardProps) {
  const navigate = useNavigate();
  
  return (
    <motion.div 
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/discounts/${discount.id}`)}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer flex flex-col hover:shadow-md transition-shadow relative"
    >
      <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 rounded-l-2xl"></div>
      
      <div className="flex">
        <div className="p-4 flex-1 pl-5 space-y-1">
          <h4 className="font-bold text-gray-900 text-sm sm:text-base line-clamp-1">{discount.title}</h4>
          {discount.minimumPurchase > 0 && (
            <p className="text-xs text-gray-500">Min. spend: ₹{discount.minimumPurchase}</p>
          )}
          <div className="flex items-center text-xs font-bold text-blue-700 bg-blue-50 w-fit px-2 py-1 rounded-md mt-2">
            <Tag size={12} className="mr-1" />
            {discount.discountType === 'percentage' ? `${discount.discountValue}% OFF` : `₹${discount.discountValue} OFF`}
          </div>
        </div>
        
        <div className="w-20 bg-gray-50 flex flex-col items-center justify-center border-l border-gray-100 text-center px-2 py-3">
          <span className="text-xs font-bold text-gray-900 leading-tight">GET</span>
          <span className="text-[10px] text-gray-500 mt-1 uppercase font-semibold">Code</span>
        </div>
      </div>
      
      {shop && (
        <div className="px-5 py-3 border-t border-gray-50 flex items-center bg-gray-50/50">
          <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 overflow-hidden mr-2">
            {shop.coverImageUrl ? (
              <img src={shop.coverImageUrl} alt={shop.shopName} className="w-full h-full object-cover" loading="lazy" decoding="async" />
            ) : (
              <span className="text-[10px] font-bold">{shop.shopName?.charAt(0)}</span>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-800 line-clamp-1">{shop.shopName}</span>
            {shop.area && <span className="text-[10px] text-gray-500 flex items-center"><MapPin size={8} className="mr-0.5"/> {shop.area}</span>}
          </div>
        </div>
      )}
    </motion.div>
  );
});
