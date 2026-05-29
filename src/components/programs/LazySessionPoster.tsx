"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

type LazySessionPosterProps = {
  src: string
  alt: string
  sizes: string
  className?: string
  containerClassName?: string
}

export function LazySessionPoster({
  src,
  alt,
  sizes,
  className,
  containerClassName,
}: LazySessionPosterProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const node = containerRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: "240px 0px" }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={containerRef} className={cn("relative overflow-hidden bg-slate-100", containerClassName)}>
      {isVisible ? (
        <Image
          src={src}
          alt={alt}
          fill
          loading="lazy"
          className={cn("object-cover", className)}
          sizes={sizes}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-100" aria-hidden />
      )}
    </div>
  )
}
