'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

interface CancellationPolicyProps {
  /**
   * Custom cancellation policy text. If not provided, uses the default policy.
   */
  policy?: string | null
  /**
   * Whether to display in a Card wrapper. Default: true
   */
  showCard?: boolean
  /**
   * Custom title. Default: "Cancellation Policy"
   */
  title?: string
  /**
   * Additional className for styling
   */
  className?: string
}

const DEFAULT_POLICY = `You may choose between two refund options: a 100% refund minus a 3% processing fee (plus any applicable taxes) if requested at least 30 days before the activity begins, or a 100% credit that can be applied to future programs, available until the activity starts. If your student cannot attend the program due to illness or an emergency, please contact our staff to discuss transferring to a different session or program. In the event that Blaze Robotics Academy cancels the program, you will receive a full refund of the fees paid.`

export function CancellationPolicy({
  policy,
  showCard = true,
  title = "Cancellation Policy",
  className = "",
}: CancellationPolicyProps) {
  const displayPolicy = policy || DEFAULT_POLICY

  // Format the policy text into structured sections
  const formatPolicy = (text: string) => {
    // Split by periods followed by capital letters (new sentences)
    const sentences = text.split(/(?<=\.)\s+(?=[A-Z])/).filter(s => s.trim())
    
    // Group sentences into logical sections based on key phrases
    const sections: string[] = []
    let currentSection = ""
    
    sentences.forEach((sentence) => {
      const trimmed = sentence.trim()
      if (!trimmed) return
      
      // Check if this sentence starts a new section
      const lowerSentence = trimmed.toLowerCase()
      if (
        lowerSentence.startsWith("you may") ||
        lowerSentence.startsWith("if your") ||
        lowerSentence.startsWith("in the event")
      ) {
        if (currentSection) {
          sections.push(currentSection.trim())
        }
        currentSection = trimmed
      } else {
        currentSection += (currentSection ? " " : "") + trimmed
      }
    })
    
    if (currentSection) {
      sections.push(currentSection.trim())
    }
    
    // If no sections were created, return the original text as a single section
    return sections.length > 0 ? sections : [text]
  }

  const sections = formatPolicy(displayPolicy)

  const content = (
    <div className={`space-y-4 ${className}`}>
      {sections.map((section, index) => (
        <div key={index} className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <p className="text-muted-foreground leading-relaxed">
            {section}
            {!section.endsWith('.') && index === sections.length - 1 ? '.' : ''}
          </p>
        </div>
      ))}
    </div>
  )

  if (showCard) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          {content}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      <h3 className="font-semibold mb-3 text-base">{title}</h3>
      {content}
    </div>
  )
}
