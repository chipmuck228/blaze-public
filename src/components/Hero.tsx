'use client'
import { Button } from "./ui/button";
import { HeroCards } from "./HeroCards";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const Hero = () => {
  return (
    <section className="relative min-h-[100vh] lg:min-h-[60vh] flex flex-col lg:flex-row bg-[#0f172a] overflow-hidden pt-20 lg:pt-20 items-center justify-center">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4"></div>
      </div>
      <div className="relative z-10 w-full lg:w-1/2 flex flex-col justify-center px-4 sm:px-6 lg:px-12 py-12 lg:py-0">
        <div className="max-w-xl">
          <span className="inline-block bg-[#2563eb] text-white px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-6 shadow-lg shadow-blue-500/20">
            Free Trial opened to register
          </span>
          <h1 className="text-5xl lg:text-7xl font-extrabold text-white leading-[1.1] mb-6 tracking-tight">
            Build Your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#38bdf8] to-[#2563eb]">Future.</span>
          </h1>
          <p className="text-lg text-slate-300 mb-8 leading-relaxed">
            Join Blaze Robotics Academy. From K-2 beginners to world-class VEX competitors, we turn curiosity into engineering mastery.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/programs"
              className="bg-white text-[#0f172a] px-8 py-4 rounded-full font-bold text-lg hover:bg-slate-100 transition-all flex items-center shadow-xl hover:shadow-2xl hover:-translate-y-1"
            >
              Find Your Program
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Hero cards sections */}
      <HeroCards />
    </section>
  );
};