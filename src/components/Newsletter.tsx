'use client'
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
    } catch (error: any) {
      console.error("Subscription error:", error)
      toast.error(error.message || "Failed to subscribe. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section id="newsletter" className="bg-[#0f172a] text-white pt-16 pb-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-16 sm:py-24">
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
                  BlazeRobotics as described in the{" "}
                  <button
                    type="button"
                    onClick={() => setIsDialogOpen(true)}
                    className="text-teal-400 hover:text-teal-300 underline"
                  >
                    information clause
                  </button>{" "}
                  to respond to inquiries and provide information about
                  products and services.
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