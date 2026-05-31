'use client'
import { useState, useEffect } from "react";
import { usePlatform } from "@/hooks/usePlatform";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { WorldsAchievementsSection } from "@/components/WorldsAchievementsSection";
import { WORLDS_ACHIEVEMENTS_SECTION_ENABLED } from "@/lib/worlds-achievements-config";
import { Advantages } from "@/components/Advantages";
import { Categories } from "@/components/Categories";
import { Testimonials } from "@/components/Testimonials";
import { Footer } from "@/components/Footer";
import { Newsletter } from "@/components/Newsletter";
import { MobileHomePage } from "@/components/mobile/MobileHomePage";
import { MobileLayout } from "./mobile-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MapPin, List } from "lucide-react";
import Link from "next/link";
import { RoboticsJourney } from "@/components/RoboticsJourney";
import { LazyRemoteImage } from "@/components/ui/LazyRemoteImage";

export default function Home() {
  const { isNative, isReady } = usePlatform();
  const [franchises, setFranchises] = useState<Array<{
    id: string;
    code: string;
    name: string;
    poster_url: string | null;
    program_count: number;
    campus_count: number;
  }>>([]);
  const [isLoadingFranchises, setIsLoadingFranchises] = useState(true);
  const [franchisesError, setFranchisesError] = useState<string | null>(null);
  const [locations, setLocations] = useState<Array<{
    id: string;
    name: string;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip_code?: string | null;
    franchise?: { id: string; code: string; name: string | null };
  }>>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [isScrolling, setIsScrolling] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    id: string;
    name: string;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip_code?: string | null;
    franchise?: { id: string; code: string; name: string | null };
  } | null>(null);

  // Scroll to campuses section when linked via /#locations or legacy /locations redirect
  useEffect(() => {
    const scrollToLocations = () => {
      const el = document.getElementById('locations');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    const params = new URLSearchParams(window.location.search);
    if (params.get('section') === 'locations') {
      setTimeout(scrollToLocations, 150);
      window.history.replaceState(null, '', `${window.location.pathname}#locations`);
    } else if (window.location.hash === '#locations') {
      setTimeout(scrollToLocations, 150);
    }

    const handleHashChange = () => {
      if (window.location.hash === '#locations') {
        setTimeout(scrollToLocations, 100);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // 加载公开 v2 franchises（program_count = Web Program / v2_category；campus_count = Web Location / v2_campus）
  useEffect(() => {
    const fetchFranchises = async () => {
      try {
        setIsLoadingFranchises(true);
        setFranchisesError(null);
        const res = await fetch("/api/public/franchises-v2");
        if (!res.ok) {
          throw new Error("Failed to load franchises");
        }
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setFranchises(list.map((f: any) => ({
          id: f.id,
          code: f.code,
          name: f.name ?? "",
          poster_url: f.poster_url ?? null,
          program_count: f.program_count ?? 0,
          campus_count: f.campus_count ?? 0,
        })));
      } catch (err: any) {
        console.error("Error fetching public franchises:", err);
        setFranchisesError(err.message || "Failed to load franchises");
      } finally {
        setIsLoadingFranchises(false);
      }
    };

    fetchFranchises();
  }, []);

  // 加载公开 locations，用于地图显示
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setIsLoadingLocations(true);
        const res = await fetch("/api/public/locations");
        if (!res.ok) {
          throw new Error("Failed to load locations");
        }
        const data = await res.json();
        setLocations(data || []);
      } catch (err: any) {
        console.error("Error fetching public locations:", err);
      } finally {
        setIsLoadingLocations(false);
      }
    };

    fetchLocations();
  }, []);

  // 检测滚动状态，用于显示滚动条
  useEffect(() => {
    const listContainer = document.getElementById('locations-list-scroll');
    if (!listContainer) return;

    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      setIsScrolling(true);
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setIsScrolling(false);
      }, 1000); // 滚动停止 1 秒后隐藏滚动条
    };

    listContainer.addEventListener('scroll', handleScroll);
    return () => {
      listContainer.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [franchises.length]); // 当 franchises 加载完成后设置监听

  // 移动端：显示移动端优化的首页
  // 等待平台检测完成，避免 SSR hydration mismatch
  if (isReady && isNative) {
    return (
      <MobileLayout>
        <MobileHomePage />
      </MobileLayout>
    )
  }

  // Web 端：显示完整的 Web 首页
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        {WORLDS_ACHIEVEMENTS_SECTION_ENABLED && <WorldsAchievementsSection />}
        <Hero />
        {/* <RoboticsJourney /> */}

        {/* Location selection section */}
        <section
          id="locations"
          className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl py-16 sm:py-20 scroll-mt-24"
        >
          {isLoadingFranchises ? (
            <div className="py-12 text-center text-muted-foreground">
              Loading campuses...
            </div>
          ) : franchisesError ? (
            <div className="py-12 text-center text-destructive">
              {franchisesError}
            </div>
          ) : franchises.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No campuses are currently available. Please check back later.
            </div>
          ) : (
            (() => {
              const franchiseCards = franchises.map((fr) => ({
                code: fr.code,
                name: fr.name,
                posterUrl: fr.poster_url,
                programCount: fr.program_count,
                campusCount: fr.campus_count,
              }));

              return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                  {/* Left Section - Header */}
                  <div className="space-y-4">
                    <h2 className="text-4xl md:text-4xl lg:text-5xl font-bold leading-tight text-foreground">
                      Our Campuses
                    </h2>
                    <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                      We currently offer programs at multiple campuses. Select the campus closest to you to see local programs, schedules, and contact information.
                    </p>
                  </div>

                  {/* Right Section - Tabs with List and Map */}
                  <div className="w-full">
                    <Tabs defaultValue="list" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="list" className="flex items-center gap-2">
                          <List className="h-4 w-4" />
                          <span>List</span>
                        </TabsTrigger>
                        <TabsTrigger value="map" className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>Map</span>
                        </TabsTrigger>
                      </TabsList>

                      {/* List View */}
                      <TabsContent value="list" className="mt-0">
                        <div
                          className={`space-y-4 max-h-[600px] overflow-y-auto scrollbar-thin-hover ${isScrolling ? 'scrollbar-visible' : ''}`}
                          id="locations-list-scroll"
                        >
                          {franchiseCards.map((fr) => {
                            const href = `/locations/${encodeURIComponent(fr.code)}`;
                            const programLabel = fr.programCount === 1 ? "1 program" : `${fr.programCount} programs`;
                            const locationLabel = fr.campusCount === 1 ? "1 location" : `${fr.campusCount} locations`;

                            return (
                              <Link
                                key={fr.code}
                                href={href}
                                className="group relative border rounded-xl p-2 bg-card hover:bg-accent/50 transition-all duration-300 flex items-center justify-between shadow-sm hover:shadow-lg hover:border-primary/50"
                              >
                                <div className="flex items-center gap-6 flex-1">
                                  <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden">
                                    {fr.posterUrl ? (
                                      <LazyRemoteImage
                                        src={fr.posterUrl}
                                        alt={fr.name}
                                        containerClassName="w-full h-full rounded-lg"
                                        className="rounded-lg"
                                        fallbackInitials={fr.name.charAt(0).toUpperCase()}
                                        fallbackTone="light"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg">
                                        <span className="text-2xl font-bold text-primary">
                                          {fr.name.charAt(0).toUpperCase()}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                      <h4 className="text-xl md:text-xl font-bold group-hover:text-primary transition-colors">
                                        {fr.name}
                                      </h4>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      {programLabel} • {locationLabel}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex-shrink-0 ml-4">
                                  <div className="w-8 h-8 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                                    <svg
                                      className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 5l7 7-7 7"
                                      />
                                    </svg>
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </TabsContent>

                      {/* Map View */}
                      <TabsContent value="map" className="mt-0">
                        {isLoadingLocations ? (
                          <div className="flex items-center justify-center h-[600px] border rounded-xl bg-muted/50">
                            <p className="text-muted-foreground">Loading map...</p>
                          </div>
                        ) : locations.length === 0 ? (
                          <div className="flex items-center justify-center h-[600px] border rounded-xl bg-muted/50">
                            <p className="text-muted-foreground">No campuses available</p>
                          </div>
                        ) : (
                          <div className="border rounded-xl overflow-hidden bg-muted/50">
                            <div className="h-[600px] relative">
                              {/* Google Maps Embed */}
                              {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
                                <iframe
                                  key={selectedLocation ? `map-${selectedLocation.id}` : 'map-all'}
                                  width="100%"
                                  height="100%"
                                  style={{ border: 0 }}
                                  loading="lazy"
                                  allowFullScreen
                                  referrerPolicy="no-referrer-when-downgrade"
                                  src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(
                                    selectedLocation
                                      ? (() => {
                                        const parts = [
                                          selectedLocation.address,
                                          selectedLocation.city,
                                          selectedLocation.state,
                                          selectedLocation.zip_code
                                        ].filter(Boolean);
                                        return parts.join(', ');
                                      })()
                                      : locations.map(loc => {
                                        const parts = [loc.address, loc.city, loc.state, loc.zip_code].filter(Boolean);
                                        return parts.join(', ');
                                      }).filter(Boolean).join('|')
                                  )}&zoom=${selectedLocation ? '15' : '10'}`}
                                />
                              ) : (
                                <div className="flex items-center justify-center h-full bg-muted/30">
                                  <div className="text-center space-y-2 p-6">
                                    <MapPin className="h-12 w-12 mx-auto text-muted-foreground" />
                                    <p className="text-sm font-medium text-foreground">Map View</p>
                                    <p className="text-xs text-muted-foreground max-w-xs">
                                      Google Maps API key is not configured. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your environment variables.
                                    </p>
                                  </div>
                                </div>
                              )}
                              {/* Selected Location Info Overlay */}
                              {selectedLocation && (
                                <div className="absolute top-4 left-4 right-4 z-10">
                                  <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-4 shadow-lg">
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex-1">
                                        <h3 className="font-semibold text-sm mb-1">{selectedLocation.name}</h3>
                                        <p className="text-xs text-muted-foreground mb-2">
                                          {selectedLocation.franchise?.name || selectedLocation.franchise?.code || 'Unknown'}
                                        </p>
                                        {(() => {
                                          const addressParts = [
                                            selectedLocation.address,
                                            selectedLocation.city,
                                            selectedLocation.state,
                                            selectedLocation.zip_code
                                          ].filter(Boolean);
                                          return addressParts.length > 0 ? (
                                            <p className="text-xs text-muted-foreground">{addressParts.join(', ')}</p>
                                          ) : null;
                                        })()}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => setSelectedLocation(null)}
                                          className="text-xs"
                                        >
                                          Show All
                                        </Button>
                                        <Button
                                          size="sm"
                                          asChild
                                          className="text-xs"
                                        >
                                          <Link href={`/locations/${encodeURIComponent(selectedLocation.franchise?.code || '')}`}>
                                            View Location
                                          </Link>
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                            {/* Location List Overlay */}
                            <div className="p-4 bg-background border-t">
                              <div className="space-y-2 max-h-[200px] overflow-y-auto scrollbar-thin-hover">
                                {locations.map((loc) => {
                                  const addressParts = [loc.address, loc.city, loc.state, loc.zip_code].filter(Boolean);
                                  const fullAddress = addressParts.join(', ');
                                  const franchiseName = loc.franchise?.name || loc.franchise?.code || 'Unknown';
                                  const isSelected = selectedLocation?.id === loc.id;

                                  return (
                                    <div
                                      key={loc.id}
                                      onClick={() => setSelectedLocation(loc)}
                                      className={`block p-3 rounded-lg cursor-pointer transition-colors ${isSelected
                                        ? 'bg-primary/10 border border-primary/20'
                                        : 'hover:bg-accent/50'
                                        }`}
                                    >
                                      <div className="flex items-start gap-3">
                                        <MapPin className={`h-4 w-4 mt-0.5 flex-shrink-0 ${isSelected ? 'text-primary' : 'text-primary/60'}`} />
                                        <div className="flex-1 min-w-0">
                                          <p className={`font-medium text-sm ${isSelected ? 'text-primary' : ''}`}>{loc.name}</p>
                                          <p className="text-xs text-muted-foreground">{franchiseName}</p>
                                          {fullAddress && (
                                            <p className="text-xs text-muted-foreground mt-1">{fullAddress}</p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              );
            })()
          )}
        </section>
        <RoboticsJourney theme="dark" />
        <Advantages theme="light" />

        {/* Programs overview: categories (high-level) */}
        <section id="programs">
          <Categories />
        </section>

        <section>

          <Testimonials />

        </section>
        {/* <section id="about">
          <Team />
        </section> 
        <Faq />*/}
        <Newsletter />
        <Footer />
      </main>
    </div>
  );
}
