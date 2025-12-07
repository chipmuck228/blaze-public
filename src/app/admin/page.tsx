'use client'

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

interface AdminStats {
  totalUsers: number
  verifiedUsers: number
  admins: number
  newToday: number
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch("/api/admin/stats")
      
      if (!response.ok) {
        throw new Error("Failed to fetch stats")
      }

      const data = await response.json()
      setStats(data)
    } catch (err) {
      console.error("Error fetching stats:", err)
      setError("Failed to load statistics")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome to the admin panel. Manage your application from here.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border bg-card p-6">
              <div className="flex items-center justify-center h-16">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border bg-card p-6">
          <p className="text-destructive">{error}</p>
          <button
            onClick={fetchStats}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Total Users</h3>
            <p className="text-2xl font-bold mt-2">{stats?.totalUsers ?? 0}</p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Verified Users</h3>
            <p className="text-2xl font-bold mt-2">{stats?.verifiedUsers ?? 0}</p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Admins</h3>
            <p className="text-2xl font-bold mt-2">{stats?.admins ?? 0}</p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-sm font-medium text-muted-foreground">New Today</h3>
            <p className="text-2xl font-bold mt-2">{stats?.newToday ?? 0}</p>
          </div>
        </div>
      )}
    </div>
  )
}

