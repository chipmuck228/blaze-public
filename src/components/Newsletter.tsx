'use client'
import { getErrorMessage } from "@/lib/typed-error"
import { useState } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Checkbox } from "./ui/checkbox"
import { toast } from "sonner"
import { InformationClauseDialog } from "@/components/InformationClauseDialog"

export const Newsletter = () => {
  const [email, setEmail] = useState("")
  const [consent, setConsent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!consent) {
      toast.error("Please consent to the information clause")
      return
    }

    if (!email) {
      toast.error("Please enter your email address")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/public/newsletter/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to subscribe")
      }

      toast.success("Successfully subscribed to newsletter!")
      setEmail("")
      setConsent(false)
    } catch (error: unknown) {
      console.error("Subscription error:", error)
      toast.error(getErrorMessage(error) || "Failed to subscribe. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section id="newsletter" className="relative bg-[#0f172a] flex flex-col lg:flex-row overflow-hidden items-center justify-center">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4"></div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Section: Promotional Message */}
          <div className="text-white">
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
              <span className="text-teal-400">Be the first</span> to know about
              <br />
              the latest updates,
              <br />
              features, and insights
        </h3>
          </div>

          {/* Right Section: Subscription Form */}
          <div className="bg-transparent">
            <h4 className="text-white text-2xl font-semibold mb-6">Subscribe now</h4>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
          <Input
                  type="email"
                  placeholder="Your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white flex-1 text-foreground"
            aria-label="email"
                  required
          />
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto px-6"
                  disabled={!consent}
                >
                  Subscribe
                </Button>
              </div>

              {/* Consent Checkbox */}
              <div className="flex items-start gap-3">
                <Checkbox
                  id="consent"
                  checked={consent}
                  onCheckedChange={(checked) => setConsent(checked === true)}
                  className="mt-1"
                />
                <label
                  htmlFor="consent"
                  className="text-white text-sm leading-relaxed cursor-pointer"
                >
                  I consent to the processing of my personal data by
                  Blaze Robotics Academy as described in the{" "}
                  <button
                    type="button"
                    onClick={() => setIsDialogOpen(true)}
                    className="text-teal-400 hover:text-teal-300 underline"
                  >
                    information clause
                  </button>{" "}
                  to receive newsletter updates and information about programs,
                  events, products, and services.
                </label>
              </div>
        </form>
          </div>
        </div>
      </div>

      {/* Information Clause Dialog */}
      <InformationClauseDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </section>
  )
}