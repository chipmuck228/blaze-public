'use client'

import { useState, useEffect, useMemo } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, MoreVertical, Edit, Trash2, Mail, CheckCircle2, UserPlus, Plus, Link as LinkIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { UserEditDialog } from "@/components/admin/UserEditDialog"
import { CreateUserDialog } from "@/components/admin/CreateUserDialog"
import Link from "next/link"
import { adminToast, adminConfirm, getErrorMessage } from "@/lib/admin-toast"
import type { StringKeyRecord } from "@/lib/typed-error"

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

const PAGE_SIZE_OPTIONS = [10, 50, 100] as const

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [pageSize, setPageSize] = useState<number>(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q)
    )
  }, [users, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize))
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredUsers.slice(start, start + pageSize)
  }, [filteredUsers, currentPage, pageSize])

  useEffect(() => {
    setCurrentPage((p) => (p > totalPages ? totalPages : p))
  }, [totalPages])

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/admin/users")
      if (response.ok) {
        const data = await response.json()
        // 同时获取 Teams 信息，检查哪些 coach 有 Teams 记录
        const teamsResponse = await fetch("/api/admin/teams")
        if (teamsResponse.ok) {
          const teams = (await teamsResponse.json()) as Array<{ id: string; user_id: string }>
          const usersWithTeams = data.map((user: User) => {
            if (user.role === 'coach') {
              const team = teams.find((t) => t.user_id === user.id)
              return {
                ...user,
                has_team_profile: !!team,
                team_id: team?.id,
              }
            }
            return user
          })
          setUsers(usersWithTeams)
        } else {
          setUsers(data)
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
    const hasTeamProfile = user.has_team_profile || false

    const confirmed = await adminConfirm({
      title: "Delete this user?",
      description: hasTeamProfile
        ? "This will also delete the associated team profile. This action cannot be undone."
        : "This action cannot be undone.",
      confirmLabel: "Delete",
    })
    if (!confirmed) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      })

      const data = await response.json()
      
      if (response.ok) {
        setUsers(users.filter((u) => u.id !== user.id))
        
        if (data.deletedTeamsCount > 0) {
          adminToast.success("User deleted", {
            description: `${data.deletedTeamsCount} team profile(s) were also deleted.`,
          })
        } else {
          adminToast.success("User deleted")
        }
      } else {
        const errorMessage = data.error || "Failed to delete user"
        console.error("Delete user error:", errorMessage)
        adminToast.error("Failed to delete user", {
          description: `${errorMessage}. Check RLS policies, foreign key references, and admin permissions.`,
        })
      }
    } catch (error: unknown) {
      console.error("Error deleting user:", error)
      adminToast.error("Failed to delete user", {
        description: getErrorMessage(error),
      })
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
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Users</CardTitle>
                <CardDescription>
                  A list of all users in the system
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by Name or Email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-10 w-64"
                />
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Show</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    setPageSize(Number(v))
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground whitespace-nowrap">per page</span>
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
            <>
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
                  {paginatedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.email_verified && (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const status = getUserStatus(user)
                          const statusLetter = status.charAt(0)
                          let badgeColor = ""
                          
                          switch (status) {
                            case "Active":
                              badgeColor = "bg-blue-500 hover:bg-blue-600"
                              break
                            case "Test User":
                              badgeColor = "bg-orange-500 hover:bg-orange-600"
                              break
                            case "Pending Invitation":
                              badgeColor = "bg-purple-500 hover:bg-purple-600"
                              break
                            default:
                              badgeColor = "bg-gray-500 hover:bg-gray-600"
                          }
                          
                          return (
                            <Badge className={`${badgeColor} text-white`}>
                              {statusLetter}
                            </Badge>
                          )
                        })()}
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
                          {user.role === "coach" && user.has_team_profile && (
                            <LinkIcon className="h-4 w-4 text-primary" />
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
                                      adminToast.success("Invitation resent")
                                      fetchUsers()
                                    } else {
                                      const data = await response.json()
                                      adminToast.error("Failed to resend invitation", {
                                        description: getErrorMessage(data.error),
                                      })
                                    }
                                  } catch (error) {
                                    adminToast.error("Failed to resend invitation", {
                                      description: getErrorMessage(error),
                                    })
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
            <div className="flex items-center justify-between gap-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            </>
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

