import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { LearningPathsList } from "@/components/LearningPathsList"

export default function LearningPathsPage() {
  return (
    <>
      <Navbar />
      <div className="pt-14">
        <LearningPathsList />
        <Footer />
      </div>
    </>
  )
}

