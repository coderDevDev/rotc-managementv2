import ProductListSec from '@/components/common/ProductListSec';
import Brands from '@/components/homepage/Brands';
import DressStyle from '@/components/homepage/DressStyle';
import Header from '@/components/homepage/Header';
import Reviews from '@/components/homepage/Reviews';
import { Review } from '@/types/review.types';
import { productService } from '@/lib/services/productService';
import Homepage from './homepage/page';

export default async function Home() {
  try {
    // Fetch products from the API

    return (
      <>
        <Homepage />
        {/* <Header />
        <Brands />
        <main className="my-[50px] sm:my-[72px]"></main> */}
      </>
    );
  } catch (error) {
    return <div>Error </div>;
  }
}
