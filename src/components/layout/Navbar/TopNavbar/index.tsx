import { cn } from '@/lib/utils';
import { integralCF } from '@/styles/fonts';
import Link from 'next/link';
import React from 'react';
import { NavMenu } from '../navbar.types';
import { MenuList } from './MenuList';
import {
  NavigationMenu,
  NavigationMenuList
} from '@/components/ui/navigation-menu';
import { MenuItem } from './MenuItem';
import Image from 'next/image';
import InputGroup from '@/components/ui/input-group';
import ResTopNavbar from './ResTopNavbar';
import CartBtn from './CartBtn';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { LogOut, User } from 'lucide-react';
import { toast } from 'sonner';
import OrdersBtn from './OrdersBtn';

const data: NavMenu = [
  // {
  //   id: 1,
  //   label: 'Shop',
  //   type: 'MenuItem'
  // },

  {
    id: 1,
    type: 'MenuItem',
    label: 'Home',
    url: '/homepage',
    children: []
  }
];

const TopNavbar = () => {
  const supabase = createClientComponentClient();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast.success('Logged out successfully');
      window.location.href = '/login';
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out');
    }
  };

  return (
    <nav
      className="sticky top-0 bg-primary text-white 
  z-20 border-b border-secondary  border-b-2">
      <div className="flex relative max-w-frame mx-auto items-center justify-between md:justify-start py-5 md:py-6 px-4 xl:px-0">
        <div className="flex items-center">
          <div className="block md:hidden mr-4">
            <ResTopNavbar data={data} />
          </div>
          {/* <Image
            src="/images/LOGO.png"
            alt="ROTC Hub Logo"
            width={20}
            height={20}
          /> */}
          <Link
            href="/homepage"
            className={cn([
              integralCF.className,
              'text-2xl lg:text-[32px] mb-2 mr-3 lg:mr-10 text-white'
            ])}>
            rotc.Hub
          </Link>
        </div>
        {/* <NavigationMenu className="hidden md:flex mr-2 lg:mr-7">
          <NavigationMenuList>
            {data.map(item => (
              <React.Fragment key={item.id}>
                {item.type === 'MenuItem' && (
                  <MenuItem label={item.label} url={item.url} />
                )}
                {item.type === 'MenuList' && (
                  <MenuList data={item.children} label={item.label} />
                )}
              </React.Fragment>
            ))}
          </NavigationMenuList>\
        </NavigationMenu> */}

        <div className="flex items-center">
          <Link href="/homepage" className="text-white">
            Home
          </Link>
        </div>
        <InputGroup className="hidden md:flex bg-[#F0F0F0] mr-3 lg:mr-10"></InputGroup>
        <div className="flex items-center">
          <Link href="/search" className="block md:hidden mr-[14px] p-1">
            <Image
              priority
              src="/icons/search-black.svg"
              height={100}
              width={100}
              alt="search"
              className="max-w-[22px] max-h-[22px]"
            />
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger className="p-1 outline-none">
              <User className="w-[22px] h-[22px]" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600 cursor-pointer"
                onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
};

export default TopNavbar;
