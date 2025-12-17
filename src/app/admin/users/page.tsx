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
import { Badge } from "@/components/ui/badge"
import { Search, MoreVertical, Edit, Trash2, Mail, CheckCircle2, XCircle, UserPlus, Plus } from "lucide-react"
import { UserEditDialog } from "@/components/admin/UserEditDialog"
import { CreateUserDialog } from "@/components/admin/CreateUserDialog"
import Link from "next/link"

interface User {
  id: string
  name: string
  email: string
  email_verified: boolean
  role?: string
  created_at: string
  updated_at: string
  has_team_profile?: boolean  // 是否有 Teams 记录
  team_id?: string  // Teams 记录的 ID（如果有）
  is_test_user?: boolean
  invitation_token?: string | null
  invitation_expires_at?: string | null
  password_set_at?: string | null
  must_change_password?: boolean
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      const filtered = users.filter(
        (user) =>
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredUsers(filtered)
    } else {
      setFilteredUsers(users)
    }
  }, [searchQuery, users])

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/admin/users")
      if (response.ok) {
        const data = await response.json()
        // 同时获取 Teams 信息，检查哪些 coach 有 Teams 记录
        const teamsResponse = await fetch("/api/admin/teams")
        if (teamsResponse.ok) {
          const teams = await teamsResponse.json()
          const usersWithTeams = data.map((user: User) => {
            if (user.role === 'coach') {
              const team = teams.find((t: any) => t.user_id === user.id)
              return {
                ...user,
                has_team_profile: !!team,
                team_id: team?.id,
              }
            }
            return user
          })
          setUsers(usersWithTeams)
          setFilteredUsers(usersWithTeams)
        } else {
          setUsers(data)
          setFilteredUsers(data)
        }
      } else {
        console.error("Failed to fetch users")
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (user: User) => {
    // 检查是否有关联的 Teams 记录
    const hasTeamProfile = user.has_team_profile || false
    
    let confirmMessage = "Are you sure you want to delete this user?"
    if (hasTeamProfile) {
      confirmMessage += "\n\n⚠️ WARNING: This will also delete the associated team profile due to CASCADE constraint. This action cannot be undone."
    }

    if (!confirm(confirmMessage)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      })

      const data = await response.json()
      
      if (response.ok) {
        setUsers(users.filter((u) => u.id !== user.id))
        setFilteredUsers(filteredUsers.filter((u) => u.id !== user.id))
        
        // 显示删除结果
        if (data.deletedTeamsCount > 0) {
          alert(`User deleted successfully.\n\n${data.deletedTeamsCount} team profile(s) were also deleted.`)
        } else {
          alert("User deleted successfully.")
        }
      } else {
        // 显示详细的错误信息
        const errorMessage = data.error || "Failed to delete user"
        console.error("Delete user error:", errorMessage)
        alert(`Failed to delete user: ${errorMessage}\n\nPlease check:\n1. RLS policies allow DELETE operation\n2. User is not referenced by other tables\n3. You have admin permissions`)
      }
    } catch (error: any) {
      console.error("Error deleting user:", error)
      alert(`Failed to delete user: ${error.message || "Unknown error"}\n\nPlease check the browser console for details.`)
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setIsEditDialogOpen(true)
  }

  const handleUserUpdated = () => {
    fetchUsers()
    setIsEditDialogOpen(false)
    setEditingUser(null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getUserStatus = (user: User): string => {
    if (user.is_test_user) return "Test User"
    if (user.invitation_token && !user.password_set_at) return "Pending Invitation"
    if (!user.email_verified) return "Unverified"
    return "Active"
  }

  const getUserStatusBadgeVariant = (status: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case "Active":
        return "default"
      case "Pending Invitation":
        return "secondary"
      case "Unverified":
        return "outline"
      case "Test User":
        return "outline"
      default:
        return "outline"
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage all users in the system
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>
                A list of all users in the system
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? "No users found matching your search." : "No users found."}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>User Status</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.email_verified ? (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="mr-1 h-3 w-3" />
                            Unverified
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getUserStatusBadgeVariant(getUserStatus(user))}>
                          {getUserStatus(user)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={
                              user.role === "admin" 
                                ? "default" 
                                : user.role === "coach"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {user.role === "admin" 
                              ? "Admin" 
                              : user.role === "coach"
                              ? "Coach"
                              : "User"}
                          </Badge>
                          {user.role === "coach" && (
                            <Badge variant={user.has_team_profile ? "default" : "outline"}>
                              {user.has_team_profile ? "Has Team Profile" : "No Team Profile"}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(user)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            {user.role === "coach" && (
                              <>
                                {user.has_team_profile ? (
                                  <DropdownMenuItem asChild>
                                    <Link href={`/admin/teams?edit=${user.team_id}`}>
                                      <UserPlus className="mr-2 h-4 w-4" />
                                      View Team Profile
                                    </Link>
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem asChild>
                                    <Link href={`/admin/teams?create&user_id=${user.id}`}>
                                      <UserPlus className="mr-2 h-4 w-4" />
                                      Create Team Profile
                                    </Link>
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                            {user.invitation_token && !user.password_set_at && (
                              <DropdownMenuItem
                                onClick={async () => {
                                  try {
                                    const response = await fetch(`/api/admin/users/${user.id}/resend-invitation`, {
                                      method: "POST",
                                    })
                                    if (response.ok) {
                                      alert("Invitation resent successfully!")
                                      fetchUsers()
                                    } else {
                                      const data = await response.json()
                                      alert(data.error || "Failed to resend invitation")
                                    }
                                  } catch (error) {
                                    alert("Failed to resend invitation")
                                  }
                                }}
                              >
                                <Mail className="mr-2 h-4 w-4" />
                                Resend Invitation
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(user)}
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
            </div>
          )}
        </CardContent>
      </Card>

      {editingUser && (
        <UserEditDialog
          user={editingUser}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onUserUpdated={handleUserUpdated}
        />
      )}

      <CreateUserDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onUserCreated={handleUserUpdated}
      />
    </div>
  )
}

