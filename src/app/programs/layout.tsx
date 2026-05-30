import { ProgramsAIAssistant } from "@/components/programs-ai/ProgramsAIAssistant"

export default function ProgramsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ProgramsAIAssistant>{children}</ProgramsAIAssistant>
}
