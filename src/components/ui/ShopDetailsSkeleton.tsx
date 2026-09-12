import React from 'react';
import { Skeleton, DiscountCardSkeleton } from './Skeleton';

export function ShopDetailsSkeleton() {
  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      <Skeleton className="w-full h-48 md:h-64 rounded-none" />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <Skeleton className="h-8 w-3/4 mb-4" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-32" />
              </div>
            </div>
            <Skeleton className="w-12 h-12 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full mt-6" />
          <Skeleton className="h-4 w-2/3 mt-2" />
          
          <div className="flex gap-3 mt-6">
            <Skeleton className="h-10 w-32 rounded-full" />
            <Skeleton className="h-10 w-32 rounded-full" />
          </div>
        </div>
        
        <div className="mt-8">
          <Skeleton className="h-7 w-48 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DiscountCardSkeleton />
            <DiscountCardSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
