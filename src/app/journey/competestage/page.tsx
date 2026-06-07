import { redirect } from "next/navigation"

type Props = {
  searchParams: Promise<{ location?: string }>
}

/** Legacy path — v3_stage.link and Navbar use /journey/compete */
export default async function CompeteStageRedirect({ searchParams }: Props) {
  const params = await searchParams
  const qs = params.location ? `?location=${encodeURIComponent(params.location)}` : ""
  redirect(`/journey/compete${qs}`)
}
