'use client';

import { addToCart } from '@/lib/features/carts/cartsSlice';
import { useAppDispatch, useAppSelector } from '@/lib/hooks/redux';
import { RootState } from '@/lib/store';
import { Product } from '@/types/product.types';
import React from 'react';

const AddToCartBtn = ({ data }: { data: Product & { quantity: number } }) => {
  const dispatch = useAppDispatch();
  const { customization } = useAppSelector(
    (state: RootState) => state.products
  );

  // Calculate total customization cost
  const calculateCustomizationCost = () => {
    if (!customization) return 0;

    // Add costs from addons
    const addonsCost = customization.addons.reduce(
      (total, addon) => total + addon.price * addon.quantity,
      0
    );

    // Add any other customization costs here
    const totalCustomizationCost = addonsCost;

    return totalCustomizationCost;
  };

  return (
    <button
      type="button"
      className="bg-primary w-full ml-3 sm:ml-5 rounded-full h-11 md:h-[52px] text-sm sm:text-base text-white hover:bg-primary/80 transition-all"
      onClick={() =>
        dispatch(
          addToCart({
            id: data.id,
            name: data.title,
            srcUrl: data.srcurl,
            price: data.price,
            attributes: [],
            discount: data.discount,
            quantity: data.quantity,
            customization: customization
              ? {
                  ...customization,
                  totalCustomizationCost: calculateCustomizationCost()
                }
              : undefined
          })
        )
      }>
      Add to Cart
    </button>
  );
};

export default AddToCartBtn;
