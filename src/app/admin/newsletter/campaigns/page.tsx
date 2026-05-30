'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, Eye, X, CheckCircle2, Clock, Send, AlertCircle, Ban } from "lucide-react"
import { adminToast, adminConfirm, getErrorMessage } from "@/lib/admin-toast"
import {
  CampaignDeliveryBadge,
  NewsletterDeliveryPanel,
} from "@/components/admin/newsletter/NewsletterDeliveryPanel"

interface CampaignDelivery {
  mode: "broadcast" | "per_recipient"
  label: string
  resendBroadcastId: string | null
}

interface Campaign {
  id: string
  template_id: string
  subject: string
  scheduled_at: string | null
  sent_at: string | null
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled'
  total_recipients: number
  sent_count: number
  failed_count: number
  created_at: string
  resend_broadcast_id?: string | null
  newsletter_templates: {
    id: string
    name: string
    subject: string
  } | null
}

interface CampaignStats {
  total: number
  sent: number
  failed: number
  pending: number
  bounced: number
}

export default function NewsletterCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [campaignStats, setCampaignStats] = useState<CampaignStats | null>(null)
  const [campaignDelivery, setCampaignDelivery] = useState<CampaignDelivery | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const limit = 20

  useEffect(() => {
    fetchCampaigns()
  }, [page, statusFilter])

  const fetchCampaigns = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })

      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }

      const response = await fetch(`/api/admin/newsletter/campaigns?${params}`)

      if (!response.ok) {
        throw new Error("Failed to fetch campaigns")
      }

      const data = await response.json()
      setCampaigns(data.campaigns || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 0)
    } catch (error: any) {
      console.error("Error fetching campaigns:", error)
      adminToast.error("Failed to load campaigns")
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewDetails = async (campaign: Campaign) => {
    setSelectedCampaign(campaign)
    setIsDetailDialogOpen(true)
    setIsLoadingDetails(true)
    setCampaignDelivery(null)

    try {
      const response = await fetch(`/api/admin/newsletter/campaigns/${campaign.id}`)
      if (!response.ok) {
        throw new Error("Failed to fetch campaign details")
      }
      const data = await response.json()
      setCampaignStats(data.stats)
      setCampaignDelivery(data.delivery ?? null)
      if (data.campaign?.resend_broadcast_id) {
        setSelectedCampaign({
          ...campaign,
          resend_broadcast_id: data.campaign.resend_broadcast_id,
        })
      }
    } catch (error: any) {
      console.error("Error fetching campaign details:", error)
      adminToast.error("Failed to load campaign details")
    } finally {
      setIsLoadingDetails(false)
    }
  }

  const handleCancel = async (campaignId: string) => {
    if (!(await adminConfirm({
      title: "Cancel this scheduled campaign?",
      confirmLabel: "Cancel campaign",
    }))) {
      return
    }

    try {
      const response = await fetch(`/api/admin/newsletter/campaigns/${campaignId}`, {
        method: "POST",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to cancel campaign")
      }

      adminToast.success("Campaign cancelled successfully")
      fetchCampaigns()
    } catch (error: any) {
      console.error("Error cancelling campaign:", error)
      adminToast.error(error.message || "Failed to cancel campaign")
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'scheduled':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'sending':
        return <Send className="h-4 w-4 text-yellow-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'cancelled':
        return <Ban className="h-4 w-4 text-gray-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      sent: "default",
      scheduled: "secondary",
      sending: "secondary",
      failed: "destructive",
      cancelled: "outline",
      draft: "outline",
    }

    return (
      <Badge variant={variants[status] || "secondary"}>
        <span className="flex items-center gap-1">
          {getStatusIcon(status)}
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </Badge>
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const calculateSuccessRate = (campaign: Campaign) => {
    if (campaign.total_recipients === 0) return 0
    const successCount = campaign.sent_count
    return Math.round((successCount / campaign.total_recipients) * 100)
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Newsletter Campaigns</h1>
        <p className="text-muted-foreground mt-2">
          View and manage newsletter sending history
        </p>
      </div>

      <NewsletterDeliveryPanel variant="compact" />

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status Filter</label>
              <Select value={statusFilter} onValueChange={(value) => {
                setStatusFilter(value)
                setPage(1)
              }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="sending">Sending</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="ml-auto text-sm text-muted-foreground">
              Total: {total} campaigns
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <CardTitle>Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No campaigns found</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Delivery</TableHead>
                    <TableHead>Scheduled At</TableHead>
                    <TableHead>Sent At</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">
                        {campaign.newsletter_templates?.name || "N/A"}
                      </TableCell>
                      <TableCell>{campaign.subject}</TableCell>
                      <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                      <TableCell>
                        <CampaignDeliveryBadge
                          resendBroadcastId={campaign.resend_broadcast_id}
                        />
                      </TableCell>
                      <TableCell>{formatDate(campaign.scheduled_at)}</TableCell>
                      <TableCell>{formatDate(campaign.sent_at)}</TableCell>
                      <TableCell>
                        {campaign.total_recipients > 0 ? (
                          <span>
                            {campaign.sent_count} / {campaign.total_recipients}
                            {campaign.failed_count > 0 && (
                              <span className="text-red-500 ml-1">
                                ({campaign.failed_count} failed)
                              </span>
                            )}
                          </span>
                        ) : (
                          "0"
                        )}
                      </TableCell>
                      <TableCell>
                        {campaign.total_recipients > 0 ? (
                          <span className={calculateSuccessRate(campaign) >= 90 ? "text-green-600" : "text-yellow-600"}>
                            {calculateSuccessRate(campaign)}%
                          </span>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(campaign)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {campaign.status === "scheduled" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancel(campaign.id)}
                            >
                              <X className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaign Details Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Campaign Details</DialogTitle>
            <DialogDescription>
              Detailed information about this newsletter campaign
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : selectedCampaign && campaignStats ? (
            <div className="space-y-6">
              {/* Campaign Info */}
              <div className="space-y-2">
                <h3 className="font-semibold">Campaign Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Template:</span>
                    <p className="font-medium">
                      {selectedCampaign.newsletter_templates?.name || "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Subject:</span>
                    <p className="font-medium">{selectedCampaign.subject}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <div className="mt-1">{getStatusBadge(selectedCampaign.status)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Delivery:</span>
                    <div className="mt-1">
                      <CampaignDeliveryBadge
                        resendBroadcastId={
                          campaignDelivery?.resendBroadcastId ??
                          selectedCampaign.resend_broadcast_id
                        }
                      />
                    </div>
                  </div>
                  {(campaignDelivery?.resendBroadcastId ||
                    selectedCampaign.resend_broadcast_id) && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Resend broadcast ID:</span>
                      <p className="font-mono text-xs break-all">
                        {campaignDelivery?.resendBroadcastId ??
                          selectedCampaign.resend_broadcast_id}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Created:</span>
                    <p className="font-medium">{formatDate(selectedCampaign.created_at)}</p>
                  </div>
                  {selectedCampaign.scheduled_at && (
                    <div>
                      <span className="text-muted-foreground">Scheduled:</span>
                      <p className="font-medium">{formatDate(selectedCampaign.scheduled_at)}</p>
                    </div>
                  )}
                  {selectedCampaign.sent_at && (
                    <div>
                      <span className="text-muted-foreground">Sent:</span>
                      <p className="font-medium">{formatDate(selectedCampaign.sent_at)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Statistics */}
              <div className="space-y-2">
                <h3 className="font-semibold">Sending Statistics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{campaignStats.total}</div>
                    <div className="text-sm text-muted-foreground">Total Recipients</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{campaignStats.sent}</div>
                    <div className="text-sm text-muted-foreground">Sent</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{campaignStats.pending}</div>
                    <div className="text-sm text-muted-foreground">Pending</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{campaignStats.failed}</div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                  {campaignStats.bounced > 0 && (
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {campaignStats.bounced}
                      </div>
                      <div className="text-sm text-muted-foreground">Bounced (webhook)</div>
                    </div>
                  )}
                </div>
                {campaignStats.total > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span>Success Rate</span>
                      <span className="font-semibold">
                        {Math.round((campaignStats.sent / campaignStats.total) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{
                          width: `${(campaignStats.sent / campaignStats.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
