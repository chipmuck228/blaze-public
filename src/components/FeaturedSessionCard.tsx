"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LazyRemoteImage } from "@/components/ui/LazyRemoteImage"
import type { FeaturedSession } from "@/lib/featured-sessions"

function FeaturedSessionBadges({ session }: { session: FeaturedSession }) {
  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 items-start max-w-[calc(100%-2rem)]">
      {session.franchise?.name ? (
        <span className="bg-white/90 backdrop-blur text-slate-900 px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-white/20 truncate max-w-full">
          {session.franchise.name}
        </span>
      ) : null}
      {session.webLocation ? (
        <span className="bg-[#2563eb]/90 backdrop-blur text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-white/20 truncate max-w-full">
          {session.webLocation.display_name || session.webLocation.name}
        </span>
      ) : null}
    </div>
  )
}

interface FeaturedSessionCardProps {
  session: FeaturedSession
  index?: number
  priority?: boolean
}

export function FeaturedSessionCard({ session, index = 0, priority }: FeaturedSessionCardProps) {
  const imageEager = priority ?? index < 2
  const posterFallback = (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1e3a5f] to-[#2d4a6f]">
      <span className="text-white/80 text-4xl font-bold">{session.title.charAt(0)}</span>
    </div>
  )

  return (
    <div className="min-w-[300px] w-[300px] md:min-w-[340px] md:w-[340px] snap-start bg-white rounded-3xl overflow-hidden shadow-xl group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 h-full flex flex-col">
      <div className="h-48 relative overflow-hidden shrink-0">
        {session.poster_url ? (
          <>
            <LazyRemoteImage
              src={session.poster_url}
              alt={session.title}
              containerClassName="absolute inset-0"
              className="group-hover:scale-110 transition-transform duration-700"
              eager={imageEager}
              fallback={posterFallback}
              fallbackTone="dark"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60 pointer-events-none z-[1]" />
          </>
        ) : (
          posterFallback
        )}

        <FeaturedSessionBadges session={session} />
      </div>

      <div className="p-6 flex flex-col flex-grow">
        <h4 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
          {session.title}
        </h4>
        {session.description ? (
          <p className="text-slate-500 text-sm mb-4 line-clamp-2 flex-grow">{session.description}</p>
        ) : (
          <p className="text-slate-500 text-sm mb-4 line-clamp-2 flex-grow">
            Explore {session.title} with hands-on robotics and coding experiences.
          </p>
        )}

        <div className="mt-auto pt-4 border-t border-slate-100">
          <Button
            asChild
            className="w-full sm:w-auto bg-[#1e3a5f] hover:bg-[#2d4a6f] text-white rounded-lg gap-1"
          >
            <Link href={session.href}>
              View Session <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
