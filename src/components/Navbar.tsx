'use client'
import { useState, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuList,
    NavigationMenuTrigger,
    NavigationMenuLink,
    navigationMenuTriggerStyle,
} from "./ui/navigation-menu";

import { ModeToggle } from "./mode-toggle";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Menu, LogOut, User, Settings, ShoppingCart, Search, MapPin } from "lucide-react";
import { BlazeLogoIcon } from "./Icons";
import Link from "next/link";

interface RouteProps {
    href: string;
    label: string;
  }
  
  const routeList: RouteProps[] = [
    {
      href: "#programs",
      label: "Programs",
    },
    {
      href: "/learning-paths",
      label: "Learning Paths",
    },
    {
      href: "#about",
      label: "About",
    },
    {
      href: "#faq",
      label: "FAQ",
    },
  ];

  interface Location {
    id: string;
    name: string;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip_code?: string | null;
    franchise?: {
      id: string;
      code: string;
      name: string | null;
    } | null;
  }

  interface FranchiseGroup {
    id: string;
    code: string;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
  }
  
  export const Navbar = () => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [cartCount, setCartCount] = useState<number>(0);
    const [locations, setLocations] = useState<Location[]>([]);
    const [franchiseGroups, setFranchiseGroups] = useState<FranchiseGroup[]>([]);
    const [filteredFranchiseGroups, setFilteredFranchiseGroups] = useState<FranchiseGroup[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [isLoadingLocations, setIsLoadingLocations] = useState<boolean>(false);
    const pathname = usePathname();
    const router = useRouter();
    const isHomePage = pathname === '/';
    const { data: session, status } = useSession();

    // 动态检测当前 location label（从 pathname 中提取 code，然后查找对应的 franchise name）
    // 使用 useMemo 确保在 franchiseGroups 更新时重新计算
    const currentLocationLabel = useMemo(() => {
      if (!pathname) return null;
      // 匹配 /locations/[code] 格式的路径
      const locationMatch = pathname.match(/^\/locations\/([^\/]+)/);
      if (!locationMatch) return null;
      
      const locationCode = decodeURIComponent(locationMatch[1]).toLowerCase();
      // 从 franchiseGroups 中查找匹配的 franchise
      const matchedFranchise = franchiseGroups.find(
        (f) => f.code.toLowerCase() === locationCode
      );
      
      return matchedFranchise?.name || null;
    }, [pathname, franchiseGroups]);

    // Helper function to get the correct href
    const getHref = (href: string) => {
      // For hash links, if不在首页则跳转到首页并带上 hash
      if (href.startsWith("#") && !isHomePage) {
        return `/${href}`;
      }
      return href;
    };

    // Get user initials for avatar fallback
    const getUserInitials = (name: string | null | undefined) => {
      if (!name) return "U";
      const parts = name.trim().split(" ");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name[0].toUpperCase();
    };

    const handleSignOut = async () => {
      await signOut({ redirect: false });
      router.push("/");
      router.refresh();
      setCartCount(0);
    };

    // Fetch cart count when user is logged in
    useEffect(() => {
      if (status === 'authenticated' && session?.user) {
        const fetchCartCount = async () => {
          try {
            const response = await fetch('/api/enrollments/cart');
            if (response.ok) {
              const data = await response.json();
              setCartCount(data.total || 0);
            }
          } catch (error) {
            console.error('Error fetching cart count:', error);
          }
        };

        fetchCartCount();
        // Refresh cart count every 30 seconds
        const interval = setInterval(fetchCartCount, 30000);
        return () => clearInterval(interval);
      } else {
        setCartCount(0);
      }
    }, [status, session]);

    // Fetch locations and group by franchise
    useEffect(() => {
      const fetchLocations = async () => {
        try {
          setIsLoadingLocations(true);
          const response = await fetch('/api/public/locations');
          if (response.ok) {
            const data = await response.json();
            setLocations(data || []);
            
            // Group locations by franchise
            const franchiseMap = new Map<string, FranchiseGroup>();
            
            (data || []).forEach((location: Location) => {
              if (!location.franchise) return;
              
              const franchiseId = location.franchise.id;
              
              // If franchise not in map, add it
              if (!franchiseMap.has(franchiseId)) {
                franchiseMap.set(franchiseId, {
                  id: location.franchise.id,
                  code: location.franchise.code,
                  name: location.franchise.name || '',
                  // Use first location's address as franchise address
                  address: location.address || undefined,
                  city: location.city || undefined,
                  state: location.state || undefined,
                  zip_code: location.zip_code || undefined,
                });
              }
            });
            
            const groups = Array.from(franchiseMap.values());
            setFranchiseGroups(groups);
            setFilteredFranchiseGroups(groups);
          }
        } catch (error) {
          console.error('Error fetching locations:', error);
        } finally {
          setIsLoadingLocations(false);
        }
      };

      fetchLocations();
    }, []);

    // Filter franchise groups based on search query
    useEffect(() => {
      if (!searchQuery.trim()) {
        setFilteredFranchiseGroups(franchiseGroups);
        return;
      }

      const query = searchQuery.toLowerCase();
      const filtered = franchiseGroups.filter((franchise) => {
        const name = franchise.name?.toLowerCase() || '';
        const city = franchise.city?.toLowerCase() || '';
        const state = franchise.state?.toLowerCase() || '';
        const address = franchise.address?.toLowerCase() || '';
        
        return (
          name.includes(query) ||
          city.includes(query) ||
          state.includes(query) ||
          address.includes(query)
        );
      });

      setFilteredFranchiseGroups(filtered);
    }, [searchQuery, franchiseGroups]);

    return (
      <header
        className="sticky border-b top-0 z-40 w-full mx-auto bg-white dark:border-b-slate-700 dark:bg-background"
      >
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          {/* Left: Logo */}
          <div className="font-bold flex items-center gap-2">
            <a
              rel="noreferrer noopener"
              href="/"
              className="ml-2 font-bold text-xl flex items-center"
            >
              <BlazeLogoIcon />
            </a>
            {currentLocationLabel && (
              <span className="hidden sm:inline-flex items-center text-xs font-medium px-2 py-2 rounded-full bg-primary text-background dark:text-primary-foreground">
                {currentLocationLabel}
              </span>
            )}
          </div>

          {/* Center: Navigation Menu */}
          <NavigationMenu>
            <NavigationMenuList className="flex-wrap">
              {/* desktop menu */}
              <nav className="hidden md:flex gap-2">
                {/* Locations Menu */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-[12px]">
                    Locations
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-1 p-4">
                      {/* Search Input */}
                      <li className="mb-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search locations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      </li>

                      {/* Locations List */}
                      <li className="max-h-[400px] overflow-y-auto">
                        {isLoadingLocations ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : filteredFranchiseGroups.length === 0 ? (
                          <div className="text-center py-8 text-sm text-muted-foreground">
                            {searchQuery ? 'No locations found' : 'No locations available'}
                          </div>
                        ) : (
                          <ul className="grid gap-1">
                            {filteredFranchiseGroups.map((franchise) => {
                              const href = `/locations/${encodeURIComponent(franchise.code)}`;
                              
                              // Build address string
                              const addressParts = [
                                franchise.address,
                                franchise.city,
                                franchise.state,
                                franchise.zip_code
                              ].filter(Boolean);
                              const fullAddress = addressParts.join(', ');

                              return (
                                <li key={franchise.id}>
                                  <NavigationMenuLink asChild>
                                    <Link
                                      href={href}
                                      className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                                    >
                                      <div className="flex items-center gap-3">
                                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0 text-primary dark:text-primary-foreground" />
                                        <div className="flex-1 min-w-0">
                                          <div className="text-sm font-medium leading-none">
                                            {franchise.name}
                                          </div>
                                          {fullAddress && (
                                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-snug">
                                              {fullAddress}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </Link>
                                  </NavigationMenuLink>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Other menu items */}
                {routeList.map((route: RouteProps, i) => (
                  <NavigationMenuItem key={i}>
                    <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                      <a
                        rel="noreferrer noopener"
                        href={getHref(route.href)}
                        className="text-[12px]"
                      >
                        {route.label}
                      </a>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                ))}
              </nav>
            </NavigationMenuList>
          </NavigationMenu>

          {/* Right: cart, user menu, mode toggle, and mobile menu */}
          <div className="flex items-center gap-2">
              {/* Mobile: hamburger menu */}
              <div className="flex md:hidden items-center gap-2">
                {status === "loading" ? (
                  <div className="h-9 w-9 flex items-center justify-center">
                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : session ? (
                  <>
                    {/* Shopping Cart Icon for mobile */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative h-9 w-9"
                      asChild
                    >
                      <Link href="/enrollments/cart">
                        <ShoppingCart className="h-5 w-5" />
                        {cartCount > 0 && (
                          <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                          >
                            {cartCount > 9 ? "9+" : cartCount}
                          </Badge>
                        )}
                      </Link>
                    </Button>
                  </>
                ) : null}
                <ModeToggle />

                <Sheet open={isOpen} onOpenChange={setIsOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <Menu className="h-5 w-5" />
                      <span className="sr-only">Menu</span>
                    </Button>
                  </SheetTrigger>

                  <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                    <SheetHeader>
                      <SheetTitle className="font-bold text-xl">
                        Blaze Robotics
                      </SheetTitle>
                    </SheetHeader>
                    <nav className="flex flex-col gap-2 mt-6">
                      {/* Locations Section */}
                      <div className="space-y-2">
                        <div className="px-3 py-2 text-sm font-semibold text-muted-foreground">
                          Locations
                        </div>
                        
                        {/* Search Input for Mobile */}
                        <div className="relative px-3">
                          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search locations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                          />
                        </div>

                        {isLoadingLocations ? (
                          <div className="flex items-center justify-center py-4">
                            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : filteredFranchiseGroups.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            {searchQuery ? 'No locations found' : 'No locations available'}
                          </div>
                        ) : (
                          <div className="space-y-1 max-h-[300px] overflow-y-auto">
                            {filteredFranchiseGroups.map((franchise) => {
                              const href = `/locations/${encodeURIComponent(franchise.code)}`;
                              
                              const addressParts = [
                                franchise.address,
                                franchise.city,
                                franchise.state,
                                franchise.zip_code
                              ].filter(Boolean);
                              const fullAddress = addressParts.join(', ');

                              return (
                                <Button
                                  key={franchise.id}
                                  variant="ghost"
                                  className="w-full justify-start h-auto py-3 px-3"
                                  asChild
                                >
                                  <Link
                                    href={href}
                                    onClick={() => setIsOpen(false)}
                                  >
                                    <div className="flex items-start gap-3 w-full">
                                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                      <div className="flex-1 min-w-0 text-left">
                                        <div className="font-medium text-sm">
                                          {franchise.name}
                                        </div>
                                        {fullAddress && (
                                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                            {fullAddress}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </Link>
                                </Button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="border-t pt-2" />

                      {/* Other menu items */}
                      {routeList.map(({ href, label }: RouteProps) => (
                        <Button
                          key={label}
                          variant="ghost"
                          className="w-full justify-start"
                          asChild
                        >
                          <a
                            rel="noreferrer noopener"
                            href={getHref(href)}
                            onClick={() => setIsOpen(false)}
                          >
                            {label}
                          </a>
                        </Button>
                      ))}
                      <div className="border-t pt-4 mt-2">
                        {status === "loading" ? (
                          <div className="w-full h-9 flex items-center justify-center">
                            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : session ? (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 p-3 rounded-md bg-muted">
                              <Avatar className="h-10 w-10">
                                <AvatarImage
                                  src={session.user?.image || undefined}
                                />
                                <AvatarFallback>
                                  {getUserInitials(session.user?.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {session.user?.name}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {session.user?.email}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              className="w-full justify-start"
                              asChild
                            >
                              <Link
                                href="/profile"
                                onClick={() => setIsOpen(false)}
                              >
                                <User className="mr-2 h-4 w-4" />
                                Profile
                              </Link>
                            </Button>
                            <Button
                              variant="outline"
                              className="w-full justify-start"
                              asChild
                            >
                              <Link
                                href="/settings"
                                onClick={() => setIsOpen(false)}
                              >
                                <Settings className="mr-2 h-4 w-4" />
                                Settings
                              </Link>
                            </Button>
                            <Button
                              variant="outline"
                              className="w-full justify-start"
                              asChild
                            >
                              <Link
                                href="/enrollments/cart"
                                onClick={() => setIsOpen(false)}
                              >
                                <ShoppingCart className="mr-2 h-4 w-4" />
                                Shopping Cart
                                {cartCount > 0 && (
                                  <Badge variant="destructive" className="ml-2">
                                    {cartCount > 9 ? "9+" : cartCount}
                                  </Badge>
                                )}
                              </Link>
                            </Button>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-destructive hover:text-destructive"
                              onClick={() => {
                                handleSignOut()
                                setIsOpen(false)
                              }}
                            >
                              <LogOut className="mr-2 h-4 w-4" />
                              Sign Out
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="default"
                            className="w-full"
                            asChild
                          >
                            <Link
                              href="/login"
                              onClick={() => setIsOpen(false)}
                            >
                              Sign In / Sign Up
                            </Link>
                          </Button>
                        )}
                      </div>
                    </nav>
                  </SheetContent>
                </Sheet>
              </div>

              {/* desktop: cart + user + theme */}
              <div className="hidden md:flex gap-2 items-center">
                {status === "loading" ? (
                  <div className="h-9 w-9 flex items-center justify-center">
                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : session ? (
                  <>
                    {/* Shopping Cart Icon */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative h-9 w-9"
                      asChild
                    >
                      <Link href="/enrollments/cart">
                        <ShoppingCart className="h-5 w-5" />
                        {cartCount > 0 && (
                          <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                          >
                            {cartCount > 9 ? "9+" : cartCount}
                          </Badge>
                        )}
                      </Link>
                    </Button>
                <ModeToggle />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="relative h-9 w-9 rounded-full"
                        >
                          <Avatar className="h-9 w-9">
                            <AvatarImage
                              src={session.user?.image || undefined}
                            />
                            <AvatarFallback>
                              {getUserInitials(session.user?.name)}
                            </AvatarFallback>
                          </Avatar>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        className="w-56"
                        align="end"
                        forceMount
                      >
                        <DropdownMenuLabel className="font-normal">
                          <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">
                              {session.user?.name}
                            </p>
                            <p className="text-xs leading-none text-muted-foreground">
                              {session.user?.email}
                            </p>
                          </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/profile" className="cursor-pointer">
                            <User className="mr-2 h-4 w-4" />
                            <span>Profile</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/settings" className="cursor-pointer">
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="cursor-pointer text-destructive focus:text-destructive"
                          onClick={handleSignOut}
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          <span>Sign Out</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : (
                  <Button variant="default" asChild>
                    <Link href="/login">Sign In / Sign Up</Link>
                  </Button>
                )}
              </div>
            </div>
        </div>
      </header>
    );
  };