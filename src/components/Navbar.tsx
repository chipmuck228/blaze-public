'use client'
import { useState, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

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
import { Menu, LogOut, User, ShoppingCart, Search, MapPin, ChevronDown, X, FileText, Clock, CreditCard, Users, Bell, LayoutDashboard, Briefcase, HelpCircle, ExternalLink, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { normalizeRemoteImageUrl } from "@/lib/normalize-image-url";
import { PUBLIC_USER_AUTH_ENABLED } from "@/lib/public-user-auth";
import { appendCampusToNavLink } from "@/lib/stage-journey-links";

  // Navbar 统一深蓝色（与白底搭配）
  const NAV_TEXT = "text-[#1e3a5f]";
  const NAV_HOVER = "hover:text-[#2563eb]";
  const NAV_ACTIVE = "text-[#2563eb]";
  const DROPDOWN_BG = "bg-white border border-slate-200 shadow-xl";
  const DROPDOWN_ITEM = "text-[#1e3a5f] hover:bg-slate-100 hover:text-[#1e3a5f]";
  const DROPDOWN_ITEM_ACTIVE = "bg-slate-100 text-[#2563eb]";

interface RouteProps {
    href: string;
    label: string;
  }
  
  const routeList: RouteProps[] = [];

  /** Web Campus 列表项（`v2_franchise`，经 GET /api/public/franchises-v2） */
  interface FranchiseGroup {
    id: string;
    code: string;
    name: string;
    poster_url?: string | null;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
  }

  /** v2 category 列表项（仅 active，来自 /api/public/categories 或 franchises/[code]/categories） */
  interface Category {
    id: string;
    name: string;
    display_name: string;
    description?: string | null;
    poster_url?: string | null;
    link?: string | null;
  }

  const isExternalNavLink = (link: string) =>
    link.startsWith('http://') || link.startsWith('https://');

  const isCategoryNavActive = (link: string, pathname: string | null) => {
    if (!pathname) return false;
    const trimmed = link.trim();
    if (isExternalNavLink(trimmed)) return false;

    const [linkPath, linkQuery = ''] = trimmed.split('?');
    if (pathname !== linkPath && !pathname.startsWith(`${linkPath}/`)) {
      return false;
    }
    if (!linkQuery) {
      return pathname === linkPath || pathname.startsWith(`${linkPath}/`);
    }
    if (typeof window === 'undefined') {
      return pathname === linkPath;
    }
    const expected = new URLSearchParams(linkQuery);
    const current = new URLSearchParams(window.location.search);
    for (const [key, value] of expected.entries()) {
      if (current.get(key) !== value) return false;
    }
    return pathname === linkPath;
  };

  function CategoryNavItem({
    category,
    pathname,
    className,
    onNavigate,
    campusCode,
  }: {
    category: Category;
    pathname: string | null;
    className: string;
    onNavigate?: () => void;
    campusCode?: string | null;
  }) {
    const rawLink = category.link?.trim();
    const label = category.display_name || category.name;

    if (!rawLink) {
      return (
        <span
          className={`${className} text-slate-400 cursor-not-allowed select-none`}
          aria-disabled="true"
        >
          {label}
        </span>
      );
    }

    const link = appendCampusToNavLink(rawLink, campusCode ?? null);
    const active = isCategoryNavActive(link, pathname);
    const activeClass = active ? NAV_ACTIVE : NAV_TEXT;

    if (isExternalNavLink(link)) {
      return (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className={`${className} ${activeClass} ${NAV_HOVER}`}
          onClick={onNavigate}
        >
          {label}
        </a>
      );
    }

    return (
      <Link
        href={link}
        className={`${className} ${NAV_HOVER} ${activeClass}`}
        onClick={onNavigate}
      >
        {label}
      </Link>
    );
  }

  /** Campuses dropdown: franchise poster, MapPin fallback */
  function FranchiseLocationIcon({ franchise }: { franchise: FranchiseGroup }) {
    const poster = normalizeRemoteImageUrl(franchise.poster_url);
    if (poster) {
      return (
        <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={poster}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>
      );
    }
    return (
      <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <MapPin className="h-4 w-4 text-primary" strokeWidth={1} />
      </div>
    );
  }

  function AboutMenuIcon({ icon: Icon }: { icon: LucideIcon }) {
    return <Icon className="h-4 w-4 shrink-0 text-primary" strokeWidth={1} />;
  }
  
  export const Navbar = () => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [isLocationsOpen, setIsLocationsOpen] = useState<boolean>(false);
    const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
    const [cartCount, setCartCount] = useState<number>(0);
    const [waitlistCount, setWaitlistCount] = useState<number>(0);
    const [availableCredits, setAvailableCredits] = useState<number>(0);
    const [isStudentAccount, setIsStudentAccount] = useState<boolean>(false);
    const [franchiseGroups, setFranchiseGroups] = useState<FranchiseGroup[]>([]);
    const [filteredFranchiseGroups, setFilteredFranchiseGroups] = useState<FranchiseGroup[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [isLoadingFranchises, setIsLoadingFranchises] = useState<boolean>(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(false);
    const [franchiseFromUrl, setFranchiseFromUrl] = useState<string | null>(null);
    const [hasMounted, setHasMounted] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const { data: session, status } = useSession();

    // Avoid SSR/client mismatch for NextAuth session UI
    useEffect(() => {
      setHasMounted(true);
    }, []);

    // 从 URL 中获取 franchise 参数；保持用户选择的 location（除首页外）
    useEffect(() => {
      if (typeof window === 'undefined') return;
      // 首页不保留 location，其他页从 pathname 或 URL 参数读取
      if (pathname === '/') {
        setFranchiseFromUrl(null);
        return;
      }
      // 1. /locations/[code] -> location 为 code
      const locationMatch = pathname?.match(/^\/locations\/([^/]+)/);
      if (locationMatch) {
        setFranchiseFromUrl(decodeURIComponent(locationMatch[1]).toLowerCase());
        return;
      }
      // 2. /programs、/category/... 从 query 读取 franchise 或 location
      if (pathname === '/programs' || pathname?.startsWith('/category/')) {
        const params = new URLSearchParams(window.location.search);
        const franchise = params.get('franchise') || params.get('location');
        setFranchiseFromUrl(franchise ? franchise.toLowerCase() : null);
        return;
      }
      // 3. /journey/* — campus context via ?location=
      if (pathname?.startsWith('/journey/')) {
        const params = new URLSearchParams(window.location.search);
        const location = params.get('location') || params.get('franchise');
        setFranchiseFromUrl(location ? location.toLowerCase() : null);
        return;
      }
      setFranchiseFromUrl(null);
    }, [pathname]);

    // 当前选中的 location 的 code（用于保持 Navbar 状态并传给 category 等链接）；首页为 null
    const currentLocationCode = useMemo(() => {
      if (!pathname || pathname === '/') return null;
      const locationMatch = pathname.match(/^\/locations\/([^/]+)/);
      if (locationMatch) return decodeURIComponent(locationMatch[1]).toLowerCase();
      if (franchiseFromUrl) return franchiseFromUrl.toLowerCase();
      return null;
    }, [pathname, franchiseFromUrl]);

    // 动态检测当前 location label（从 pathname 或 URL 参数中提取 code，然后查找对应的 franchise name）
    const currentLocationLabel = useMemo(() => {
      if (!currentLocationCode) return null;
      const matchedFranchise = franchiseGroups.find(
        (f) => f.code.toLowerCase() === currentLocationCode
      );
      return matchedFranchise?.name || null;
    }, [currentLocationCode, franchiseGroups]);

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

    // Fetch cart count, waitlist count, credits, and student account status when user is logged in
    useEffect(() => {
      if (!PUBLIC_USER_AUTH_ENABLED) return;
      if (status === 'authenticated' && session?.user) {
        const fetchUserData = async () => {
          try {
            // Fetch cart count
            const cartResponse = await fetch('/api/enrollments/cart');
            if (cartResponse.ok) {
              const cartData = await cartResponse.json();
              setCartCount(cartData.items?.length || 0);
            }

            // Fetch waitlist count
            const waitlistResponse = await fetch('/api/enrollments/waitlist');
            if (waitlistResponse.ok) {
              const waitlistData = await waitlistResponse.json();
              setWaitlistCount(waitlistData.items?.length || 0);
            }

            // Fetch credits
            const creditsResponse = await fetch('/api/enrollments/credits');
            if (creditsResponse.ok) {
              const creditsData = await creditsResponse.json();
              const total = creditsData.credits?.reduce(
                (sum: number, c: { available_amount?: number }) => sum + (c.available_amount ?? 0),
                0
              ) || 0;
              setAvailableCredits(total);
            }

            // Check if student account
            const studentsResponse = await fetch('/api/students/me');
            if (studentsResponse.ok) {
              const studentsData = await studentsResponse.json();
              setIsStudentAccount(studentsData.is_student || false);
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
          }
        };

        fetchUserData();
        // Refresh data every 30 seconds
        const interval = setInterval(fetchUserData, 30000);
        return () => clearInterval(interval);
      } else {
        setCartCount(0);
        setWaitlistCount(0);
        setAvailableCredits(0);
        setIsStudentAccount(false);
      }
    }, [status, session]);

    // Fetch active v2 franchises only (from v2_franchise table)
    useEffect(() => {
      const fetchFranchises = async () => {
        try {
          setIsLoadingFranchises(true);
          const response = await fetch('/api/public/franchises-v2');
          if (response.ok) {
            const data = await response.json();
            const list = Array.isArray(data) ? data : [];
            setFranchiseGroups(list);
            setFilteredFranchiseGroups(list);
          }
        } catch (error) {
          console.error('Error fetching franchises v2:', error);
        } finally {
          setIsLoadingFranchises(false);
        }
      };

      fetchFranchises();
    }, []);

    // Fetch categories: 有 location 时用该 franchise 的 categories（筛选后），否则用 global，以保持「location + 筛选后的 category」一致
    useEffect(() => {
      const code = currentLocationCode ?? null;

      const fetchCategories = async () => {
        try {
          setIsLoadingCategories(true);

          let apiUrl: string;
          if (code) {
            apiUrl = `/api/public/franchises/${encodeURIComponent(code)}/categories`;
          } else {
            apiUrl = '/api/public/categories';
          }

          const response = await fetch(apiUrl);
          if (response.ok) {
            const data = await response.json();
            setCategories(data.categories || []);
          } else if (code) {
            const fallbackResponse = await fetch('/api/public/categories');
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              setCategories(fallbackData.categories || []);
            }
          }
        } catch {
          if (code) {
            try {
              const fallbackResponse = await fetch('/api/public/categories');
              if (fallbackResponse.ok) {
                const fallbackData = await fallbackResponse.json();
                setCategories(fallbackData.categories || []);
              } else {
                setCategories([]);
              }
            } catch {
              setCategories([]);
            }
          } else {
            setCategories([]);
          }
        } finally {
          setIsLoadingCategories(false);
        }
      };

      fetchCategories();
    }, [currentLocationCode]);

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
    const showAuthLoading = PUBLIC_USER_AUTH_ENABLED && (!hasMounted || status === "loading");

    const desktopAuthControl = !PUBLIC_USER_AUTH_ENABLED ? null : showAuthLoading ? (
      <div className="h-9 w-9 flex items-center justify-center" aria-hidden>
        <div className="h-4 w-4 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
      </div>
    ) : session ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-9 w-9 rounded-full text-[#1e3a5f] hover:bg-slate-100"
          >
            <Avatar className="h-9 w-9">
              <AvatarImage src={session.user?.image || undefined} />
              <AvatarFallback className="bg-[#1e3a5f] text-white">
                {getUserInitials(session.user?.name)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-56 bg-white border border-slate-200 shadow-xl text-[#1e3a5f]"
          align="end"
        >
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none text-[#1e3a5f]">
                {session.user?.name}
              </p>
              <p className="text-xs leading-none text-slate-500">{session.user?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-slate-200" />
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/profile" className="flex items-center">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/portal" className="flex items-center">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>My Account</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-slate-200" />
          <DropdownMenuItem
            className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-slate-100"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ) : (
      <Button
        className="bg-[#1e3a5f] text-white px-6 py-2 rounded-full font-bold text-sm hover:bg-[#2d4a6f] transition-all"
        asChild
      >
        <Link href="/login">Sign In / Sign Up</Link>
      </Button>
    );

    const mobileAuthControl = showAuthLoading ? (
      <div className="w-full h-9 flex items-center justify-center" aria-hidden>
        <div className="h-4 w-4 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
      </div>
    ) : session ? (
      <div className="space-y-2">
        <div className="flex items-center gap-2 p-3 rounded-md bg-slate-50 mb-2">
          <Avatar className="h-10 w-10">
            <AvatarImage src={session.user?.image || undefined} />
            <AvatarFallback className="bg-[#1e3a5f] text-white">
              {getUserInitials(session.user?.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-[#1e3a5f]">{session.user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{session.user?.email}</p>
          </div>
        </div>
        <Button variant="outline" className="w-full justify-start bg-white border-slate-200 text-[#1e3a5f] hover:bg-slate-100" asChild>
          <Link href="/profile" onClick={() => setIsOpen(false)}>
            <User className="mr-2 h-4 w-4" />
            Profile
          </Link>
        </Button>
        <Button variant="outline" className="w-full justify-start bg-white border-slate-200 text-[#1e3a5f] hover:bg-slate-100" asChild>
          <Link href="/portal" onClick={() => setIsOpen(false)}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            My Account
          </Link>
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start bg-white border-slate-200 text-red-600 hover:text-red-700 hover:bg-slate-100"
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
        className="w-full bg-[#1e3a5f] text-white px-6 py-3 rounded-md font-bold text-base hover:bg-[#2d4a6f]"
        asChild
      >
        <Link href="/login" onClick={() => setIsOpen(false)}>
          Sign In / Sign Up
        </Link>
      </Button>
    );

    return (
      <nav className={`bg-white ${NAV_TEXT} fixed top-0 z-50 w-full shadow-md`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            {/* Left: Logo */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/Blaze+New+logos+1.webp"
                  alt="BLAZE ROBOTICS Academy"
                  className="h-12 w-auto object-contain"
                />
              </Link>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-6">
              {/* Locations Dropdown */}
              <div className="relative group h-full flex items-center">
                <button 
                  className={`flex items-center space-x-1 text-sm font-semibold transition-colors ${NAV_HOVER} ${isLocationActive ? NAV_ACTIVE : NAV_TEXT}`}
                >
                  {currentLocationLabel ? (
                    <>
                      <MapPin className="w-4 h-4" />
                      <span>{currentLocationLabel}</span>
                    </>
                  ) : (
                    <>
                      <span>Campuses</span>
                    </>
                  )}
                  <ChevronDown className="w-4 h-4 transition-transform group-hover:rotate-180" />
                </button>
                
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-96 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform z-50">
                  <div className={`${DROPDOWN_BG} rounded-xl overflow-hidden`}>
                    <div className="p-4 border-b border-slate-200">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="Search campuses..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 bg-slate-50 border-slate-200 text-[#1e3a5f] placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                      {isLoadingFranchises ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="h-4 w-4 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : filteredFranchiseGroups.length === 0 ? (
                        <div className="text-center py-8 text-sm text-slate-500">
                          {searchQuery ? 'No campuses found' : 'No campuses available'}
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
                                className={`block px-4 py-3 text-sm transition-colors border-b border-slate-100 last:border-0 ${isFranchiseActive ? DROPDOWN_ITEM_ACTIVE : DROPDOWN_ITEM}`}
                              >
                                <div className="flex items-start gap-3">
                                  <FranchiseLocationIcon franchise={franchise} />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium">{franchise.name}</div>
                                    {fullAddress && (
                                      <div className="text-xs text-slate-500 mt-1 line-clamp-2">
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

              {/* Programs — flat category links */}
              {isLoadingCategories ? (
                <div className="h-4 w-4 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" aria-hidden />
              ) : (
                categories.map((category) => (
                  <CategoryNavItem
                    key={category.id}
                    category={category}
                    pathname={pathname}
                    campusCode={currentLocationCode}
                    className="text-sm font-semibold transition-colors whitespace-nowrap"
                  />
                ))
              )}

              {/* About Dropdown */}
              <div className="relative group h-full flex items-center">
                <button
                  className={`flex items-center space-x-1 text-sm font-semibold transition-colors ${NAV_HOVER} ${pathname?.startsWith('/about') ? NAV_ACTIVE : NAV_TEXT}`}
                >
                  <span>About</span>
                  <ChevronDown className="w-4 h-4 transition-transform group-hover:rotate-180" />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform z-50">
                  <div className={`${DROPDOWN_BG} rounded-xl overflow-hidden`}>
                    <div className="py-2">
                      <Link
                        href="/about/teams"
                        className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors border-b border-slate-100 ${pathname === '/about/teams' ? DROPDOWN_ITEM_ACTIVE : DROPDOWN_ITEM}`}
                      >
                        <AboutMenuIcon icon={Users} />
                        <span className="font-medium">Teams</span>
                      </Link>
                      <Link
                        href="/about/careers"
                        className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors border-b border-slate-100 ${pathname === '/about/careers' ? DROPDOWN_ITEM_ACTIVE : DROPDOWN_ITEM}`}
                      >
                        <AboutMenuIcon icon={Briefcase} />
                        <span className="font-medium">Careers</span>
                      </Link>
                      <Link
                        href="/faq"
                        className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${pathname === '/faq' ? DROPDOWN_ITEM_ACTIVE : DROPDOWN_ITEM}`}
                      >
                        <AboutMenuIcon icon={HelpCircle} />
                        <span className="font-medium">FAQ</span>
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
                    className={`text-sm font-semibold transition-colors ${NAV_HOVER} ${active ? NAV_ACTIVE : NAV_TEXT}`}
                  >
                    {route.label}
                  </Link>
                );
              })}

              {/* Book Free Trial Button */}
              <a
                href="https://app.amilia.com/store/en/blazeroboticsacademy/shop/programs/119725?subCategoryIds=6193105&subCategoryIds=6193106"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#1e3a5f] text-white px-6 py-2 rounded-xl font-bold text-sm shadow-md active:scale-95 transition-transform hover:bg-[#2d4a6f] hidden md:inline-flex items-center justify-center gap-1.5"
              >
                Book Free Trial
                <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
              </a>

              {/* User Menu (cart and mode toggle hidden) */}
              {desktopAuthControl}
            </div>

            {/* Mobile Menu Button (cart and mode toggle hidden) */}
            <div className="md:hidden flex items-center gap-2">
              {PUBLIC_USER_AUTH_ENABLED && showAuthLoading ? (
                <div className="h-9 w-9 flex items-center justify-center" aria-hidden>
                  <div className="h-4 w-4 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : null}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-[#1e3a5f] hover:text-[#2563eb] focus:outline-none"
              >
                {isOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isOpen && (
            <div className="md:hidden bg-white border-t border-slate-200 px-4 pt-2 pb-6 space-y-1 overflow-y-auto max-h-[calc(100vh-80px)]">
              {/* Mobile Locations Accordion */}
              <div>
                <button
                  onClick={() => setIsLocationsOpen(!isLocationsOpen)}
                  className={`flex items-center justify-between w-full px-3 py-4 text-base font-medium rounded-md ${isLocationActive ? NAV_ACTIVE : NAV_TEXT} ${NAV_HOVER} hover:bg-slate-100`}
                >
                  <div className="flex items-center gap-2">
                    {currentLocationLabel && <MapPin className="w-5 h-5" />}
                    <span>{currentLocationLabel || 'Campuses'}</span>
                  </div>
                  <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isLocationsOpen ? 'rotate-180' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-200 ${isLocationsOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="pl-4 space-y-1 bg-slate-50 rounded-lg mt-1 mb-2 py-2">
                    <div className="relative px-3 mb-2">
                      <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search campuses..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-white border-slate-200 text-[#1e3a5f] placeholder:text-slate-400"
                      />
                    </div>

                    <div className="max-h-[min(50vh,calc(100vh-14rem))] overflow-y-auto overscroll-contain space-y-1 pr-1">
                    {isLoadingFranchises ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="h-4 w-4 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : filteredFranchiseGroups.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-slate-500">
                        {searchQuery ? 'No campuses found' : 'No campuses available'}
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
                            className={`block px-3 py-3 text-sm font-medium rounded-md ${isFranchiseActive ? NAV_ACTIVE : `${NAV_TEXT} ${NAV_HOVER}`}`}
                          >
                            <div className="flex items-start gap-3">
                              <FranchiseLocationIcon franchise={franchise} />
                              <div className="flex-1 min-w-0">
                                <div>{franchise.name}</div>
                                {fullAddress && (
                                  <div className="text-xs text-slate-500 mt-1 line-clamp-2">
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
              </div>

              {/* Mobile Programs — flat category links */}
              {isLoadingCategories ? (
                <div className="flex items-center justify-center py-4">
                  <div className="h-4 w-4 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" aria-hidden />
                </div>
              ) : (
                categories.map((category) => (
                  <CategoryNavItem
                    key={category.id}
                    category={category}
                    pathname={pathname}
                    campusCode={currentLocationCode}
                    className="block px-3 py-4 text-base font-medium rounded-md hover:bg-slate-100"
                    onNavigate={() => setIsOpen(false)}
                  />
                ))
              )}

              {/* Mobile About Accordion */}
              <div>
                <button
                  onClick={() => setIsAboutOpen(!isAboutOpen)}
                  className={`flex items-center justify-between w-full px-3 py-4 text-base font-medium rounded-md ${pathname?.startsWith('/about') ? NAV_ACTIVE : NAV_TEXT} ${NAV_HOVER} hover:bg-slate-100`}
                >
                  <span>About</span>
                  <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isAboutOpen ? 'rotate-180' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-200 ${isAboutOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="pl-4 space-y-1 bg-slate-50 rounded-lg mt-1 mb-2 py-2">
                    <Link href="/about/teams" onClick={() => { setIsOpen(false); setIsAboutOpen(false); }} className={`flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-md ${pathname === '/about/teams' ? NAV_ACTIVE : `${NAV_TEXT} ${NAV_HOVER}`}`}>
                      <AboutMenuIcon icon={Users} />
                      <span>Teams</span>
                    </Link>
                    <Link href="/about/careers" onClick={() => { setIsOpen(false); setIsAboutOpen(false); }} className={`flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-md ${pathname === '/about/careers' ? NAV_ACTIVE : `${NAV_TEXT} ${NAV_HOVER}`}`}>
                      <AboutMenuIcon icon={Briefcase} />
                      <span>Careers</span>
                    </Link>
                    <Link href="/faq" onClick={() => { setIsOpen(false); setIsAboutOpen(false); }} className={`flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-md ${pathname === '/faq' ? NAV_ACTIVE : `${NAV_TEXT} ${NAV_HOVER}`}`}>
                      <AboutMenuIcon icon={HelpCircle} />
                      <span>FAQ</span>
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
                    className={`block px-3 py-4 text-base font-medium rounded-md ${active ? NAV_ACTIVE : `${NAV_TEXT} ${NAV_HOVER} hover:bg-slate-100`}`}
                  >
                    {label}
                  </Link>
                );
              })}

              {/* Book Free Trial Button - Mobile */}
              <div className="pt-4 px-3 pb-2">
                <a
                  href="https://app.amilia.com/store/en/blazeroboticsacademy/shop/programs/119725?subCategoryIds=6193105&subCategoryIds=6193106"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 bg-[#1e3a5f] text-white px-6 py-4 rounded-xl font-bold text-base active:scale-95 transition-transform hover:bg-[#2d4a6f]"
                  onClick={() => setIsOpen(false)}
                >
                  Book Free Trial
                  <ExternalLink className="h-4 w-4 flex-shrink-0" />
                </a>
              </div>

              {/* User Section */}
              {PUBLIC_USER_AUTH_ENABLED ? (
                <div className="pt-4 border-t border-slate-200">{mobileAuthControl}</div>
              ) : null}
            </div>
          )}
        </div>
      </nav>
    );
  };