'use client'

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Plus,
  Loader2,
  Star,
  CircleOff,
  CheckCircle2,
  Linkedin,
  Twitter,
  Facebook,
  Instagram,
  Youtube,
  Globe,
  Link2,
  User,
} from "lucide-react"
import { TeamEditDialog } from "@/components/admin/TeamEditDialog"
import Image from "next/image"
import { adminToast, adminConfirm, getErrorMessage } from "@/lib/admin-toast"
import { isUsableTeamImageUrl } from "@/lib/team-avatar"

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
  social_networks: Array<{
    id: string
    name: string
    url: string
    display_order: number
  }>
  user?: {
    id: string
    name: string
    email: string
    image?: string
    role: string
  }
}

function getSocialIcon(name: string) {
  const n = name.toLowerCase()
  if (n.includes("linkedin")) return Linkedin
  if (n.includes("twitter") || n === "x") return Twitter
  if (n.includes("facebook") || n.includes("fb")) return Facebook
  if (n.includes("instagram") || n.includes("ig")) return Instagram
  if (n.includes("youtube") || n.includes("yt")) return Youtube
  if (n.includes("link") || n.includes("url")) return Link2
  return Globe
}

function TeamsManagementPageContent() {
  const searchParams = useSearchParams()
  const [teams, setTeams] = useState<TeamMember[]>([])
  const [filteredTeams, setFilteredTeams] = useState<TeamMember[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [editingTeam, setEditingTeam] = useState<TeamMember | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [prefilledUserId, setPrefilledUserId] = useState<string | undefined>(undefined)

  useEffect(() => {
    fetchTeams()
  }, [])

  useEffect(() => {
    // 检查 URL 参数
    const editId = searchParams.get('edit')
    const create = searchParams.get('create')
    const userId = searchParams.get('user_id')
    
    if (editId && teams.length > 0) {
      // 编辑模式：找到对应的 team 并打开编辑对话框
      const team = teams.find(t => t.id === editId)
      if (team) {
        setEditingTeam(team)
        setIsEditDialogOpen(true)
      }
    } else if (create && userId) {
      // 创建模式：预填充 user_id
      setPrefilledUserId(userId)
      setIsAddDialogOpen(true)
    }
  }, [searchParams, teams])

  useEffect(() => {
    if (searchQuery) {
      const filtered = teams.filter(
        (team) =>
          team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          team.position.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredTeams(filtered)
    } else {
      setFilteredTeams(teams)
    }
  }, [searchQuery, teams])

  const fetchTeams = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/admin/teams")
      if (response.ok) {
        const data = await response.json()
        setTeams(data)
        setFilteredTeams(data)
      } else {
        console.error("Failed to fetch teams")
      }
    } catch (error) {
      console.error("Error fetching teams:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (teamId: string) => {
    if (!(await adminConfirm({
      title: "Delete this team member?",
      confirmLabel: "Delete",
    }))) {
      return
    }

    try {
      const response = await fetch(`/api/admin/teams/${teamId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setTeams(teams.filter((team) => team.id !== teamId))
        setFilteredTeams(filteredTeams.filter((team) => team.id !== teamId))
        adminToast.success("Team member deleted")
      } else {
        const data = await response.json()
        adminToast.error("Failed to delete team member", {
          description: getErrorMessage(data.error),
        })
      }
    } catch (error) {
      console.error("Error deleting team member:", error)
      adminToast.error("Failed to delete team member", {
        description: getErrorMessage(error),
      })
    }
  }

  const handleEdit = (team: TeamMember) => {
    setEditingTeam(team)
    setIsEditDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingTeam(null)
    setIsAddDialogOpen(true)
  }

  const handleTeamUpdated = () => {
    fetchTeams()
    setIsEditDialogOpen(false)
    setIsAddDialogOpen(false)
    setEditingTeam(null)
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage team members and their information
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Team Member
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                A list of all team members in the system
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or position..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? "No team members found matching your search." : "No team members yet."}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTeams.map((team) => (
                <Card key={team.id} className="overflow-hidden flex flex-col">
                  <div className="flex items-start gap-3 p-4">
                    <div className="relative w-14 h-14 shrink-0 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                      {isUsableTeamImageUrl(team.image_url) ? (
                        <Image
                          src={team.image_url}
                          alt={team.name}
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      ) : (
                        <User className="h-6 w-6 text-muted-foreground" aria-hidden />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm truncate">{team.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{team.position}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(team)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(team.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {team.user ? (
                        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground truncate">
                          <User className="h-3.5 w-3.5 shrink-0" />
                          <span title={team.user.email}>{team.user.name}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                          <User className="h-3.5 w-3.5 shrink-0" />
                          <span>No user linked</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {team.description && (
                    <div className="px-4 pb-2">
                      <p className="text-xs text-muted-foreground line-clamp-2">{team.description}</p>
                    </div>
                  )}
                  <CardContent className="pt-0 pb-4 px-4 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5" title={team.is_featured ? "Featured" : team.is_active !== false ? "Active" : "Inactive"}>
                      {team.is_featured && (
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500" aria-label="Featured" />
                      )}
                      {team.is_active === false ? (
                        <CircleOff className="h-4 w-4 text-muted-foreground" aria-label="Inactive" />
                      ) : (
                        !team.is_featured && (
                          <CheckCircle2 className="h-4 w-4 text-green-600" aria-label="Active" />
                        )
                      )}
                    </div>
                    {team.social_networks.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        {team.social_networks.map((sn) => {
                          const Icon = getSocialIcon(sn.name)
                          return (
                            <a
                              key={sn.id}
                              href={sn.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted"
                              title={`${sn.name}: ${sn.url}`}
                              aria-label={sn.name}
                            >
                              <Icon className="h-4 w-4" />
                            </a>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TeamEditDialog
        team={editingTeam}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onTeamUpdated={handleTeamUpdated}
      />

      <TeamEditDialog
        team={null}
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onTeamUpdated={handleTeamUpdated}
        prefilledUserId={prefilledUserId}
      />
    </div>
  )
}

export default function TeamsManagementPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <TeamsManagementPageContent />
    </Suspense>
  )
}

