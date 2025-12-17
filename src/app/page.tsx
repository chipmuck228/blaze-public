'use client'
import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Cta } from "@/components/Cta";
import { Hero } from "@/components/Hero";
import { Advantages } from "@/components/Advantages";
import { Courses } from "@/components/Courses";
import { Camps } from "@/components/Camps";
import { Testimonials } from "@/components/Testimonials";
import { Footer } from "@/components/Footer";
import { Newsletter } from "@/components/Newsletter";
import { Team } from "@/components/Team";
import { Faq } from "@/components/Faq";
import Link from "next/link";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState<'courses' | 'camps'>('courses');
  const [locations, setLocations] = useState<Array<{
    id: string;
    name: string;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    franchise?: { id: string; code: string; name: string | null };
  }>>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [locationsError, setLocationsError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);

    // Check initial hash only if it exists
    const hash = window.location.hash;
    if (hash === '#camps') {
      setActiveSection('camps');
      // Scroll to camps section after a short delay to ensure it's rendered
      setTimeout(() => {
        const element = document.getElementById('camps');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else if (hash === '#courses') {
      setActiveSection('courses');
      // Scroll to courses section after a short delay
      setTimeout(() => {
        const element = document.getElementById('courses');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
    // If no hash, default to courses (no scrolling)

    // Listen for hash changes (when user clicks navbar links)
    const handleHashChange = () => {
      const newHash = window.location.hash;
      if (newHash === '#camps') {
        setActiveSection('camps');
        // Scroll to camps section
        setTimeout(() => {
          const element = document.getElementById('camps');
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      } else if (newHash === '#courses') {
        setActiveSection('courses');
        // Scroll to courses section
        setTimeout(() => {
          const element = document.getElementById('courses');
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // 加载公开 locations，用于首页 Location 卡片
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setIsLoadingLocations(true);
        setLocationsError(null);
        const res = await fetch("/api/public/locations");
        if (!res.ok) {
          throw new Error("Failed to load locations");
        }
        const data = await res.json();
        setLocations(data || []);
      } catch (err: any) {
        console.error("Error fetching public locations:", err);
        setLocationsError(err.message || "Failed to load locations");
      } finally {
        setIsLoadingLocations(false);
      }
    };

    fetchLocations();
  }, []);

  return (
    <>
      <Navbar />
      <Hero />

      {/* Location selection section */}
      <section
        id="locations"
        className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-16 sm:py-20"
      >
        <div className="flex flex-col gap-8">
          <div className="max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Choose Your Location
            </h2>
            <p className="text-muted-foreground text-base md:text-lg">
              We currently offer programs at multiple locations. Select the campus closest to you to see local programs, schedules, and contact information.
            </p>
          </div>

          {isLoadingLocations ? (
            <div className="py-8 text-sm text-muted-foreground">
              Loading locations...
            </div>
          ) : locationsError ? (
            <div className="py-8 text-sm text-destructive">
              {locationsError}
            </div>
          ) : locations.length === 0 ? (
            <div className="py-8 text-sm text-muted-foreground">
              No locations are currently available. Please check back later.
            </div>
          ) : (
            (() => {
              // 按 franchise 聚合：一个城市（franchise）对应一张卡片，即便有多个 campus
              const franchiseMap = new Map<
                string,
                {
                  code: string;
                  name: string;
                  city?: string | null;
                  state?: string | null;
                  campusCount: number;
                }
              >();

              locations.forEach((loc) => {
                const code = loc.franchise?.code;
                if (!code) {
                  // 没有关联 franchise 的地点可以单独展示或忽略，根据需要这里先忽略
                  return;
                }
                const existing = franchiseMap.get(code);
                if (existing) {
                  franchiseMap.set(code, {
                    ...existing,
                    campusCount: existing.campusCount + 1,
                  });
                } else {
                  franchiseMap.set(code, {
                    code,
                    name: loc.franchise?.name || loc.name,
                    city: loc.city,
                    state: loc.state,
                    campusCount: 1,
                  });
                }
              });

              const franchiseCards = Array.from(franchiseMap.values());

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {franchiseCards.map((fr) => {
                    const href = `/locations/${encodeURIComponent(fr.code)}`;

                    const descriptionParts = [];
                    if (fr.city) descriptionParts.push(fr.city);
                    if (fr.state) descriptionParts.push(fr.state);
                    const baseDescription =
                      descriptionParts.length > 0
                        ? descriptionParts.join(", ")
                        : "Local campuses";
                    const campusSuffix =
                      fr.campusCount > 1
                        ? ` • ${fr.campusCount} campuses`
                        : " • 1 campus";

                    return (
                      <Link
                        key={fr.code}
                        href={href}
                        className="group border rounded-xl p-5 bg-card hover:bg-accent/40 transition-colors flex flex-col justify-between shadow-sm hover:shadow-md"
                      >
                        <div className="space-y-2">
                          <h3 className="text-xl font-semibold group-hover:text-primary transition-colors">
                            {fr.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {baseDescription}
                            {campusSuffix}
                          </p>
                        </div>
                        <div className="mt-4 text-sm font-medium text-primary flex items-center gap-1">
                          <span>View {fr.name} Campus</span>
                          <span
                            aria-hidden="true"
                            className="transition-transform group-hover:translate-x-0.5"
                          >
                            →
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              );
            })()
          )}
        </div>
      </section>

      <Advantages />

      {/* Programs overview: courses & camps (high-level) */}
      <section id="programs">
        {activeSection === 'courses' ? <Courses /> : <Camps />}
      </section>

      <Testimonials />
      <section id="about">
        <Team />
      </section>
      <Faq />
      <Newsletter />
      <Footer />
    </>
  );
}
