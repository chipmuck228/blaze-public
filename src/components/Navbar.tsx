'use client'
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

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

import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { Button } from "./ui/button";
import { Menu } from "lucide-react";
import { BlazeLogoIcon } from "./Icons";

interface RouteProps {
    href: string;
    label: string;
  }
  
  const routeList: RouteProps[] = [
    {
      href: "#courses",
      label: "Courses",
    },
    {
      href: "#camps",
      label: "Camps",
    },
    {
      href: "#workshops",
      label: "Workshops",
    },
    {
      href: "#competion-teams",
      label: "Competion Teams",
    },
    {
        href: "#about",
        label: "About US",
    },
    {
      href: "#faq",
      label: "FAQ",
    },
  ];
  
  export const Navbar = () => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const pathname = usePathname();
    const isHomePage = pathname === '/';

    // Helper function to get the correct href
    const getHref = (href: string) => {
      // For courses and camps, if not on home page, navigate to home page with hash
      if ((href === '#courses' || href === '#camps') && !isHomePage) {
        // Return absolute path to home with hash: '/#courses' or '/#camps'
        // Using href.slice(1) would remove the hash, but we want to keep it
        // So we return the full path with hash
        return `/${href}`;
      }
      return href;
    };

    return (
      <header 
        className="sticky border-b top-0 z-40 w-full backdrop-blur-sm"
        style={{ 
          backgroundColor: 'hsl(var(--background))',
          borderBottomColor: 'hsl(var(--border))'
        }}
      >
        <NavigationMenu className="mx-auto">
          <NavigationMenuList className="container mx-auto h-14 px-4 flex justify-between ">
            <NavigationMenuItem className="font-bold flex">
              <a
                rel="noreferrer noopener"
                href="/"
                className="ml-2 font-bold text-xl flex"
              >
                <BlazeLogoIcon />
              </a>
            </NavigationMenuItem>
  
            {/* mobile */}
            <span className="flex md:hidden">
              <ModeToggle />
  
              <Sheet
                open={isOpen}
                onOpenChange={setIsOpen}
              >
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
                      Shadcn/React
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
                    <Button
                      variant="secondary"
                      className="w-[110px]"
                      asChild
                    >
                      <a
                        rel="noreferrer noopener"
                        href="https://github.com/leoMirandaa/shadcn-landing-page.git"
                        target="_blank"
                      >
                        <GitHubLogoIcon className="mr-2 w-5 h-5" />
                        Github
                      </a>
                    </Button>
                  </nav>
                </SheetContent>
              </Sheet>
            </span>
  
            {/* desktop */}
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
  
            <div className="hidden md:flex gap-2">
  
              <ModeToggle />
            </div>
          </NavigationMenuList>
        </NavigationMenu>
      </header>
    );
  };