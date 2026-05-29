'use client'

import { useState, useEffect, useCallback } from "react"
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
import { Search, MoreVertical, Edit, Trash2, Plus, Loader2, RefreshCcw } from "lucide-react"
import { LearningPathEditDialog } from "@/components/admin/LearningPathEditDialog"
import { LearningPathWithDetails } from "@/lib/db"
import { adminToast, adminConfirm, getErrorMessage } from "@/lib/admin-toast"

type LearningPath = LearningPathWithDetails

export default function LearningPathsManagementPage() {
  const [paths, setPaths] = useState<LearningPath[]>([])
  const [filteredPaths, setFilteredPaths] = useState<LearningPath[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [editingPath, setEditingPath] = useState<LearningPath | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPaths = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch("/api/admin/learning-paths")
      
      if (!response.ok) {
        throw new Error("Failed to fetch learning paths")
      }

      const data = await response.json()
      setPaths(data.paths || [])
      setFilteredPaths(data.paths || [])
    } catch (err: any) {
      console.error("Error fetching learning paths:", err)
      setError(err.message || "Failed to load learning paths")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPaths()
  }, [fetchPaths])

  useEffect(() => {
    if (searchQuery) {
      const filtered = paths.filter(
        (path) =>
          path.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          path.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          path.slug?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredPaths(filtered)
    } else {
      setFilteredPaths(paths)
    }
  }, [searchQuery, paths])

  const handleDelete = async (pathId: string) => {
    if (!(await adminConfirm({
      title: "Delete this learning path?",
      description: "This action cannot be undone.",
      confirmLabel: "Delete",
    }))) {
      return
    }

    try {
      const response = await fetch(`/api/admin/learning-paths/${pathId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchPaths()
        adminToast.success("Learning path deleted")
      } else {
        const data = await response.json()
        adminToast.error("Failed to delete learning path", {
          description: getErrorMessage(data.error),
        })
      }
    } catch (error) {
      console.error("Error deleting learning path:", error)
      adminToast.error("Failed to delete learning path", {
        description: getErrorMessage(error),
      })
    }
  }

  const handleEdit = (path: LearningPath) => {
    setEditingPath(path)
    setIsEditDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingPath(null)
    setIsEditDialogOpen(true)
  }

  const handlePathUpdated = useCallback(() => {
    fetchPaths()
    setIsEditDialogOpen(false)
    setEditingPath(null)
  }, [fetchPaths])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getDifficultyBadge = (level?: string) => {
    if (!level) return null
    const variants = {
      beginner: 'default',
      intermediate: 'secondary',
      advanced: 'destructive',
    } as const

    return (
      <Badge variant={variants[level as keyof typeof variants] || 'outline'}>
        {level.charAt(0).toUpperCase() + level.slice(1)}
      </Badge>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Learning Paths</h1>
        <p className="text-muted-foreground mt-2">
          Manage learning paths and course sequences
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Learning Paths</CardTitle>
              <CardDescription>
                A list of all learning paths in the system
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search paths..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add Path
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-12 space-y-4">
              <p className="text-destructive text-lg">{error}</p>
              <Button onClick={fetchPaths}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : filteredPaths.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? "No learning paths found matching your search." : "No learning paths found."}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Courses</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPaths.map((path) => (
                    <TableRow key={path.id}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{path.name}</span>
                          {path.slug && (
                            <span className="text-xs text-muted-foreground">
                              {path.slug}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {path.category?.display_name || path.category?.name || "N/A"}
                      </TableCell>
                      <TableCell>
                        {getDifficultyBadge(path.difficulty_level)}
                      </TableCell>
                      <TableCell>
                        {path.estimated_duration_weeks
                          ? `${path.estimated_duration_weeks} weeks`
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        {path.courses?.length || 0} courses
                      </TableCell>
                      <TableCell>
                        <Badge variant={path.is_active ? 'default' : 'secondary'}>
                          {path.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(path.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(path)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(path.id)}
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

      <LearningPathEditDialog
        path={editingPath}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onPathUpdated={handlePathUpdated}
      />
    </div>
  )
}

