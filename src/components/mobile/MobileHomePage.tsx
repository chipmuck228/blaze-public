'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { QuickActions } from './QuickActions'
import { FeaturedCoursesMobile } from './FeaturedCoursesMobile'
import { LocationSelectionMobile } from './LocationSelectionMobile'
import { Categories } from '@/components/Categories'
import { BlazeLogoIcon } from '@/components/Icons'

export function MobileHomePage() {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="px-4 py-8 bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-4">
            <BlazeLogoIcon />
          </div>
          <h1 className="text-3xl font-bold">
            <span className="bg-gradient-to-r from-[#F596D3] to-[#D247BF] text-transparent bg-clip-text">
              From Imagination
            </span>
            <br />
            <span className="bg-gradient-to-r from-[#61DAFB] via-[#1fc0f1] to-[#03a3d7] text-transparent bg-clip-text">
              To Innovation
            </span>
          </h1>
          <p className="text-muted-foreground">
            Blaze your trail with robotics
          </p>
          <Button size="lg" className="mt-4">
            Browse Courses
          </Button>
        </div>
      </section>

      {/* Quick Actions */}
      <QuickActions />

      {/* Featured Courses */}
      <FeaturedCoursesMobile />

      {/* Location Selection */}
      <LocationSelectionMobile />

      {/* Programs Overview */}
      <section className="px-4 py-6">
        <h2 className="text-xl font-semibold mb-4">Our Programs</h2>
        <Categories />
      </section>

      {/* Recent Activity (仅登录用户) */}
      {session?.user && (
        <section className="px-4 py-6">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                Your recent courses and activities will appear here.
              </p>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  )
}

