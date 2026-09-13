import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, MapPin, Zap, Gift, Layers, Package } from 'lucide-react';
import { motion } from 'motion/react';
import { getOfferBadgeText } from '../../utils/discountEngine';

interface DiscountCardProps {
  key?: any;
  discount: any;
  shop?: any;
}

export const DiscountCard = React.memo(function DiscountCard({ discount, shop }: DiscountCardProps) {
  const navigate = useNavigate();
  const offerType = discount.offerType || 'percentage_flat';
  const badgeText = getOfferBadgeText(discount);
  
  // Custom badge colors and icons per offer type
  const getBadgeStyle = () => {
    switch (offerType) {
      case 'flash_sale':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: <Zap size={13} className="mr-1 text-amber-600 animate-pulse fill-amber-500" />,
          sideBorder: 'bg-amber-500'
        };
      case 'bxgy':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: <Gift size={13} className="mr-1 text-emerald-600" />,
          sideBorder: 'bg-emerald-500'
        };
      case 'quantity_pricing':
        return {
          bg: 'bg-purple-50 text-purple-800 border-purple-200',
          icon: <Layers size={13} className="mr-1 text-purple-600" />,
          sideBorder: 'bg-purple-500'
        };
      case 'bundle':
        return {
          bg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
          icon: <Package size={13} className="mr-1 text-indigo-600" />,
          sideBorder: 'bg-indigo-500'
        };
      case 'percentage_flat':
      default:
        return {
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          icon: <Tag size={13} className="mr-1 text-blue-600" />,
          sideBorder: 'bg-blue-500'
        };
    }
  };

  const style = getBadgeStyle();

  return (
    <motion.div 
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/discounts/${discount.id}`)}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer flex flex-col hover:shadow-md transition-shadow relative"
    >
      <div className={`absolute top-0 left-0 w-1.5 h-full ${style.sideBorder} rounded-l-2xl`}></div>
      
      <div className="flex">
        <div className="p-4 flex-1 pl-5 space-y-1">
          <h4 className="font-bold text-gray-900 text-sm sm:text-base line-clamp-1">{discount.title}</h4>
          {discount.minimumPurchase > 0 && (
            <p className="text-xs text-gray-500">Min. spend: ₹{discount.minimumPurchase}</p>
          )}
          <div className={`flex items-center text-xs font-bold border ${style.bg} w-fit px-2.5 py-1 rounded-md mt-2 shadow-2xs`}>
            {style.icon}
            <span>{badgeText}</span>
          </div>
        </div>
        
        <div className="w-20 bg-gray-50 flex flex-col items-center justify-center border-l border-gray-100 text-center px-2 py-3">
          <span className="text-xs font-bold text-gray-900 leading-tight">VIEW</span>
          <span className="text-[10px] text-gray-500 mt-1 uppercase font-semibold">Offer</span>
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
