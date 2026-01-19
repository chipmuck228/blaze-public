'use client'
import { useState, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

import { ModeToggle } from "./mode-toggle";

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
import { Menu, LogOut, User, Settings, ShoppingCart, Search, MapPin, Rocket, ChevronDown, X } from "lucide-react";
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
    const [isLocationsOpen, setIsLocationsOpen] = useState<boolean>(false);
    const [cartCount, setCartCount] = useState<number>(0);
    const [locations, setLocations] = useState<Location[]>([]);
    const [franchiseGroups, setFranchiseGroups] = useState<FranchiseGroup[]>([]);
    const [filteredFranchiseGroups, setFilteredFranchiseGroups] = useState<FranchiseGroup[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [isLoadingLocations, setIsLoadingLocations] = useState<boolean>(false);
    const pathname = usePathname();
    const router = useRouter();
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
      if (href.startsWith("#") && pathname !== '/') {
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

    const isActive = (path: string) => pathname === path;
    const isLocationActive = pathname?.startsWith('/locations/');

    return (
      <nav className="bg-[#0f172a] text-white fixed top-0 z-50 w-full shadow-lg dark:bg-[#0f172a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            {/* Left: Logo */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <Rocket className="w-10 h-10 text-[#38bdf8]" />
                <div className="flex flex-col">
                  <span className="text-xl font-bold tracking-tighter leading-none">BLAZE ROBOTICS</span>
                  <span className="text-xs uppercase tracking-widest text-[#94a3b8]">Academy</span>
                </div>
              </Link>
              {currentLocationLabel && (
                <span className="hidden sm:inline-flex items-center text-xs font-medium px-2 py-2 rounded-full bg-[#2563eb] text-white ml-3">
                  {currentLocationLabel}
                </span>
              )}
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-8">
              <Link 
                href="/" 
                className={`text-sm font-semibold transition-colors hover:text-[#38bdf8] ${isActive('/') ? 'text-[#38bdf8]' : 'text-gray-300'}`}
              >
                Home
              </Link>

              {/* Locations Dropdown */}
              <div className="relative group h-full flex items-center">
                <button 
                  className={`flex items-center space-x-1 text-sm font-semibold transition-colors hover:text-[#38bdf8] ${isLocationActive ? 'text-[#38bdf8]' : 'text-gray-300'}`}
                >
                  <span>Locations</span>
                  <ChevronDown className="w-4 h-4 transition-transform group-hover:rotate-180" />
                </button>
                
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-96 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform z-50">
                  <div className="bg-[#1e293b] rounded-xl shadow-xl border border-slate-700 overflow-hidden ring-1 ring-black/5">
                    {/* Search Input */}
                    <div className="p-4 border-b border-slate-800">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search locations..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-gray-500"
                        />
                      </div>
                    </div>

                    {/* Locations List */}
                    <div className="max-h-[400px] overflow-y-auto">
                      {isLoadingLocations ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="h-4 w-4 border-2 border-[#38bdf8] border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : filteredFranchiseGroups.length === 0 ? (
                        <div className="text-center py-8 text-sm text-gray-400">
                          {searchQuery ? 'No locations found' : 'No locations available'}
                        </div>
                      ) : (
                        <div className="py-2">
                          {filteredFranchiseGroups.map((franchise) => {
                            const href = `/locations/${encodeURIComponent(franchise.code)}`;
                            const addressParts = [
                              franchise.address,
                              franchise.city,
                              franchise.state,
                              franchise.zip_code
                            ].filter(Boolean);
                            const fullAddress = addressParts.join(', ');
                            const isFranchiseActive = pathname === href;

                            return (
                              <Link
                                key={franchise.id}
                                href={href}
                                className={`block px-4 py-3 text-sm hover:bg-[#2563eb] hover:text-white transition-colors border-b border-slate-800 last:border-0 ${isFranchiseActive ? 'bg-slate-800 text-[#38bdf8]' : 'text-gray-300'}`}
                              >
                                <div className="flex items-start gap-3">
                                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium">{franchise.name}</div>
                                    {fullAddress && (
                                      <div className="text-xs text-gray-400 mt-1 line-clamp-2">
                                        {fullAddress}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Other menu items */}
              {routeList.map((route: RouteProps) => {
                const href = getHref(route.href);
                const active = href.startsWith('#') ? false : isActive(href);
                return (
                  <Link
                    key={route.label}
                    href={href}
                    className={`text-sm font-semibold transition-colors hover:text-[#38bdf8] ${active ? 'text-[#38bdf8]' : 'text-gray-300'}`}
                  >
                    {route.label}
                  </Link>
                );
              })}

              {/* CTA Button or User Menu */}
              {status === "loading" ? (
                <div className="h-9 w-9 flex items-center justify-center">
                  <div className="h-4 w-4 border-2 border-[#38bdf8] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : session ? (
                <>
                  {/* Shopping Cart */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-9 w-9 text-gray-300 hover:text-[#38bdf8]"
                    asChild
                  >
                    <Link href="/enrollments/cart">
                      <ShoppingCart className="h-5 w-5" />
                      {cartCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-[#2563eb]"
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
                          <AvatarFallback className="bg-[#2563eb] text-white">
                            {getUserInitials(session.user?.name)}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-56 bg-[#1e293b] border-slate-700"
                      align="end"
                      forceMount
                    >
                      <DropdownMenuLabel className="font-normal text-white">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {session.user?.name}
                          </p>
                          <p className="text-xs leading-none text-gray-400">
                            {session.user?.email}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-slate-700" />
                      <DropdownMenuItem asChild className="text-gray-300 hover:text-white hover:bg-slate-800">
                        <Link href="/profile" className="cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          <span>Profile</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="text-gray-300 hover:text-white hover:bg-slate-800">
                        <Link href="/settings" className="cursor-pointer">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Settings</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-slate-700" />
                      <DropdownMenuItem
                        className="cursor-pointer text-red-400 hover:text-red-300 hover:bg-slate-800"
                        onClick={handleSignOut}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Sign Out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Button 
                    className="bg-[#2563eb] text-white px-6 py-2 rounded-full font-bold text-sm hover:bg-blue-600 transition-all transform hover:scale-105 shadow-md hover:shadow-blue-500/20"
                    asChild
                  >
                    <Link href="/login">Sign In / Sign Up</Link>
                  </Button>
                  <ModeToggle />
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-2">
              {status === "loading" ? (
                <div className="h-9 w-9 flex items-center justify-center">
                  <div className="h-4 w-4 border-2 border-[#38bdf8] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : session ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-9 w-9 text-gray-300 hover:text-white"
                  asChild
                >
                  <Link href="/enrollments/cart">
                    <ShoppingCart className="h-5 w-5" />
                    {cartCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-[#2563eb]"
                      >
                        {cartCount > 9 ? "9+" : cartCount}
                      </Badge>
                    )}
                  </Link>
                </Button>
              ) : null}
              <ModeToggle />
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-gray-400 hover:text-white focus:outline-none"
              >
                {isOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isOpen && (
            <div className="md:hidden bg-[#1e293b] border-t border-slate-800 px-4 pt-2 pb-6 space-y-1 overflow-y-auto max-h-[calc(100vh-80px)]">
              <Link
                href="/"
                onClick={() => setIsOpen(false)}
                className={`block px-3 py-4 text-base font-medium rounded-md ${isActive('/') ? 'text-[#38bdf8]' : 'text-gray-300 hover:text-white hover:bg-slate-800'}`}
              >
                Home
              </Link>

              {/* Mobile Locations Accordion */}
              <div>
                <button
                  onClick={() => setIsLocationsOpen(!isLocationsOpen)}
                  className="flex items-center justify-between w-full px-3 py-4 text-base font-medium text-gray-300 hover:text-white hover:bg-slate-800 rounded-md"
                >
                  <span>Locations</span>
                  <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isLocationsOpen ? 'rotate-180' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-200 ${isLocationsOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="pl-4 space-y-1 bg-slate-900/50 rounded-lg mt-1 mb-2 py-2">
                    {/* Search Input for Mobile */}
                    <div className="relative px-3 mb-2">
                      <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search locations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-gray-500"
                      />
                    </div>

                    {isLoadingLocations ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="h-4 w-4 border-2 border-[#38bdf8] border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : filteredFranchiseGroups.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-400">
                        {searchQuery ? 'No locations found' : 'No locations available'}
                      </div>
                    ) : (
                      filteredFranchiseGroups.map((franchise) => {
                        const href = `/locations/${encodeURIComponent(franchise.code)}`;
                        const addressParts = [
                          franchise.address,
                          franchise.city,
                          franchise.state,
                          franchise.zip_code
                        ].filter(Boolean);
                        const fullAddress = addressParts.join(', ');
                        const isFranchiseActive = pathname === href;

                        return (
                          <Link
                            key={franchise.id}
                            href={href}
                            onClick={() => {
                              setIsOpen(false);
                              setIsLocationsOpen(false);
                            }}
                            className={`block px-3 py-3 text-sm font-medium rounded-md ${isFranchiseActive ? 'text-[#38bdf8]' : 'text-gray-400 hover:text-white'}`}
                          >
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div>{franchise.name}</div>
                                {fullAddress && (
                                  <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                                    {fullAddress}
                                  </div>
                                )}
                              </div>
                            </div>
                          </Link>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Other menu items */}
              {routeList.map(({ href, label }: RouteProps) => {
                const linkHref = getHref(href);
                const active = linkHref.startsWith('#') ? false : isActive(linkHref);
                return (
                  <Link
                    key={label}
                    href={linkHref}
                    onClick={() => setIsOpen(false)}
                    className={`block px-3 py-4 text-base font-medium rounded-md ${active ? 'text-[#38bdf8]' : 'text-gray-300 hover:text-white hover:bg-slate-800'}`}
                  >
                    {label}
                  </Link>
                );
              })}

              {/* User Section */}
              <div className="pt-4 border-t border-slate-800">
                {status === "loading" ? (
                  <div className="w-full h-9 flex items-center justify-center">
                    <div className="h-4 w-4 border-2 border-[#38bdf8] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : session ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-3 rounded-md bg-slate-900/50 mb-2">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={session.user?.image || undefined}
                        />
                        <AvatarFallback className="bg-[#2563eb] text-white">
                          {getUserInitials(session.user?.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-white">
                          {session.user?.name}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {session.user?.email}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full justify-start bg-transparent border-slate-700 text-gray-300 hover:text-white hover:bg-slate-800"
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
                      className="w-full justify-start bg-transparent border-slate-700 text-gray-300 hover:text-white hover:bg-slate-800"
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
                      className="w-full justify-start bg-transparent border-slate-700 text-gray-300 hover:text-white hover:bg-slate-800"
                      asChild
                    >
                      <Link
                        href="/enrollments/cart"
                        onClick={() => setIsOpen(false)}
                      >
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Shopping Cart
                        {cartCount > 0 && (
                          <Badge variant="destructive" className="ml-2 bg-[#2563eb]">
                            {cartCount > 9 ? "9+" : cartCount}
                          </Badge>
                        )}
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start bg-transparent border-slate-700 text-red-400 hover:text-red-300 hover:bg-slate-800"
                      onClick={() => {
                        handleSignOut();
                        setIsOpen(false);
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <Button 
                    className="w-full bg-[#2563eb] text-white px-6 py-3 rounded-md font-bold text-base hover:bg-blue-600"
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
            </div>
          )}
        </div>
      </nav>
    );
  };