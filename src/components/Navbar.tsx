'use client'
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuList,
    NavigationMenuTrigger,
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

import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Menu, LogOut, User, Settings, ShoppingCart } from "lucide-react";
import { BlazeLogoIcon } from "./Icons";
import Link from "next/link";

interface RouteProps {
    href: string;
    label: string;
  }
  
  const routeList: RouteProps[] = [
    {
      href: "#locations",
      label: "Locations",
    },
    {
      href: "#programs",
      label: "Programs",
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
  
  export const Navbar = () => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [cartCount, setCartCount] = useState<number>(0);
    const pathname = usePathname();
    const router = useRouter();
    const isHomePage = pathname === '/';
    const { data: session, status } = useSession();

    const currentLocationLabel = (() => {
      if (!pathname) return null;
      if (pathname.startsWith("/locations/bellevue")) return "Bellevue";
      if (pathname.startsWith("/locations/belred")) return "Bel-Red";
      if (pathname.startsWith("/locations/issaquah")) return "Issaquah";
      if (pathname.startsWith("/locations/cherrycrest")) return "Cherry Crest";
      return null;
    })();

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

    return (
      <header
        className="sticky border-b top-0 z-40 w-full backdrop-blur-sm"
        style={{
          backgroundColor: "hsl(var(--background))",
          borderBottomColor: "hsl(var(--border))",
        }}
      >
        <NavigationMenu className="mx-auto">
          <NavigationMenuList className="container mx-auto h-14 px-4 sm:px-6 lg:px-8 flex items-center justify-between max-w-7xl">
            {/* Left: logo + desktop menu */}
            <div className="flex items-center gap-4">
              <NavigationMenuItem className="font-bold flex items-center gap-3">
                <a
                  rel="noreferrer noopener"
                  href="/"
                  className="ml-2 font-bold text-xl flex"
                >
                  <BlazeLogoIcon />
                </a>
                {currentLocationLabel && (
                  <span className="hidden sm:inline-flex text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {currentLocationLabel} Campus
                  </span>
                )}
              </NavigationMenuItem>

              {/* desktop menu */}
              <nav className="hidden md:flex gap-2">
                {routeList.map((route: RouteProps, i) => (
                  <Button
                    key={i}
                    variant="ghost"
                    className="text-[12px]"
                    asChild
                  >
                    <a
                      rel="noreferrer noopener"
                      href={getHref(route.href)}
                    >
                      {route.label}
                    </a>
                  </Button>
                ))}
              </nav>
            </div>

            {/* Right: cart, user menu, mode toggle, and mobile menu */}
            <div className="flex items-center gap-2">
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
                <ModeToggle />
              </div>

              {/* mobile: theme + hamburger menu */}
              <span className="flex md:hidden items-center gap-2">
                <ModeToggle />

                <Sheet open={isOpen} onOpenChange={setIsOpen}>
                  <SheetTrigger className="px-2">
                    <Menu
                      className="flex md:hidden h-5 w-5"
                      onClick={() => setIsOpen(true)}
                    >
                    </Menu>
                  </SheetTrigger>

                  <SheetContent side={"left"}>
                    <SheetHeader>
                      <SheetTitle className="font-bold text-xl">
                        Blaze Robotics
                      </SheetTitle>
                    </SheetHeader>
                    <nav className="flex flex-col justify-center items-center gap-2 mt-4">
                      {routeList.map(({ href, label }: RouteProps) => (
                        <Button
                          key={label}
                          variant="ghost"
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
                      {status === "loading" ? (
                        <div className="w-full mt-2 h-9 flex items-center justify-center">
                          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : session ? (
                        <div className="w-full mt-2 flex flex-col gap-2">
                          <div className="flex items-center gap-2 p-2 rounded-md bg-muted">
                            <Avatar className="h-8 w-8">
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
                            className="w-full"
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
                                  {cartCount}
                                </Badge>
                              )}
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full"
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
                          className="w-full mt-2"
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
                    </nav>
                  </SheetContent>
                </Sheet>
              </span>
            </div>
          </NavigationMenuList>
        </NavigationMenu>
      </header>
    );
  };