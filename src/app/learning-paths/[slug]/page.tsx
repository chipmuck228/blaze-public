import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { LearningPathDetail } from "@/components/LearningPathDetail"
import { notFound } from "next/navigation"
import { getLearningPathBySlug } from "@/lib/db"
import type { Metadata } from "next"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const path = await getLearningPathBySlug(slug)

  if (!path) {
    return {
      title: "Learning Path Not Found",
    }
  }

  return {
    title: path.name,
    description: path.description || `Learn more about ${path.name}`,
  }
}

export default async function LearningPathDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const path = await getLearningPathBySlug(slug)

  if (!path) {
    notFound()
  }

  return (
    <>
      <Navbar />
      <LearningPathDetail path={path} />
      <Footer />
    </>
  )
}

