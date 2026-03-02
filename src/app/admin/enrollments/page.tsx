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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Search, MoreVertical, Eye, Loader2, Calendar, DollarSign, Users, ShoppingCart, Clock, Edit, Save, X } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface Enrollment {
  id: string
  user_id: string
  instance_id: string
  status: 'cart' | 'reserved' | 'enrolled' | 'waitlisted' | 'cancelled' | 'expired' | 'completed'
  payment_status: 'unpaid' | 'pending' | 'paid' | 'refunded' | 'failed'
  amount_paid?: number
  currency: string
  enrolled_at?: string
  waitlist_position?: number
  created_at: string
  user?: {
    id: string
    name: string
    email: string
  }
  instance?: {
    id: string
    start_date: string
    end_date: string
    start_time?: string
    end_time?: string
    assignment?: {
      course?: {
        id: string
        name: string
      }
      category?: {
        display_name?: string
        name: string
      }
      series?: {
        display_name?: string
        name: string
      }
      location?: {
        name: string
      }
    }
    location?: {
      name: string
    }
  }
}

interface EnrollmentStats {
  total: number
  by_status: {
    enrolled: number
    reserved: number
    cart: number
    waitlisted: number
    cancelled: number
    expired: number
    completed: number
  }
  by_payment_status: {
    paid: number
    pending: number
    unpaid: number
    refunded: number
    failed: number
  }
  revenue: {
    total: number
    this_month: number
  }
}

