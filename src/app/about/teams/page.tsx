'use client'

import { useState, useEffect, useMemo } from 'react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { AboutHero } from '@/components/about/AboutHero'
import { Users, ThumbsUp, Bookmark, Loader2, Linkedin } from 'lucide-react'
import Image from 'next/image'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { YoutubeIcon, XiaohongshuIcon, FacebookIcon, InstagramIcon } from '@/components/Icons'

interface TeamMember {
  id: string
  user_id?: string | null
  image_url: string
  name: string
  position: string
  description: string
  bio?: string
  display_order: number
  is_featured?: boolean
  is_active?: boolean
  social_networks?: Array<{
    id: string
    name: string
    url: string
    display_order: number
  }>
}

export default function AboutTeamsPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoadingTeam, setIsLoadingTeam] = useState(true)
  const [thumbedUpMembers, setThumbedUpMembers] = useState<Set<string>>(new Set())
  const [markedMembers, setMarkedMembers] = useState<Set<string>>(new Set())

  const memberThumbUpCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    teamMembers.forEach((member) => {
      const hash = member.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
      counts[member.id] = 10 + (hash % 90)
    })
    return counts
  }, [teamMembers])

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        setIsLoadingTeam(true)
        const response = await fetch('/api/teams')
        if (!response.ok) throw new Error('Failed to fetch team')
        const data = await response.json()
        const active = (data || [])
          .filter((c: TeamMember) => c.is_active !== false && c.is_featured !== false)
          .sort((a: TeamMember, b: TeamMember) => a.display_order - b.display_order)
        setTeamMembers(active)
      } catch (error) {
        console.error('Error fetching team:', error)
        setTeamMembers([])
      } finally {
        setIsLoadingTeam(false)
      }
    }
    fetchTeam()
  }, [])

  const getSocialIcon = (name: string) => {
    switch (name) {
      case 'Linkedin': return <Linkedin className="w-5 h-5" />
      case 'Facebook': return <FacebookIcon className="w-5 h-5" />
      case 'Instagram': return <InstagramIcon className="w-5 h-5" />
      case 'Youtube': return <YoutubeIcon className="w-5 h-5" />
      case 'Xiaohongshu': return <XiaohongshuIcon className="w-5 h-5" />
      default: return null
    }
  }

  const handleThumbUp = (memberId: string) => {
    setThumbedUpMembers((prev) => {
      const next = new Set(prev)
      if (next.has(memberId)) next.delete(memberId)
      else next.add(memberId)
      return next
    })
  }

  const handleMark = (memberId: string) => {
    setMarkedMembers((prev) => {
      const next = new Set(prev)
      if (next.has(memberId)) next.delete(memberId)
      else next.add(memberId)
      return next
    })
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-20">
        <div className="pb-24 bg-white">
          <AboutHero />

          <section className="py-24 max-w-7xl mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-4">
              <div className="max-w-xl">
                <h2 className="text-4xl font-bold text-slate-900 mb-4 flex items-center">
                  <Users className="w-8 h-8 mr-3 text-blue-600" />
                  Meet the Team
                </h2>
                <p className="text-slate-500 text-lg">Our instructors are competitive robotics veterans and passionate STEM educators committed to your child&apos;s success.</p>
              </div>
              <button className="bg-slate-50 text-slate-900 px-6 py-3 rounded-2xl font-bold border border-slate-200 hover:bg-slate-100 transition-colors">
                Our Teaching Philosophy
              </button>
            </div>

            {isLoadingTeam ? (
              <div className="flex justify-center items-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="text-center py-24 text-slate-500">
                <Users className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                <p className="text-lg">No team members available at the moment.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {teamMembers.map((member) => {
                  const description = member.description || ''
                  const bio = member.bio || description
                  const isLongText = bio.length > 120
                  const displayText = isLongText ? bio.substring(0, 120).trim() + '...' : bio
                  const initials = member.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)

                  return (
                    <div key={member.id} className="group bg-white rounded-[40px] overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                      <div className="h-72 overflow-hidden relative bg-gradient-to-br from-blue-50 to-blue-100">
                        {member.image_url?.trim() ? (
                          <Image
                            src={member.image_url}
                            alt={member.name}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-700"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }}
                          />
                        ) : null}
                        {!member.image_url?.trim() && (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="h-32 w-32 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                              {initials}
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="p-8">
                        <h3 className="text-2xl font-bold text-slate-900 mb-1">{member.name}</h3>
                        <p className="text-blue-600 font-bold text-sm uppercase tracking-widest mb-4">{member.position}</p>
                        {isLongText ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="text-left w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg p-1 -m-1">
                                <p className="text-slate-500 text-sm leading-relaxed cursor-pointer hover:text-slate-700 transition-colors">{displayText}</p>
                                <span className="text-blue-600 text-xs font-semibold mt-2 inline-block hover:underline">Read more →</span>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 max-w-[90vw] p-6" align="start" side="top">
                              <div className="space-y-3">
                                <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                                  <Avatar className="h-12 w-12 shrink-0">
                                    {member.image_url?.trim() ? (
                                      <>
                                        <AvatarImage src={member.image_url} alt={member.name} />
                                        <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">{initials}</AvatarFallback>
                                      </>
                                    ) : (
                                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white font-semibold">{initials}</AvatarFallback>
                                    )}
                                  </Avatar>
                                  <div className="min-w-0">
                                    <h4 className="font-bold text-slate-900 truncate">{member.name}</h4>
                                    <p className="text-xs text-blue-600 font-semibold uppercase truncate">{member.position}</p>
                                  </div>
                                </div>
                                <div className="text-slate-600 text-sm leading-relaxed max-h-64 overflow-y-auto">
                                  {bio.split('\n').filter(p => p.trim()).map((paragraph, idx) => (
                                    <p key={idx} className="mb-3 last:mb-0">{paragraph.trim()}</p>
                                  ))}
                                </div>
                                <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200">
                                  {member.social_networks?.length ? (
                                    <div className="flex items-center gap-2">
                                      {member.social_networks.sort((a, b) => a.display_order - b.display_order).map((social) => (
                                        <a key={social.id} href={social.url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-600 transition-colors" aria-label={social.name}>
                                          {getSocialIcon(social.name)}
                                        </a>
                                      ))}
                                    </div>
                                  ) : <div />}
                                  <div className="flex items-center gap-2">
                                    <button onClick={() => handleThumbUp(member.id)} className={`relative p-2 rounded-lg transition-all ${thumbedUpMembers.has(member.id) ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`} aria-label="Thumbs up">
                                      <ThumbsUp className={`w-5 h-5 ${thumbedUpMembers.has(member.id) ? 'fill-blue-600' : ''}`} />
                                      {memberThumbUpCounts[member.id] && (
                                        <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none">
                                          {memberThumbUpCounts[member.id] > 99 ? '99+' : memberThumbUpCounts[member.id]}
                                        </span>
                                      )}
                                    </button>
                                    <button onClick={() => handleMark(member.id)} className={`p-2 rounded-lg transition-all ${markedMembers.has(member.id) ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`} aria-label="Bookmark">
                                      <Bookmark className={`w-5 h-5 ${markedMembers.has(member.id) ? 'fill-blue-600' : ''}`} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <p className="text-slate-500 text-sm leading-relaxed">{bio}</p>
                        )}
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            {member.social_networks?.length ? (
                              <div className="flex items-center gap-3">
                                {member.social_networks.sort((a, b) => a.display_order - b.display_order).map((social) => (
                                  <a key={social.id} href={social.url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-600 transition-colors" aria-label={social.name}>
                                    {getSocialIcon(social.name)}
                                  </a>
                                ))}
                              </div>
                            ) : <div />}
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleThumbUp(member.id)} className={`relative p-2 rounded-lg transition-all ${thumbedUpMembers.has(member.id) ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`} aria-label="Thumbs up">
                                <ThumbsUp className={`w-5 h-5 ${thumbedUpMembers.has(member.id) ? 'fill-blue-600' : ''}`} />
                                {memberThumbUpCounts[member.id] && (
                                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none">
                                    {memberThumbUpCounts[member.id] > 99 ? '99+' : memberThumbUpCounts[member.id]}
                                  </span>
                                )}
                              </button>
                              <button onClick={() => handleMark(member.id)} className={`p-2 rounded-lg transition-all ${markedMembers.has(member.id) ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`} aria-label="Bookmark">
                                <Bookmark className={`w-5 h-5 ${markedMembers.has(member.id) ? 'fill-blue-600' : ''}`} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
