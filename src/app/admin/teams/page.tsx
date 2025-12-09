'use client'

import { useState, useEffect } from "react"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, MoreVertical, Edit, Trash2, Plus, Loader2 } from "lucide-react"
import { TeamEditDialog } from "@/components/admin/TeamEditDialog"
import Image from "next/image"

interface TeamMember {
  id: string
  image_url: string
  name: string
  position: string
  description: string
  display_order: number
  social_networks: Array<{
    id: string
    name: string
    url: string
    display_order: number
  }>
}

export default function TeamsManagementPage() {
  const [teams, setTeams] = useState<TeamMember[]>([])
  const [filteredTeams, setFilteredTeams] = useState<TeamMember[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [editingTeam, setEditingTeam] = useState<TeamMember | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  useEffect(() => {
    fetchTeams()
  }, [])

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
    if (!confirm("Are you sure you want to delete this team member?")) {
      return
    }

    try {
      const response = await fetch(`/api/admin/teams/${teamId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setTeams(teams.filter((team) => team.id !== teamId))
        setFilteredTeams(filteredTeams.filter((team) => team.id !== teamId))
      } else {
        const data = await response.json()
        alert(data.error || "Failed to delete team member")
      }
    } catch (error) {
      console.error("Error deleting team member:", error)
      alert("Failed to delete team member")
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Social Networks</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell>
                      <div className="relative w-12 h-12 rounded-full overflow-hidden">
                        <Image
                          src={team.image_url}
                          alt={team.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell>{team.position}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {team.description}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {team.social_networks.map((sn) => (
                          <span
                            key={sn.id}
                            className="text-xs bg-secondary px-2 py-1 rounded"
                          >
                            {sn.name}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{team.display_order}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
      />
    </div>
  )
}

