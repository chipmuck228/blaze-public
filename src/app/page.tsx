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

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState<'courses' | 'camps'>('courses');

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

  return (
    <>
    <Navbar />
    <Hero />
    <Advantages />
    {activeSection === 'courses' ? <Courses /> : <Camps />}
    <Testimonials />
    <Team />
    <Faq />
    <Newsletter />
    <Footer />
    </>
  );
}
