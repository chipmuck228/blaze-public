"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { ImageOff } from "lucide-react"
import { cn } from "@/lib/utils"

export type LazyRemoteImageFallbackTone = "light" | "dark" | "card"

export type LazyRemoteImageProps = {
  src: string
  alt: string
  className?: string
  containerClassName?: string
  /** Skip intersection gate and load immediately. */
  eager?: boolean
  objectFit?: "cover" | "contain"
  fallback?: ReactNode
  fallbackTone?: LazyRemoteImageFallbackTone
  /** Shown on load failure when provided (e.g. avatar initials). */
  fallbackInitials?: string
  rootMargin?: string
  /** Called on load error; when set, internal error fallback is skipped (parent handles retry). */
  onError?: () => void
}

const fallbackToneClass: Record<LazyRemoteImageFallbackTone, string> = {
  light: "bg-gradient-to-br from-slate-200 via-slate-100 to-slate-50 text-slate-500",
  dark: "bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 text-slate-400",
  card: "bg-gradient-to-br from-slate-100 via-slate-50 to-white text-slate-400",
}

function DefaultImageFallback({
  tone,
  initials,
}: {
  tone: LazyRemoteImageFallbackTone
  initials?: string
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center gap-1.5",
        fallbackToneClass[tone]
      )}
      role="img"
      aria-hidden={!initials}
    >
      {initials ? (
        <span
          className={cn(
            "text-lg sm:text-xl font-bold tracking-tight",
            tone === "dark" ? "text-sky-300/90" : "text-[#2563eb]/80"
          )}
        >
          {initials}
        </span>
      ) : (
        <>
          <ImageOff className="h-7 w-7 opacity-45" strokeWidth={1.25} aria-hidden />
          <span className="text-[10px] sm:text-xs font-medium opacity-70 px-3 text-center">
            Image unavailable
          </span>
        </>
      )}
    </div>
  )
}

export function LazyRemoteImage({
  src,
  alt,
  className,
  containerClassName,
  eager = false,
  objectFit = "cover",
  fallback,
  fallbackTone = "card",
  fallbackInitials,
  rootMargin = "200px 0px",
  onError,
}: LazyRemoteImageProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(eager)
  const [hasError, setHasError] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (eager) return
    const node = containerRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [eager, rootMargin])

  const showFallback = !src || hasError
  const showImage = Boolean(src) && isVisible && !hasError

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden bg-slate-100/80", containerClassName)}
    >
      {showFallback &&
        (fallback ?? (
          <DefaultImageFallback tone={fallbackTone} initials={fallbackInitials} />
        ))}

      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            if (onError) {
              onError()
              return
            }
            setHasError(true)
          }}
          className={cn(
            "absolute inset-0 h-full w-full transition-opacity duration-300",
            objectFit === "cover" ? "object-cover" : "object-contain",
            isLoaded ? "opacity-100" : "opacity-0",
            className
          )}
        />
      )}

      {showImage && !isLoaded && !hasError && (
        <div
          className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-200/90 to-slate-100/90"
          aria-hidden
        />
      )}
    </div>
  )
}