export default function EnrollmentsManagementPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [filteredEnrollments, setFilteredEnrollments] = useState<Enrollment[]>([])
  const [stats, setStats] = useState<EnrollmentStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [enrollmentHistory, setEnrollmentHistory] = useState<any[]>([])
  const [isEditingStatus, setIsEditingStatus] = useState(false)
  const [editStatus, setEditStatus] = useState<string>("")
  const [editPaymentStatus, setEditPaymentStatus] = useState<string>("")
  const [editReason, setEditReason] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)
  
  // 筛选状态
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [franchiseFilter, setFranchiseFilter] = useState<string>("all")

  const fetchEnrollments = useCallback(async () => {
    setListLoading(true)
    setListError(null)
    try {
      const params = new URLSearchParams()
      params.set("limit", "100")
      if (franchiseFilter !== "all") {
        params.set("franchise", franchiseFilter)
      }
      const query = params.toString()
      const response = await fetch(`/api/admin/enrollments?${query}`)
      if (!response.ok) throw new Error("Failed to fetch enrollments")
      const data = await response.json()
      setEnrollments(data.enrollments || [])
    } catch (error) {
      console.error("Error fetching enrollments:", error)
      setListError(error instanceof Error ? error.message : "Failed to load enrollments")
    } finally {
      setListLoading(false)
    }
  }, [franchiseFilter])

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    setStatsError(null)
    try {
      const params = new URLSearchParams()
      if (franchiseFilter !== "all") {
        params.set("franchise", franchiseFilter)
      }
      const query = params.toString()
      const response = await fetch(`/api/admin/enrollments/stats${query ? `?${query}` : ""}`)
      if (!response.ok) throw new Error("Failed to fetch stats")
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error("Error fetching stats:", error)
      setStatsError(error instanceof Error ? error.message : "Failed to load stats")
    } finally {
      setStatsLoading(false)
    }
  }, [franchiseFilter])

  useEffect(() => {
    fetchEnrollments()
  }, [fetchEnrollments])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    applyFilters()
  }, [enrollments, statusFilter, paymentStatusFilter, searchQuery])

  const applyFilters = () => {
    let filtered = [...enrollments]

    // 状态筛选
    if (statusFilter !== "all") {
      filtered = filtered.filter((e) => e.status === statusFilter)
    }

    // 支付状态筛选
    if (paymentStatusFilter !== "all") {
      filtered = filtered.filter((e) => e.payment_status === paymentStatusFilter)
    }

    // 搜索筛选
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((e) => {
        const userName = e.user?.name?.toLowerCase() || ""
        const userEmail = e.user?.email?.toLowerCase() || ""
        const courseName = e.instance?.assignment?.course?.name?.toLowerCase() || ""
        return userName.includes(query) || userEmail.includes(query) || courseName.includes(query)
      })
    }

    setFilteredEnrollments(filtered)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "enrolled":
        return "default"
      case "reserved":
        return "secondary"
      case "cart":
        return "outline"
      case "waitlisted":
        return "secondary"
      case "cancelled":
        return "destructive"
      case "expired":
        return "destructive"
      case "completed":
        return "secondary"
      default:
        return "outline"
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "default"
      case "pending":
        return "secondary"
      case "unpaid":
        return "outline"
      case "refunded":
        return "secondary"
      case "failed":
        return "destructive"
      default:
        return "outline"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatTime = (timeString?: string) => {
    if (!timeString) return ""
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const handleViewDetails = async (enrollment: Enrollment) => {
    setSelectedEnrollment(enrollment)
    setIsDetailDialogOpen(true)
    setIsEditingStatus(false)
    setEditStatus(enrollment.status)
    setEditPaymentStatus(enrollment.payment_status)
    setEditReason("")
    
    // 获取状态历史
    try {
      const response = await fetch(`/api/admin/enrollments/${enrollment.id}`)
      if (response.ok) {
        const data = await response.json()
        setEnrollmentHistory(data.history || [])
      }
    } catch (error) {
      console.error("Error fetching enrollment history:", error)
    }
  }

  const handleSaveStatus = async () => {
    if (!selectedEnrollment) return

    if (!editReason.trim()) {
      alert("Please provide a reason for the status change")
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/admin/enrollments/${selectedEnrollment.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: editStatus,
          payment_status: editPaymentStatus,
          reason: editReason,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSelectedEnrollment(data.enrollment)
        setIsEditingStatus(false)
        setEditReason("")
        // 刷新列表和统计
        fetchEnrollments()
        fetchStats()
        // 重新获取详情和历史
        await handleViewDetails(data.enrollment)
      } else {
        const error = await response.json()
        alert(error.error || "Failed to update enrollment")
      }
    } catch (error) {
      console.error("Error updating enrollment:", error)
      alert("Failed to update enrollment")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Enrollments Management</h1>
        <p className="text-muted-foreground mt-2">
          View and manage all course enrollments across all statuses
        </p>
      </div>

      {/* 统计卡片 - lazy loaded */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statsLoading && (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Loading...</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
        {statsError && !statsLoading && (
          <Card className="md:col-span-4">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive mb-2">{statsError}</p>
              <Button variant="outline" size="sm" onClick={fetchStats}>Retry</Button>
            </CardContent>
          </Card>
        )}
        {!statsLoading && !statsError && stats && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active (Enrolled)</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.by_status.enrolled}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Payment</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.by_status.reserved}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${stats.revenue.total.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">This month: ${stats.revenue.this_month.toFixed(2)}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Enrollments</CardTitle>
              <CardDescription>
                A list of all enrollments in the system
              </CardDescription>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by user or course..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Select
                  value={franchiseFilter}
                  onValueChange={setFranchiseFilter}
                >
                  <SelectTrigger className="w-52">
                    <SelectValue placeholder="All franchises" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All franchises</SelectItem>
                    <SelectItem value="bellevue">Bellevue</SelectItem>
                    <SelectItem value="belred">Bel-Red</SelectItem>
                    <SelectItem value="issaquah">Issaquah</SelectItem>
                    <SelectItem value="cherrycrest">Cherry Crest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 筛选器 */}
          <div className="flex gap-4 mb-4 flex-wrap items-center">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="cart">Cart</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
                <SelectItem value="enrolled">Enrolled</SelectItem>
                <SelectItem value="waitlisted">Waitlisted</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payment Statuses</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => { fetchEnrollments(); fetchStats(); }}>
              Refresh
            </Button>
          </div>

          {listLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : listError ? (
            <div className="text-center py-12">
              <p className="text-destructive mb-2">{listError}</p>
              <Button variant="outline" onClick={fetchEnrollments}>Retry</Button>
            </div>
          ) : filteredEnrollments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No enrollments found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEnrollments.map((enrollment) => (
                    <TableRow key={enrollment.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{enrollment.user?.name || "N/A"}</div>
                          <div className="text-sm text-muted-foreground">
                            {enrollment.user?.email || "N/A"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {enrollment.instance?.assignment?.course?.name || "N/A"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {enrollment.instance?.assignment?.category?.display_name || 
                             enrollment.instance?.assignment?.category?.name || ""}
                            {enrollment.instance?.assignment?.series && " > "}
                            {enrollment.instance?.assignment?.series?.display_name || 
                             enrollment.instance?.assignment?.series?.name || ""}
                          </div>
                          {enrollment.instance?.start_date && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {formatDate(enrollment.instance.start_date)}
                              {enrollment.instance.start_time && ` ${formatTime(enrollment.instance.start_time)}`}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(enrollment.status)}>
                          {enrollment.status}
                        </Badge>
                        {enrollment.waitlist_position && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Position #{enrollment.waitlist_position}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPaymentStatusColor(enrollment.payment_status)}>
                          {enrollment.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {enrollment.amount_paid ? (
                          <div className="font-medium">
                            ${enrollment.amount_paid.toFixed(2)} {enrollment.currency}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{formatDate(enrollment.created_at)}</div>
                        {enrollment.enrolled_at && (
                          <div className="text-xs text-muted-foreground">
                            Enrolled: {formatDate(enrollment.enrolled_at)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(enrollment)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
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

      {/* 详情对话框 */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enrollment Details</DialogTitle>
            <DialogDescription>
              Complete information about this enrollment
            </DialogDescription>
          </DialogHeader>

          {selectedEnrollment && (
            <div className="space-y-6">
              <Tabs defaultValue="info" className="w-full">
                <TabsList>
                  <TabsTrigger value="info">Information</TabsTrigger>
                  <TabsTrigger value="history">Status History</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-4">
                  {/* 用户信息 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">User Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <span className="text-sm font-medium">Name:</span>{" "}
                        {selectedEnrollment.user?.name || "N/A"}
                      </div>
                      <div>
                        <span className="text-sm font-medium">Email:</span>{" "}
                        {selectedEnrollment.user?.email || "N/A"}
                      </div>
                    </CardContent>
                  </Card>

                  {/* 课程信息 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Course Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <span className="text-sm font-medium">Course:</span>{" "}
                        {selectedEnrollment.instance?.assignment?.course?.name || "N/A"}
                      </div>
                      <div>
                        <span className="text-sm font-medium">Category:</span>{" "}
                        {selectedEnrollment.instance?.assignment?.category?.display_name || 
                         selectedEnrollment.instance?.assignment?.category?.name || "N/A"}
                      </div>
                      <div>
                        <span className="text-sm font-medium">Series:</span>{" "}
                        {selectedEnrollment.instance?.assignment?.series?.display_name || 
                         selectedEnrollment.instance?.assignment?.series?.name || "N/A"}
                      </div>
                      {selectedEnrollment.instance?.start_date && (
                        <div>
                          <span className="text-sm font-medium">Start Date:</span>{" "}
                          {formatDate(selectedEnrollment.instance.start_date)}
                        </div>
                      )}
                      {selectedEnrollment.instance?.start_time && (
                        <div>
                          <span className="text-sm font-medium">Time:</span>{" "}
                          {formatTime(selectedEnrollment.instance.start_time)} - {formatTime(selectedEnrollment.instance.end_time)}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* 注册状态 */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Enrollment Status</CardTitle>
                        {!isEditingStatus && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditingStatus(true)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Status
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {isEditingStatus ? (
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="status">Status</Label>
                            <Select value={editStatus} onValueChange={setEditStatus}>
                              <SelectTrigger id="status">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cart">Cart</SelectItem>
                                <SelectItem value="reserved">Reserved</SelectItem>
                                <SelectItem value="enrolled">Enrolled</SelectItem>
                                <SelectItem value="waitlisted">Waitlisted</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                                <SelectItem value="expired">Expired</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="payment_status">Payment Status</Label>
                            <Select value={editPaymentStatus} onValueChange={setEditPaymentStatus}>
                              <SelectTrigger id="payment_status">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unpaid">Unpaid</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="refunded">Refunded</SelectItem>
                                <SelectItem value="failed">Failed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="reason">Reason for Change *</Label>
                            <Textarea
                              id="reason"
                              value={editReason}
                              onChange={(e) => setEditReason(e.target.value)}
                              placeholder="Enter reason for status change..."
                              rows={3}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={handleSaveStatus}
                              disabled={isSaving || !editReason.trim()}
                            >
                              {isSaving ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Save className="mr-2 h-4 w-4" />
                                  Save Changes
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setIsEditingStatus(false)
                                setEditStatus(selectedEnrollment.status)
                                setEditPaymentStatus(selectedEnrollment.payment_status)
                                setEditReason("")
                              }}
                            >
                              <X className="mr-2 h-4 w-4" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm font-medium">Status:</span>{" "}
                            <Badge variant={getStatusColor(selectedEnrollment.status)}>
                              {selectedEnrollment.status}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-sm font-medium">Payment Status:</span>{" "}
                            <Badge variant={getPaymentStatusColor(selectedEnrollment.payment_status)}>
                              {selectedEnrollment.payment_status}
                            </Badge>
                          </div>
                          {selectedEnrollment.amount_paid && (
                            <div>
                              <span className="text-sm font-medium">Amount Paid:</span>{" "}
                              ${selectedEnrollment.amount_paid.toFixed(2)} {selectedEnrollment.currency}
                            </div>
                          )}
                          {selectedEnrollment.waitlist_position && (
                            <div>
                              <span className="text-sm font-medium">Waitlist Position:</span>{" "}
                              #{selectedEnrollment.waitlist_position}
                            </div>
                          )}
                          <div>
                            <span className="text-sm font-medium">Created:</span>{" "}
                            {formatDate(selectedEnrollment.created_at)}
                          </div>
                          {selectedEnrollment.enrolled_at && (
                            <div>
                              <span className="text-sm font-medium">Enrolled:</span>{" "}
                              {formatDate(selectedEnrollment.enrolled_at)}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="history">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Status History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {enrollmentHistory.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No status history available.
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {enrollmentHistory.map((historyItem, index) => (
                            <div key={historyItem.id || index} className="flex items-start gap-4 pb-4 border-b last:border-0">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {historyItem.from_status && (
                                    <>
                                      <Badge variant="outline">{historyItem.from_status}</Badge>
                                      <span className="text-muted-foreground">→</span>
                                    </>
                                  )}
                                  <Badge variant={getStatusColor(historyItem.to_status)}>
                                    {historyItem.to_status}
                                  </Badge>
                                </div>
                                {historyItem.change_reason && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {historyItem.change_reason}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatDate(historyItem.created_at)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

