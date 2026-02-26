'use client'
import { useState, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";

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
import { Menu, LogOut, User, Settings, ShoppingCart, Search, MapPin, ChevronDown, X, BookOpen, GraduationCap, ExternalLink } from "lucide-react";
import { BlazeLogoIcon } from "./Icons";
import Link from "next/link";

interface RouteProps {
    href: string;
    label: string;
  }
  
  const routeList: RouteProps[] = [
    {
      href: "/about",
      label: "About Us",
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

  interface Category {
    id: string;
    name: string;
    display_name: string;
    description?: string | null;
    poster_url?: string | null;
  }
  
  export const Navbar = () => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [isLocationsOpen, setIsLocationsOpen] = useState<boolean>(false);
    const [isProgramsOpen, setIsProgramsOpen] = useState<boolean>(false);
    const [isResourcesOpen, setIsResourcesOpen] = useState<boolean>(false);
    const [cartCount, setCartCount] = useState<number>(0);
    const [locations, setLocations] = useState<Location[]>([]);
    const [franchiseGroups, setFranchiseGroups] = useState<FranchiseGroup[]>([]);
    const [filteredFranchiseGroups, setFilteredFranchiseGroups] = useState<FranchiseGroup[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [isLoadingLocations, setIsLoadingLocations] = useState<boolean>(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(false);
    const [categoryIdsByFranchiseCode, setCategoryIdsByFranchiseCode] = useState<Map<string, Set<string>>>(new Map());
    const [franchiseFromUrl, setFranchiseFromUrl] = useState<string | null>(null);
    const [selectedLocationCode, setSelectedLocationCode] = useState<string | null>(null);
    const pathname = usePathname();
    const router = useRouter();
    const { data: session, status } = useSession();

    const NAVBAR_LOCATION_KEY = 'navbar_selected_location';

    // 从 URL 中获取 franchise 参数（用于 course-catalog 和 programs 页面）
    useEffect(() => {
      if (typeof window !== 'undefined') {
        if (pathname === '/course-catalog' || pathname === '/programs') {
        const params = new URLSearchParams(window.location.search);
          const franchise = params.get('franchise') || params.get('location');
        setFranchiseFromUrl(franchise);
      } else {
        setFranchiseFromUrl(null);
        }
      }
    }, [pathname]);

    // 持久化用户选择的 location：首页清除；进入某 location 或带 location 的 programs 时写入；其他页面从 sessionStorage 恢复
    useEffect(() => {
      if (typeof window === 'undefined') return;
      if (pathname === '/') {
        sessionStorage.removeItem(NAVBAR_LOCATION_KEY);
        setSelectedLocationCode(null);
        return;
      }
      const locationMatch = pathname.match(/^\/locations\/([^/]+)/);
      if (locationMatch) {
        const code = decodeURIComponent(locationMatch[1]).toLowerCase();
        sessionStorage.setItem(NAVBAR_LOCATION_KEY, code);
        setSelectedLocationCode(code);
        return;
      }
      if ((pathname === '/programs' || pathname === '/course-catalog') && franchiseFromUrl) {
        const code = franchiseFromUrl.toLowerCase();
        sessionStorage.setItem(NAVBAR_LOCATION_KEY, code);
        setSelectedLocationCode(code);
        return;
      }
      const stored = sessionStorage.getItem(NAVBAR_LOCATION_KEY);
      setSelectedLocationCode(stored || null);
    }, [pathname, franchiseFromUrl]);

    // 当前显示的 location 名称：有选中 location 时显示对应 franchise 名称，否则显示 “Locations”
    const currentLocationLabel = useMemo(() => {
      if (!selectedLocationCode) return null;
      const matched = franchiseGroups.find((f) => f.code.toLowerCase() === selectedLocationCode);
      return matched?.name || null;
    }, [selectedLocationCode, franchiseGroups]);

    // Helper function to get the correct href
    const getHref = (href: string) => {
      // 如果在 location 页面，Programs 链接应该跳转到本页的 #programs
      if (href === "#programs" && pathname?.startsWith('/locations/')) {
        return href;
      }
      // For hash links, if不在首页则跳转到首页并带上 hash
      if (href.startsWith("#") && pathname !== '/') {
        return `/${href}`;
      }
      return href;
    };

    // Map category to dedicated offering page when name matches (camps, courses, workshop, competition)
    const getCategoryHref = (category: Category) => {
      const name = (category.name || "").toLowerCase();
      if (name.includes("camp")) return "/camps";
      if (name.includes("course")) return "/course-offering";
      if (name.includes("workshop")) return "/workshopoffering";
      if (name.includes("competition")) return "/competition";
      return `/programs?category=${encodeURIComponent(category.id)}`;
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

    // Fetch categories
    useEffect(() => {
      const fetchCategories = async () => {
        try {
          setIsLoadingCategories(true);
          const response = await fetch('/api/public/categories');
          if (response.ok) {
            const data = await response.json();
            setCategories(data.categories || []);
          }
        } catch (error) {
          console.error('Error fetching categories:', error);
        } finally {
          setIsLoadingCategories(false);
        }
      };

      fetchCategories();
    }, []);

    // Fetch instances to know which categories each franchise has (for location-scoped Offerings)
    useEffect(() => {
      const fetchInstances = async () => {
        try {
          const response = await fetch('/api/public/instances');
          if (!response.ok) return;
          const data = await response.json();
          const franchisesList = data.franchises || [];
          const map = new Map<string, Set<string>>();
          franchisesList.forEach((franchise: { code: string; programs?: { category?: { id: string } }[] }) => {
            const code = (franchise.code || '').toLowerCase();
            if (!code) return;
            const set = map.get(code) || new Set<string>();
            (franchise.programs || []).forEach((program: { category?: { id: string } }) => {
              if (program.category?.id) set.add(program.category.id);
            });
            if (set.size > 0) map.set(code, set);
          });
          setCategoryIdsByFranchiseCode(map);
        } catch (error) {
          console.error('Error fetching instances for navbar:', error);
        }
      };
      fetchInstances();
    }, []);

    // 用于 Offerings 过滤的 location：仅在非首页时使用已选中的 location，首页始终为 null（显示全部）
    const effectiveLocationCodeForOfferings = pathname === '/' ? null : selectedLocationCode;

    // Offerings 列表：首页显示全部 categories，其他页面只显示该 location 有的 categories
    const displayedCategories = useMemo(() => {
      if (!effectiveLocationCodeForOfferings) return categories;
      const ids = categoryIdsByFranchiseCode.get(effectiveLocationCodeForOfferings);
      if (!ids || ids.size === 0) return [];
      return categories.filter((c) => ids.has(c.id));
    }, [categories, effectiveLocationCodeForOfferings, categoryIdsByFranchiseCode]);

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
    const isLocationActive = !!selectedLocationCode;

    return (
      <nav className="bg-white text-[#1e3a8a] fixed top-0 z-50 w-full shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            {/* Left: Logo */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <Image 
                  src="/Blaze+New+logos+1.webp" 
                  alt="Blaze Robotics Logo" 
                  width={120} 
                  height={120}
                  className="h-10 w-auto object-contain"
                  priority
                  quality={100}
                  unoptimized={true}
                />
              </Link>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-8">
              {/* Locations Dropdown */}
              <div className="relative group h-full flex items-center">
                <button 
                  className={`flex items-center space-x-1 text-sm font-semibold transition-colors hover:text-[#2563eb] ${isLocationActive ? 'text-[#2563eb]' : 'text-[#1e3a8a]'}`}
                >
                  {currentLocationLabel ? (
                    <>
                      <MapPin className="w-4 h-4" />
                      <span>{currentLocationLabel}</span>
                    </>
                  ) : (
                    <>
                      <span>Locations</span>
                    </>
                  )}
                  <ChevronDown className="w-4 h-4 transition-transform group-hover:rotate-180" />
                </button>
                
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-96 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform z-50">
                  <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden ring-1 ring-black/5">
                    {/* Search Input */}
                    <div className="p-4 border-b border-gray-200">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search locations..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 bg-gray-50 border-gray-300 text-[#1e3a8a] placeholder:text-gray-500"
                        />
                      </div>
                    </div>

                    {/* Locations List */}
                    <div className="max-h-[400px] overflow-y-auto">
                      {isLoadingLocations ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="h-4 w-4 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : filteredFranchiseGroups.length === 0 ? (
                        <div className="text-center py-8 text-sm text-gray-500">
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
                                className={`block px-4 py-3 text-sm hover:bg-blue-50 hover:text-[#2563eb] transition-colors border-b border-gray-100 last:border-0 ${isFranchiseActive ? 'bg-blue-50 text-[#2563eb]' : 'text-[#1e3a8a]'}`}
                              >
                                <div className="flex items-start gap-3">
                                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium">{franchise.name}</div>
                                    {fullAddress && (
                                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">
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

              {/* Programs Dropdown */}
              <div className="relative group h-full flex items-center">
                <button 
                  className={`flex items-center space-x-1 text-sm font-semibold transition-colors hover:text-[#2563eb] ${['/programs', '/camps', '/course-offering', '/workshopoffering', '/competition'].includes(pathname || '') ? 'text-[#2563eb]' : 'text-[#1e3a8a]'}`}
                >
                  <span>Offerings</span>
                  <ChevronDown className="w-4 h-4 transition-transform group-hover:rotate-180" />
                </button>
                
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform z-50">
                  <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden ring-1 ring-black/5">
                    {/* Categories List */}
                    <div className="max-h-[400px] overflow-y-auto">
                      {isLoadingCategories ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="h-4 w-4 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : displayedCategories.length === 0 ? (
                        <div className="text-center py-8 text-sm text-gray-500">
                          {effectiveLocationCodeForOfferings ? 'No offerings at this location' : 'No categories available'}
                        </div>
                      ) : (
                        <div className="py-2">
                          {displayedCategories.map((category) => {
                            const href = getCategoryHref(category);
                            const isProgramsWithCategory = pathname === '/programs' && new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('category') === category.id;
                            const isCategoryActive = isProgramsWithCategory || (href.startsWith('/') && !href.includes('?') && pathname === href);

                            return (
                              <Link
                                key={category.id}
                                href={href}
                                className={`block px-4 py-3 text-sm hover:bg-blue-50 hover:text-[#2563eb] transition-colors border-b border-gray-100 last:border-0 ${isCategoryActive ? 'bg-blue-50 text-[#2563eb]' : 'text-[#1e3a8a]'}`}
                              >
                                <div className="flex items-start gap-3">
                                  <BookOpen className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium">{category.display_name || category.name}</div>
                                    {category.description && (
                                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                                        {category.description}
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

              {/* Resources Dropdown */}
              <div className="relative group h-full flex items-center">
                <button 
                  className={`flex items-center space-x-1 text-sm font-semibold transition-colors hover:text-[#2563eb] ${pathname === '/resources' || pathname?.startsWith('/teacher-portal') ? 'text-[#2563eb]' : 'text-[#1e3a8a]'}`}
                >
                  <span>Resources</span>
                  <ChevronDown className="w-4 h-4 transition-transform group-hover:rotate-180" />
                </button>
                
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform z-50">
                  <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden ring-1 ring-black/5">
                    <div className="py-2">
                      <Link
                        href="/resources"
                        className={`block px-4 py-3 text-sm hover:bg-blue-50 hover:text-[#2563eb] transition-colors border-b border-gray-100 ${pathname === '/resources' ? 'bg-blue-50 text-[#2563eb]' : 'text-[#1e3a8a]'}`}
                      >
                        <div className="flex items-start gap-3">
                          <BookOpen className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">Resource Library</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Software, manuals, and guides
                            </div>
                          </div>
                        </div>
                      </Link>
                      <Link
                        href="/teacher-portal/login"
                        className={`block px-4 py-3 text-sm hover:bg-blue-50 hover:text-[#2563eb] transition-colors ${pathname?.startsWith('/teacher-portal') ? 'bg-blue-50 text-[#2563eb]' : 'text-[#1e3a8a]'}`}
                      >
                        <div className="flex items-start gap-3">
                          <GraduationCap className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">Teacher Portal</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Instructor workspace and tools
                            </div>
                          </div>
                        </div>
                      </Link>
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
                    className={`text-sm font-semibold transition-colors hover:text-[#2563eb] ${active ? 'text-[#2563eb]' : 'text-[#1e3a8a]'}`}
                  >
                    {route.label}
                  </Link>
                );
              })}

              {/* Book Free Trial Button */}
              <a
                href="https://app.amilia.com/store/en/blazeroboticsacademy/shop/activities/6600153?scrollToCalendar=true&date=2026-02-28&view=month"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#2563eb] text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 active:scale-95 transition-transform hover:bg-blue-600 hidden md:inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
              >
                <span>Book Free Trial</span>
                <ExternalLink className="w-4 h-4 shrink-0" aria-hidden />
              </a>

              {/* CTA Button or User Menu */}
              {status === "loading" ? (
                <div className="h-9 w-9 flex items-center justify-center">
                  <div className="h-4 w-4 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : session ? (
                <>
                  {/* Shopping Cart - Hidden */}
                  {/* <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-9 w-9 text-[#1e3a8a] hover:text-[#2563eb]"
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
                  </Button> */}
                  {/* <ModeToggle /> */}
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
                      className="w-56 bg-white border-gray-200"
                      align="end"
                      forceMount
                    >
                      <DropdownMenuLabel className="font-normal text-[#1e3a8a]">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {session.user?.name}
                          </p>
                          <p className="text-xs leading-none text-gray-500">
                            {session.user?.email}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-gray-200" />
                      <DropdownMenuItem asChild className="text-[#1e3a8a] hover:text-[#2563eb] hover:bg-blue-50">
                        <Link href="/profile" className="cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          <span>Profile</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="text-[#1e3a8a] hover:text-[#2563eb] hover:bg-blue-50">
                        <Link href="/settings" className="cursor-pointer">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Settings</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-gray-200" />
                      <DropdownMenuItem
                        className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
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
                  {/* <ModeToggle /> */}
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-2">
              {status === "loading" ? (
                <div className="h-9 w-9 flex items-center justify-center">
                  <div className="h-4 w-4 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : null}
              {/* Shopping Cart - Hidden */}
              {/* {session ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-9 w-9 text-[#1e3a8a] hover:text-[#2563eb]"
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
              ) : null} */}
              {/* <ModeToggle /> */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-[#1e3a8a] hover:text-[#2563eb] focus:outline-none"
              >
                {isOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isOpen && (
            <div className="md:hidden bg-white border-t border-gray-200 px-4 pt-2 pb-6 space-y-1 overflow-y-auto max-h-[calc(100vh-80px)]">
              {/* Mobile Locations Accordion */}
              <div>
                <button
                  onClick={() => setIsLocationsOpen(!isLocationsOpen)}
                  className={`flex items-center justify-between w-full px-3 py-4 text-base font-medium rounded-md ${isLocationActive ? 'text-[#2563eb] hover:text-[#3b82f6]' : 'text-[#1e3a8a] hover:text-[#2563eb]'} hover:bg-blue-50`}
                >
                  <div className="flex items-center gap-2">
                    {currentLocationLabel && <MapPin className="w-5 h-5" />}
                    <span>{currentLocationLabel || 'Locations'}</span>
                  </div>
                  <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isLocationsOpen ? 'rotate-180' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-200 ${isLocationsOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="pl-4 space-y-1 bg-gray-50 rounded-lg mt-1 mb-2 py-2">
                    {/* Search Input for Mobile */}
                    <div className="relative px-3 mb-2">
                      <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search locations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-white border-gray-300 text-[#1e3a8a] placeholder:text-gray-500"
                      />
                    </div>

                    {isLoadingLocations ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="h-4 w-4 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : filteredFranchiseGroups.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-500">
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
                            className={`block px-3 py-3 text-sm font-medium rounded-md ${isFranchiseActive ? 'text-[#2563eb]' : 'text-[#1e3a8a] hover:text-[#2563eb]'}`}
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

              {/* Mobile Programs Accordion */}
              <div>
                <button
                  onClick={() => setIsProgramsOpen(!isProgramsOpen)}
                  className="flex items-center justify-between w-full px-3 py-4 text-base font-medium text-[#1e3a8a] hover:text-[#2563eb] hover:bg-blue-50 rounded-md"
                >
                  <span>Offerings</span>
                  <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isProgramsOpen ? 'rotate-180' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-200 ${isProgramsOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="pl-4 space-y-1 bg-gray-50 rounded-lg mt-1 mb-2 py-2">
                    {isLoadingCategories ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="h-4 w-4 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : displayedCategories.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        {effectiveLocationCodeForOfferings ? 'No offerings at this location' : 'No categories available'}
                      </div>
                    ) : (
                      displayedCategories.map((category) => {
                        const href = getCategoryHref(category);
                        const isProgramsWithCategory = pathname === '/programs' && new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('category') === category.id;
                        const isCategoryActive = isProgramsWithCategory || (href.startsWith('/') && !href.includes('?') && pathname === href);

                        return (
                          <Link
                            key={category.id}
                            href={href}
                            onClick={() => {
                              setIsOpen(false);
                              setIsProgramsOpen(false);
                            }}
                            className={`block px-3 py-3 text-sm font-medium rounded-md ${isCategoryActive ? 'text-[#2563eb]' : 'text-[#1e3a8a] hover:text-[#2563eb]'}`}
                          >
                            <div className="flex items-start gap-2">
                              <BookOpen className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div>{category.display_name || category.name}</div>
                                {category.description && (
                                  <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                                    {category.description}
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

              {/* Mobile Resources Accordion */}
              <div>
                <button
                  onClick={() => setIsResourcesOpen(!isResourcesOpen)}
                  className="flex items-center justify-between w-full px-3 py-4 text-base font-medium text-[#1e3a8a] hover:text-[#2563eb] hover:bg-blue-50 rounded-md"
                >
                  <span>Resources</span>
                  <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isResourcesOpen ? 'rotate-180' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-200 ${isResourcesOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="pl-4 space-y-1 bg-gray-50 rounded-lg mt-1 mb-2 py-2">
                    <Link
                      href="/resources"
                      onClick={() => {
                        setIsOpen(false);
                        setIsResourcesOpen(false);
                      }}
                      className={`block px-3 py-3 text-sm font-medium rounded-md ${pathname === '/resources' ? 'text-[#2563eb]' : 'text-[#1e3a8a] hover:text-[#2563eb]'}`}
                    >
                      <div className="flex items-start gap-2">
                        <BookOpen className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div>Resource Library</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Software, manuals, and guides
                          </div>
                        </div>
                      </div>
                    </Link>
                    <Link
                      href="/teacher-portal/login"
                      onClick={() => {
                        setIsOpen(false);
                        setIsResourcesOpen(false);
                      }}
                      className={`block px-3 py-3 text-sm font-medium rounded-md ${pathname?.startsWith('/teacher-portal') ? 'text-[#2563eb]' : 'text-[#1e3a8a] hover:text-[#2563eb]'}`}
                    >
                      <div className="flex items-start gap-2">
                        <GraduationCap className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div>Teacher Portal</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Instructor workspace and tools
                          </div>
                        </div>
                      </div>
                    </Link>
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
                    className={`block px-3 py-4 text-base font-medium rounded-md ${active ? 'text-[#2563eb]' : 'text-[#1e3a8a] hover:text-[#2563eb] hover:bg-blue-50'}`}
                  >
                    {label}
                  </Link>
                );
              })}

              {/* Book Free Trial Button - Mobile */}
              <div className="pt-4 px-3 pb-2">
                <a
                  href="https://app.amilia.com/store/en/blazeroboticsacademy/shop/activities/6600153?scrollToCalendar=true&date=2026-02-28&view=month"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#2563eb] text-white px-6 py-4 rounded-xl font-bold text-base shadow-lg shadow-blue-500/20 active:scale-95 transition-transform flex items-center justify-center gap-2 whitespace-nowrap"
                  onClick={() => setIsOpen(false)}
                >
                  <span>Book Free Trial</span>
                  <ExternalLink className="w-5 h-5 shrink-0" aria-hidden />
                </a>
              </div>

              {/* User Section */}
              <div className="pt-4 border-t border-gray-200">
                {status === "loading" ? (
                  <div className="w-full h-9 flex items-center justify-center">
                    <div className="h-4 w-4 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : session ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-3 rounded-md bg-gray-50 mb-2">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={session.user?.image || undefined}
                        />
                        <AvatarFallback className="bg-[#2563eb] text-white">
                          {getUserInitials(session.user?.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-[#1e3a8a]">
                          {session.user?.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {session.user?.email}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full justify-start bg-transparent border-gray-300 text-[#1e3a8a] hover:text-[#2563eb] hover:bg-blue-50"
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
                      className="w-full justify-start bg-transparent border-gray-300 text-[#1e3a8a] hover:text-[#2563eb] hover:bg-blue-50"
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
                    {/* Shopping Cart - Hidden */}
                    {/* <Button
                      variant="outline"
                      className="w-full justify-start bg-transparent border-gray-300 text-[#1e3a8a] hover:text-[#2563eb] hover:bg-blue-50"
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
                    </Button> */}
                    <Button
                      variant="outline"
                      className="w-full justify-start bg-transparent border-gray-300 text-red-600 hover:text-red-700 hover:bg-red-50"
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