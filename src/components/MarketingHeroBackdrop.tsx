import { cn } from "@/lib/utils"

/** Decorative blurs matching `Hero` — use on `bg-hero` marketing sections. */
export function MarketingHeroBackdrop({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-0 opacity-20 pointer-events-none overflow-hidden",
        className
      )}
      aria-hidden
    >
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />
    </div>
  )
}
