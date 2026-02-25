'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, MoreVertical, Edit, Trash2, Plus, Loader2, RefreshCcw, Code, X, ChevronDown } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface V2Franchise {
  id: string
  code: string
  name: string
  domain?: string
  logo_url?: string
  branding_config: Record<string, any>
  marketing_config: Record<string, any>
  contact_email?: string
  contact_phone?: string
  address?: string
  timezone: string
  locale: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function BlazeFranchisesManagementPage() {
  const [franchises, setFranchises] = useState<V2Franchise[]>([])
  const [filteredFranchises, setFilteredFranchises] = useState<V2Franchise[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [editingFranchise, setEditingFranchise] = useState<V2Franchise | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState<Omit<V2Franchise, 'id' | 'created_at' | 'updated_at'>>({
    code: "",
    name: "",
    domain: "",
    logo_url: "",
    branding_config: {},
    marketing_config: {},
    contact_email: "",
    contact_phone: "",
    address: "",
    timezone: "UTC",
    locale: "en",
    is_active: true,
  })

  // Branding config form data
  const [brandingConfig, setBrandingConfig] = useState({
    branding: {
      primaryColor: "",
      secondaryColor: "",
      accentColor: "",
      backgroundColor: "",
      textColor: "",
      logoUrl: "",
      faviconUrl: "",
      theme: "",
    },
    hero: {
      title: "",
      subtitle: "",
      description: "",
      backgroundImage: "",
      ctaText: "",
      ctaLink: "",
    },
    contact: {
      email: "",
      phone: "",
      address: {
        street: "",
        city: "",
        state: "",
        zip: "",
        country: "",
      },
      businessHours: {
        monday: "",
        tuesday: "",
        wednesday: "",
        thursday: "",
        friday: "",
        saturday: "",
        sunday: "",
      },
    },
    social: {
      facebook: "",
      instagram: "",
      twitter: "",
      youtube: "",
      linkedin: "",
    },
    highlights: {
      programs: "",
      schedule: "",
      focus: "",
      achievements: "",
    },
  })

  // Marketing config form data
  const [marketingConfig, setMarketingConfig] = useState({
    seo: {
      title: "",
      description: "",
      keywords: "",
      ogImage: "",
      ogTitle: "",
      ogDescription: "",
      twitterCard: "",
      canonicalUrl: "",
    },
    slogan: {
      main: "",
      subtitle: "",
      tagline: "",
    },
    descriptions: {
      homepage: {
        intro: "",
        mission: "",
        values: [] as string[],
      },
      about: {
        overview: "",
        history: "",
        team: "",
      },
      programs: {
        intro: "",
        benefits: [] as string[],
      },
    },
    promotions: {
      current: [] as Array<{
        id: string
        title: string
        description: string
        isActive: boolean
        startDate?: string
        endDate?: string
        discount?: {
          type: string
          value: number
          code: string
        }
        ctaText?: string
        ctaLink?: string
      }>,
      upcoming: [] as Array<{
        id: string
        title: string
        description: string
        isActive: boolean
        startDate?: string
      }>,
    },
    cta: {
      primary: {
        text: "",
        link: "",
        style: "primary",
      },
      secondary: {
        text: "",
        link: "",
        style: "outline",
      },
    },
  })

  const [showJsonEditor, setShowJsonEditor] = useState({
    branding: false,
    marketing: false,
  })

  useEffect(() => {
    fetchFranchises()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      const filtered = franchises.filter(
        (franchise) =>
          franchise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          franchise.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          franchise.domain?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          franchise.contact_email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredFranchises(filtered)
    } else {
      setFilteredFranchises(franchises)
    }
  }, [searchQuery, franchises])

  const fetchFranchises = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch("/api/admin/franchises/v2?includeInactive=true")

      if (!response.ok) {
        throw new Error("Failed to fetch franchises")
      }

      const data = await response.json()
      setFranchises(data)
      setFilteredFranchises(data)
    } catch (err: any) {
      console.error("Error fetching franchises:", err)
      setError(err.message || "Failed to load franchises")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (franchiseId: string) => {
    const franchise = franchises.find(f => f.id === franchiseId)
    if (!franchise) return

    if (!confirm(`Are you sure you want to delete "${franchise.name}"? This will fail if there are categories, campuses, or programs using it.`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/franchises/v2/${franchiseId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchFranchises()
      } else {
        const data = await response.json()
        alert(data.error || "Failed to delete franchise")
      }
    } catch (error) {
      console.error("Error deleting franchise:", error)
      alert("Failed to delete franchise")
    }
  }

  const handleEdit = (franchise: V2Franchise) => {
    setEditingFranchise(franchise)
    setFormData({
      code: franchise.code,
      name: franchise.name,
      domain: franchise.domain || "",
      logo_url: franchise.logo_url || "",
      branding_config: franchise.branding_config || {},
      marketing_config: franchise.marketing_config || {},
      contact_email: franchise.contact_email || "",
      contact_phone: franchise.contact_phone || "",
      address: franchise.address || "",
      timezone: franchise.timezone,
      locale: franchise.locale,
      is_active: franchise.is_active,
    })
    
    // Parse branding_config to form data
    const branding = franchise.branding_config || {}
    setBrandingConfig({
      branding: {
        primaryColor: branding.branding?.primaryColor || "",
        secondaryColor: branding.branding?.secondaryColor || "",
        accentColor: branding.branding?.accentColor || "",
        backgroundColor: branding.branding?.backgroundColor || "",
        textColor: branding.branding?.textColor || "",
        logoUrl: branding.branding?.logoUrl || "",
        faviconUrl: branding.branding?.faviconUrl || "",
        theme: branding.branding?.theme || "",
      },
      hero: {
        title: branding.hero?.title || "",
        subtitle: branding.hero?.subtitle || "",
        description: branding.hero?.description || "",
        backgroundImage: branding.hero?.backgroundImage || "",
        ctaText: branding.hero?.ctaText || "",
        ctaLink: branding.hero?.ctaLink || "",
      },
      contact: {
        email: branding.contact?.email || "",
        phone: branding.contact?.phone || "",
        address: {
          street: branding.contact?.address?.street || "",
          city: branding.contact?.address?.city || "",
          state: branding.contact?.address?.state || "",
          zip: branding.contact?.address?.zip || "",
          country: branding.contact?.address?.country || "",
        },
        businessHours: {
          monday: branding.contact?.businessHours?.monday || "",
          tuesday: branding.contact?.businessHours?.tuesday || "",
          wednesday: branding.contact?.businessHours?.wednesday || "",
          thursday: branding.contact?.businessHours?.thursday || "",
          friday: branding.contact?.businessHours?.friday || "",
          saturday: branding.contact?.businessHours?.saturday || "",
          sunday: branding.contact?.businessHours?.sunday || "",
        },
      },
      social: {
        facebook: branding.social?.facebook || "",
        instagram: branding.social?.instagram || "",
        twitter: branding.social?.twitter || "",
        youtube: branding.social?.youtube || "",
        linkedin: branding.social?.linkedin || "",
      },
      highlights: {
        programs: branding.highlights?.programs || "",
        schedule: branding.highlights?.schedule || "",
        focus: branding.highlights?.focus || "",
        achievements: branding.highlights?.achievements || "",
      },
    })

    // Parse marketing_config to form data
    const marketing = franchise.marketing_config || {}
    setMarketingConfig({
      seo: {
        title: marketing.seo?.title || "",
        description: marketing.seo?.description || "",
        keywords: marketing.seo?.keywords || "",
        ogImage: marketing.seo?.ogImage || "",
        ogTitle: marketing.seo?.ogTitle || "",
        ogDescription: marketing.seo?.ogDescription || "",
        twitterCard: marketing.seo?.twitterCard || "",
        canonicalUrl: marketing.seo?.canonicalUrl || "",
      },
      slogan: {
        main: marketing.slogan?.main || "",
        subtitle: marketing.slogan?.subtitle || "",
        tagline: marketing.slogan?.tagline || "",
      },
      descriptions: {
        homepage: {
          intro: marketing.descriptions?.homepage?.intro || "",
          mission: marketing.descriptions?.homepage?.mission || "",
          values: marketing.descriptions?.homepage?.values || [],
        },
        about: {
          overview: marketing.descriptions?.about?.overview || "",
          history: marketing.descriptions?.about?.history || "",
          team: marketing.descriptions?.about?.team || "",
        },
        programs: {
          intro: marketing.descriptions?.programs?.intro || "",
          benefits: marketing.descriptions?.programs?.benefits || [],
        },
      },
      promotions: {
        current: marketing.promotions?.current || [],
        upcoming: marketing.promotions?.upcoming || [],
      },
      cta: {
        primary: {
          text: marketing.cta?.primary?.text || "",
          link: marketing.cta?.primary?.link || "",
          style: marketing.cta?.primary?.style || "primary",
        },
        secondary: {
          text: marketing.cta?.secondary?.text || "",
          link: marketing.cta?.secondary?.link || "",
          style: marketing.cta?.secondary?.style || "outline",
        },
      },
    })

    setShowJsonEditor({ branding: false, marketing: false })
    setIsEditDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingFranchise(null)
    setFormData({
      code: "",
      name: "",
      domain: "",
      logo_url: "",
      branding_config: {},
      marketing_config: {},
      contact_email: "",
      contact_phone: "",
      address: "",
      timezone: "UTC",
      locale: "en",
      is_active: true,
    })
    
    // Reset branding config
    setBrandingConfig({
      branding: {
        primaryColor: "",
        secondaryColor: "",
        accentColor: "",
        backgroundColor: "",
        textColor: "",
        logoUrl: "",
        faviconUrl: "",
        theme: "",
      },
      hero: {
        title: "",
        subtitle: "",
        description: "",
        backgroundImage: "",
        ctaText: "",
        ctaLink: "",
      },
      contact: {
        email: "",
        phone: "",
        address: {
          street: "",
          city: "",
          state: "",
          zip: "",
          country: "",
        },
        businessHours: {
          monday: "",
          tuesday: "",
          wednesday: "",
          thursday: "",
          friday: "",
          saturday: "",
          sunday: "",
        },
      },
      social: {
        facebook: "",
        instagram: "",
        twitter: "",
        youtube: "",
        linkedin: "",
      },
      highlights: {
        programs: "",
        schedule: "",
        focus: "",
        achievements: "",
      },
    })

    // Reset marketing config
    setMarketingConfig({
      seo: {
        title: "",
        description: "",
        keywords: "",
        ogImage: "",
        ogTitle: "",
        ogDescription: "",
        twitterCard: "",
        canonicalUrl: "",
      },
      slogan: {
        main: "",
        subtitle: "",
        tagline: "",
      },
      descriptions: {
        homepage: {
          intro: "",
          mission: "",
          values: [],
        },
        about: {
          overview: "",
          history: "",
          team: "",
        },
        programs: {
          intro: "",
          benefits: [],
        },
      },
      promotions: {
        current: [],
        upcoming: [],
      },
      cta: {
        primary: {
          text: "",
          link: "",
          style: "primary",
        },
        secondary: {
          text: "",
          link: "",
          style: "outline",
        },
      },
    })

    setShowJsonEditor({ branding: false, marketing: false })
    setIsEditDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Convert form data to JSON config
      // Clean up empty values from branding config
      const cleanBrandingConfig: any = {}
      if (brandingConfig.branding.primaryColor || brandingConfig.branding.secondaryColor || brandingConfig.branding.accentColor) {
        cleanBrandingConfig.branding = {}
        if (brandingConfig.branding.primaryColor) cleanBrandingConfig.branding.primaryColor = brandingConfig.branding.primaryColor
        if (brandingConfig.branding.secondaryColor) cleanBrandingConfig.branding.secondaryColor = brandingConfig.branding.secondaryColor
        if (brandingConfig.branding.accentColor) cleanBrandingConfig.branding.accentColor = brandingConfig.branding.accentColor
        if (brandingConfig.branding.backgroundColor) cleanBrandingConfig.branding.backgroundColor = brandingConfig.branding.backgroundColor
        if (brandingConfig.branding.textColor) cleanBrandingConfig.branding.textColor = brandingConfig.branding.textColor
        if (brandingConfig.branding.logoUrl) cleanBrandingConfig.branding.logoUrl = brandingConfig.branding.logoUrl
        if (brandingConfig.branding.faviconUrl) cleanBrandingConfig.branding.faviconUrl = brandingConfig.branding.faviconUrl
        if (brandingConfig.branding.theme) cleanBrandingConfig.branding.theme = brandingConfig.branding.theme
      }
      
      if (brandingConfig.hero.title || brandingConfig.hero.subtitle || brandingConfig.hero.description) {
        cleanBrandingConfig.hero = {}
        if (brandingConfig.hero.title) cleanBrandingConfig.hero.title = brandingConfig.hero.title
        if (brandingConfig.hero.subtitle) cleanBrandingConfig.hero.subtitle = brandingConfig.hero.subtitle
        if (brandingConfig.hero.description) cleanBrandingConfig.hero.description = brandingConfig.hero.description
        if (brandingConfig.hero.backgroundImage) cleanBrandingConfig.hero.backgroundImage = brandingConfig.hero.backgroundImage
        if (brandingConfig.hero.ctaText) cleanBrandingConfig.hero.ctaText = brandingConfig.hero.ctaText
        if (brandingConfig.hero.ctaLink) cleanBrandingConfig.hero.ctaLink = brandingConfig.hero.ctaLink
      }

      if (brandingConfig.contact.email || brandingConfig.contact.phone || 
          Object.values(brandingConfig.contact.address).some(v => v) ||
          Object.values(brandingConfig.contact.businessHours).some(v => v)) {
        cleanBrandingConfig.contact = {}
        if (brandingConfig.contact.email) cleanBrandingConfig.contact.email = brandingConfig.contact.email
        if (brandingConfig.contact.phone) cleanBrandingConfig.contact.phone = brandingConfig.contact.phone
        if (Object.values(brandingConfig.contact.address).some(v => v)) {
          cleanBrandingConfig.contact.address = brandingConfig.contact.address
        }
        if (Object.values(brandingConfig.contact.businessHours).some(v => v)) {
          cleanBrandingConfig.contact.businessHours = brandingConfig.contact.businessHours
        }
      }

      if (Object.values(brandingConfig.social).some(v => v)) {
        cleanBrandingConfig.social = brandingConfig.social
      }

      if (Object.values(brandingConfig.highlights).some(v => v)) {
        cleanBrandingConfig.highlights = brandingConfig.highlights
      }

      // Clean up empty values from marketing config
      const cleanMarketingConfig: any = {}
      if (marketingConfig.seo.title || marketingConfig.seo.description || marketingConfig.seo.keywords) {
        cleanMarketingConfig.seo = {}
        if (marketingConfig.seo.title) cleanMarketingConfig.seo.title = marketingConfig.seo.title
        if (marketingConfig.seo.description) cleanMarketingConfig.seo.description = marketingConfig.seo.description
        if (marketingConfig.seo.keywords) cleanMarketingConfig.seo.keywords = marketingConfig.seo.keywords
        if (marketingConfig.seo.ogImage) cleanMarketingConfig.seo.ogImage = marketingConfig.seo.ogImage
        if (marketingConfig.seo.ogTitle) cleanMarketingConfig.seo.ogTitle = marketingConfig.seo.ogTitle
        if (marketingConfig.seo.ogDescription) cleanMarketingConfig.seo.ogDescription = marketingConfig.seo.ogDescription
        if (marketingConfig.seo.twitterCard) cleanMarketingConfig.seo.twitterCard = marketingConfig.seo.twitterCard
        if (marketingConfig.seo.canonicalUrl) cleanMarketingConfig.seo.canonicalUrl = marketingConfig.seo.canonicalUrl
      }

      if (marketingConfig.slogan.main || marketingConfig.slogan.subtitle || marketingConfig.slogan.tagline) {
        cleanMarketingConfig.slogan = {}
        if (marketingConfig.slogan.main) cleanMarketingConfig.slogan.main = marketingConfig.slogan.main
        if (marketingConfig.slogan.subtitle) cleanMarketingConfig.slogan.subtitle = marketingConfig.slogan.subtitle
        if (marketingConfig.slogan.tagline) cleanMarketingConfig.slogan.tagline = marketingConfig.slogan.tagline
      }

      if (marketingConfig.descriptions.homepage.intro || marketingConfig.descriptions.homepage.mission ||
          marketingConfig.descriptions.about.overview || marketingConfig.descriptions.programs.intro) {
        cleanMarketingConfig.descriptions = {}
        if (marketingConfig.descriptions.homepage.intro || marketingConfig.descriptions.homepage.mission || marketingConfig.descriptions.homepage.values.length > 0) {
          cleanMarketingConfig.descriptions.homepage = {}
          if (marketingConfig.descriptions.homepage.intro) cleanMarketingConfig.descriptions.homepage.intro = marketingConfig.descriptions.homepage.intro
          if (marketingConfig.descriptions.homepage.mission) cleanMarketingConfig.descriptions.homepage.mission = marketingConfig.descriptions.homepage.mission
          if (marketingConfig.descriptions.homepage.values.length > 0) cleanMarketingConfig.descriptions.homepage.values = marketingConfig.descriptions.homepage.values
        }
        if (marketingConfig.descriptions.about.overview || marketingConfig.descriptions.about.history || marketingConfig.descriptions.about.team) {
          cleanMarketingConfig.descriptions.about = {}
          if (marketingConfig.descriptions.about.overview) cleanMarketingConfig.descriptions.about.overview = marketingConfig.descriptions.about.overview
          if (marketingConfig.descriptions.about.history) cleanMarketingConfig.descriptions.about.history = marketingConfig.descriptions.about.history
          if (marketingConfig.descriptions.about.team) cleanMarketingConfig.descriptions.about.team = marketingConfig.descriptions.about.team
        }
        if (marketingConfig.descriptions.programs.intro || marketingConfig.descriptions.programs.benefits.length > 0) {
          cleanMarketingConfig.descriptions.programs = {}
          if (marketingConfig.descriptions.programs.intro) cleanMarketingConfig.descriptions.programs.intro = marketingConfig.descriptions.programs.intro
          if (marketingConfig.descriptions.programs.benefits.length > 0) cleanMarketingConfig.descriptions.programs.benefits = marketingConfig.descriptions.programs.benefits
        }
      }

      if (marketingConfig.promotions.current.length > 0 || marketingConfig.promotions.upcoming.length > 0) {
        cleanMarketingConfig.promotions = {}
        if (marketingConfig.promotions.current.length > 0) cleanMarketingConfig.promotions.current = marketingConfig.promotions.current
        if (marketingConfig.promotions.upcoming.length > 0) cleanMarketingConfig.promotions.upcoming = marketingConfig.promotions.upcoming
      }

      if (marketingConfig.cta.primary.text || marketingConfig.cta.secondary.text) {
        cleanMarketingConfig.cta = {}
        if (marketingConfig.cta.primary.text || marketingConfig.cta.primary.link) {
          cleanMarketingConfig.cta.primary = marketingConfig.cta.primary
        }
        if (marketingConfig.cta.secondary.text || marketingConfig.cta.secondary.link) {
          cleanMarketingConfig.cta.secondary = marketingConfig.cta.secondary
        }
      }

      const submitData = {
        ...formData,
        branding_config: cleanBrandingConfig,
        marketing_config: cleanMarketingConfig,
        domain: formData.domain || undefined,
        logo_url: formData.logo_url || undefined,
        contact_email: formData.contact_email || undefined,
        contact_phone: formData.contact_phone || undefined,
        address: formData.address || undefined,
      }

      const url = editingFranchise
        ? `/api/admin/franchises/v2/${editingFranchise.id}`
        : "/api/admin/franchises/v2"
      const method = editingFranchise ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      })

      if (response.ok) {
        fetchFranchises()
        setIsEditDialogOpen(false)
        setEditingFranchise(null)
      } else {
        const error = await response.json()
        alert(error.error || "Failed to save franchise")
      }
    } catch (error) {
      console.error("Error saving franchise:", error)
      alert("Failed to save franchise")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">V2 Franchises Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage franchises (multi-tenant entities) using the V2 database schema
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Franchises</CardTitle>
              <CardDescription>
                A list of all franchises in the V2 system
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search franchises..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add Franchise
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
              <Button onClick={fetchFranchises}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : filteredFranchises.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? "No franchises found matching your search." : "No franchises found."}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Contact Email</TableHead>
                    <TableHead>Timezone</TableHead>
                    <TableHead>Locale</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFranchises.map((franchise) => (
                    <TableRow key={franchise.id}>
                      <TableCell className="font-mono text-sm">{franchise.code}</TableCell>
                      <TableCell className="font-medium">{franchise.name}</TableCell>
                      <TableCell>{franchise.domain || "N/A"}</TableCell>
                      <TableCell>{franchise.contact_email || "N/A"}</TableCell>
                      <TableCell>{franchise.timezone}</TableCell>
                      <TableCell>{franchise.locale}</TableCell>
                      <TableCell>
                        <Badge variant={franchise.is_active ? "default" : "secondary"}>
                          {franchise.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(franchise.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(franchise)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(franchise.id)}
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

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[800px] lg:max-w-[900px] max-h-[95vh] h-[95vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{editingFranchise ? "Edit Franchise" : "Add New Franchise"}</DialogTitle>
            <DialogDescription>
              {editingFranchise ? "Update franchise information" : "Create a new franchise"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto pr-1">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="branding">Branding Config</TabsTrigger>
                  <TabsTrigger value="marketing">Marketing Config</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Code *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                      placeholder="e.g., san_jose, new_york"
                      required
                      disabled={!!editingFranchise}
                    />
                    <p className="text-xs text-muted-foreground">
                      Lowercase letters, numbers, and underscores only. Cannot be changed after creation.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., San Jose, New York"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="domain">Domain</Label>
                    <Input
                      id="domain"
                      value={formData.domain}
                      onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                      placeholder="e.g., sanjose.blazerobotics.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      Domain for multi-tenant routing (optional, must be unique)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logo_url">Logo URL</Label>
                    <Input
                      id="logo_url"
                      value={formData.logo_url}
                      onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                      placeholder="https://example.com/logo.png"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact_email">Contact Email</Label>
                      <Input
                        id="contact_email"
                        type="email"
                        value={formData.contact_email}
                        onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                        placeholder="contact@example.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contact_phone">Contact Phone</Label>
                      <Input
                        id="contact_phone"
                        value={formData.contact_phone}
                        onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Street address"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone *</Label>
                      <Input
                        id="timezone"
                        value={formData.timezone}
                        onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                        placeholder="UTC"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="locale">Locale *</Label>
                      <Input
                        id="locale"
                        value={formData.locale}
                        onChange={(e) => setFormData({ ...formData, locale: e.target.value })}
                        placeholder="en"
                        required
                      />
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked === true })}
                      />
                      <Label htmlFor="is_active" className="cursor-pointer">
                        Active
                      </Label>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="branding" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-base font-semibold">Branding Configuration</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowJsonEditor({ ...showJsonEditor, branding: !showJsonEditor.branding })}
                    >
                      <Code className="h-4 w-4 mr-2" />
                      {showJsonEditor.branding ? "Hide" : "Show"} JSON Editor
                    </Button>
                  </div>

                  {showJsonEditor.branding ? (
                    <div className="space-y-2">
                      <Label htmlFor="branding_config_json">Branding Config (JSON)</Label>
                      <Textarea
                        id="branding_config_json"
                        value={JSON.stringify(brandingConfig, null, 2)}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value)
                            setBrandingConfig(parsed)
                          } catch (err) {
                            // Invalid JSON, ignore
                          }
                        }}
                        rows={20}
                        className="font-mono text-sm"
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Accordion type="multiple" className="w-full">
                        {/* Branding Colors & Theme */}
                        <AccordionItem value="branding-colors">
                          <AccordionTrigger>Branding Colors & Theme</AccordionTrigger>
                          <AccordionContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="primaryColor">Primary Color</Label>
                                <div className="flex gap-2">
                                  <Input
                                    id="primaryColor"
                                    type="color"
                                    value={brandingConfig.branding.primaryColor || "#2563EB"}
                                    onChange={(e) => setBrandingConfig({
                                      ...brandingConfig,
                                      branding: { ...brandingConfig.branding, primaryColor: e.target.value }
                                    })}
                                    className="w-16 h-10"
                                  />
                                  <Input
                                    value={brandingConfig.branding.primaryColor || ""}
                                    onChange={(e) => setBrandingConfig({
                                      ...brandingConfig,
                                      branding: { ...brandingConfig.branding, primaryColor: e.target.value }
                                    })}
                                    placeholder="#2563EB"
                                    className="flex-1"
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="secondaryColor">Secondary Color</Label>
                                <div className="flex gap-2">
                                  <Input
                                    id="secondaryColor"
                                    type="color"
                                    value={brandingConfig.branding.secondaryColor || "#1E40AF"}
                                    onChange={(e) => setBrandingConfig({
                                      ...brandingConfig,
                                      branding: { ...brandingConfig.branding, secondaryColor: e.target.value }
                                    })}
                                    className="w-16 h-10"
                                  />
                                  <Input
                                    value={brandingConfig.branding.secondaryColor || ""}
                                    onChange={(e) => setBrandingConfig({
                                      ...brandingConfig,
                                      branding: { ...brandingConfig.branding, secondaryColor: e.target.value }
                                    })}
                                    placeholder="#1E40AF"
                                    className="flex-1"
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="accentColor">Accent Color</Label>
                                <div className="flex gap-2">
                                  <Input
                                    id="accentColor"
                                    type="color"
                                    value={brandingConfig.branding.accentColor || "#3B82F6"}
                                    onChange={(e) => setBrandingConfig({
                                      ...brandingConfig,
                                      branding: { ...brandingConfig.branding, accentColor: e.target.value }
                                    })}
                                    className="w-16 h-10"
                                  />
                                  <Input
                                    value={brandingConfig.branding.accentColor || ""}
                                    onChange={(e) => setBrandingConfig({
                                      ...brandingConfig,
                                      branding: { ...brandingConfig.branding, accentColor: e.target.value }
                                    })}
                                    placeholder="#3B82F6"
                                    className="flex-1"
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="backgroundColor">Background Color</Label>
                                <div className="flex gap-2">
                                  <Input
                                    id="backgroundColor"
                                    type="color"
                                    value={brandingConfig.branding.backgroundColor || "#FFFFFF"}
                                    onChange={(e) => setBrandingConfig({
                                      ...brandingConfig,
                                      branding: { ...brandingConfig.branding, backgroundColor: e.target.value }
                                    })}
                                    className="w-16 h-10"
                                  />
                                  <Input
                                    value={brandingConfig.branding.backgroundColor || ""}
                                    onChange={(e) => setBrandingConfig({
                                      ...brandingConfig,
                                      branding: { ...brandingConfig.branding, backgroundColor: e.target.value }
                                    })}
                                    placeholder="#FFFFFF"
                                    className="flex-1"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="logoUrl">Logo URL</Label>
                                <Input
                                  id="logoUrl"
                                  value={brandingConfig.branding.logoUrl || ""}
                                  onChange={(e) => setBrandingConfig({
                                    ...brandingConfig,
                                    branding: { ...brandingConfig.branding, logoUrl: e.target.value }
                                  })}
                                  placeholder="https://example.com/logo.png"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="faviconUrl">Favicon URL</Label>
                                <Input
                                  id="faviconUrl"
                                  value={brandingConfig.branding.faviconUrl || ""}
                                  onChange={(e) => setBrandingConfig({
                                    ...brandingConfig,
                                    branding: { ...brandingConfig.branding, faviconUrl: e.target.value }
                                  })}
                                  placeholder="https://example.com/favicon.ico"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="theme">Theme</Label>
                              <Input
                                id="theme"
                                value={brandingConfig.branding.theme || ""}
                                onChange={(e) => setBrandingConfig({
                                  ...brandingConfig,
                                  branding: { ...brandingConfig.branding, theme: e.target.value }
                                })}
                                placeholder="e.g., modern, classic"
                              />
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        {/* Hero Section */}
                        <AccordionItem value="hero">
                          <AccordionTrigger>Hero Section</AccordionTrigger>
                          <AccordionContent className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="heroTitle">Title</Label>
                              <Input
                                id="heroTitle"
                                value={brandingConfig.hero.title || ""}
                                onChange={(e) => setBrandingConfig({
                                  ...brandingConfig,
                                  hero: { ...brandingConfig.hero, title: e.target.value }
                                })}
                                placeholder="Blaze Robotics Academy"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="heroSubtitle">Subtitle</Label>
                              <Input
                                id="heroSubtitle"
                                value={brandingConfig.hero.subtitle || ""}
                                onChange={(e) => setBrandingConfig({
                                  ...brandingConfig,
                                  hero: { ...brandingConfig.hero, subtitle: e.target.value }
                                })}
                                placeholder="Empowering the Next Generation"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="heroDescription">Description</Label>
                              <Textarea
                                id="heroDescription"
                                value={brandingConfig.hero.description || ""}
                                onChange={(e) => setBrandingConfig({
                                  ...brandingConfig,
                                  hero: { ...brandingConfig.hero, description: e.target.value }
                                })}
                                placeholder="Join us for hands-on robotics and coding programs."
                                rows={3}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="heroBackgroundImage">Background Image URL</Label>
                                <Input
                                  id="heroBackgroundImage"
                                  value={brandingConfig.hero.backgroundImage || ""}
                                  onChange={(e) => setBrandingConfig({
                                    ...brandingConfig,
                                    hero: { ...brandingConfig.hero, backgroundImage: e.target.value }
                                  })}
                                  placeholder="https://example.com/hero-bg.jpg"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="heroCtaText">CTA Text</Label>
                                <Input
                                  id="heroCtaText"
                                  value={brandingConfig.hero.ctaText || ""}
                                  onChange={(e) => setBrandingConfig({
                                    ...brandingConfig,
                                    hero: { ...brandingConfig.hero, ctaText: e.target.value }
                                  })}
                                  placeholder="Explore Programs"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="heroCtaLink">CTA Link</Label>
                              <Input
                                id="heroCtaLink"
                                value={brandingConfig.hero.ctaLink || ""}
                                onChange={(e) => setBrandingConfig({
                                  ...brandingConfig,
                                  hero: { ...brandingConfig.hero, ctaLink: e.target.value }
                                })}
                                placeholder="/programs"
                              />
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        {/* Contact Information */}
                        <AccordionItem value="contact">
                          <AccordionTrigger>Contact Information</AccordionTrigger>
                          <AccordionContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="contactEmail">Email</Label>
                                <Input
                                  id="contactEmail"
                                  type="email"
                                  value={brandingConfig.contact.email || ""}
                                  onChange={(e) => setBrandingConfig({
                                    ...brandingConfig,
                                    contact: { ...brandingConfig.contact, email: e.target.value }
                                  })}
                                  placeholder="contact@example.com"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="contactPhone">Phone</Label>
                                <Input
                                  id="contactPhone"
                                  value={brandingConfig.contact.phone || ""}
                                  onChange={(e) => setBrandingConfig({
                                    ...brandingConfig,
                                    contact: { ...brandingConfig.contact, phone: e.target.value }
                                  })}
                                  placeholder="+1 (555) 123-4567"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Address</Label>
                              <div className="grid grid-cols-2 gap-2">
                                <Input
                                  value={brandingConfig.contact.address.street || ""}
                                  onChange={(e) => setBrandingConfig({
                                    ...brandingConfig,
                                    contact: {
                                      ...brandingConfig.contact,
                                      address: { ...brandingConfig.contact.address, street: e.target.value }
                                    }
                                  })}
                                  placeholder="Street"
                                />
                                <Input
                                  value={brandingConfig.contact.address.city || ""}
                                  onChange={(e) => setBrandingConfig({
                                    ...brandingConfig,
                                    contact: {
                                      ...brandingConfig.contact,
                                      address: { ...brandingConfig.contact.address, city: e.target.value }
                                    }
                                  })}
                                  placeholder="City"
                                />
                                <Input
                                  value={brandingConfig.contact.address.state || ""}
                                  onChange={(e) => setBrandingConfig({
                                    ...brandingConfig,
                                    contact: {
                                      ...brandingConfig.contact,
                                      address: { ...brandingConfig.contact.address, state: e.target.value }
                                    }
                                  })}
                                  placeholder="State"
                                />
                                <Input
                                  value={brandingConfig.contact.address.zip || ""}
                                  onChange={(e) => setBrandingConfig({
                                    ...brandingConfig,
                                    contact: {
                                      ...brandingConfig.contact,
                                      address: { ...brandingConfig.contact.address, zip: e.target.value }
                                    }
                                  })}
                                  placeholder="ZIP Code"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Business Hours</Label>
                              <div className="grid grid-cols-2 gap-2">
                                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                                  <div key={day} className="space-y-1">
                                    <Label className="text-xs capitalize">{day}</Label>
                                    <Input
                                      value={brandingConfig.contact.businessHours[day as keyof typeof brandingConfig.contact.businessHours] || ""}
                                      onChange={(e) => setBrandingConfig({
                                        ...brandingConfig,
                                        contact: {
                                          ...brandingConfig.contact,
                                          businessHours: {
                                            ...brandingConfig.contact.businessHours,
                                            [day]: e.target.value
                                          }
                                        }
                                      })}
                                      placeholder={day === 'sunday' ? "Closed" : "9:00 AM - 6:00 PM"}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        {/* Social Media */}
                        <AccordionItem value="social">
                          <AccordionTrigger>Social Media</AccordionTrigger>
                          <AccordionContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              {['facebook', 'instagram', 'twitter', 'youtube', 'linkedin'].map((platform) => (
                                <div key={platform} className="space-y-2">
                                  <Label className="capitalize">{platform}</Label>
                                  <Input
                                    value={brandingConfig.social[platform as keyof typeof brandingConfig.social] || ""}
                                    onChange={(e) => setBrandingConfig({
                                      ...brandingConfig,
                                      social: {
                                        ...brandingConfig.social,
                                        [platform]: e.target.value
                                      }
                                    })}
                                    placeholder={`https://${platform}.com/...`}
                                  />
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        {/* Highlights */}
                        <AccordionItem value="highlights">
                          <AccordionTrigger>Highlights</AccordionTrigger>
                          <AccordionContent className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="highlightsPrograms">Programs</Label>
                              <Textarea
                                id="highlightsPrograms"
                                value={brandingConfig.highlights.programs || ""}
                                onChange={(e) => setBrandingConfig({
                                  ...brandingConfig,
                                  highlights: { ...brandingConfig.highlights, programs: e.target.value }
                                })}
                                placeholder="Age-appropriate robotics, coding, and STEM programs..."
                                rows={2}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="highlightsSchedule">Schedule</Label>
                              <Textarea
                                id="highlightsSchedule"
                                value={brandingConfig.highlights.schedule || ""}
                                onChange={(e) => setBrandingConfig({
                                  ...brandingConfig,
                                  highlights: { ...brandingConfig.highlights, schedule: e.target.value }
                                })}
                                placeholder="After-school and weekend offerings..."
                                rows={2}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="highlightsFocus">Focus</Label>
                              <Textarea
                                id="highlightsFocus"
                                value={brandingConfig.highlights.focus || ""}
                                onChange={(e) => setBrandingConfig({
                                  ...brandingConfig,
                                  highlights: { ...brandingConfig.highlights, focus: e.target.value }
                                })}
                                placeholder="Hands-on learning, teamwork..."
                                rows={2}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="highlightsAchievements">Achievements</Label>
                              <Textarea
                                id="highlightsAchievements"
                                value={brandingConfig.highlights.achievements || ""}
                                onChange={(e) => setBrandingConfig({
                                  ...brandingConfig,
                                  highlights: { ...brandingConfig.highlights, achievements: e.target.value }
                                })}
                                placeholder="Our students have won multiple competitions..."
                                rows={2}
                              />
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="marketing" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-base font-semibold">Marketing Configuration</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowJsonEditor({ ...showJsonEditor, marketing: !showJsonEditor.marketing })}
                    >
                      <Code className="h-4 w-4 mr-2" />
                      {showJsonEditor.marketing ? "Hide" : "Show"} JSON Editor
                    </Button>
                  </div>

                  {showJsonEditor.marketing ? (
                    <div className="space-y-2">
                      <Label htmlFor="marketing_config_json">Marketing Config (JSON)</Label>
                      <Textarea
                        id="marketing_config_json"
                        value={JSON.stringify(marketingConfig, null, 2)}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value)
                            setMarketingConfig(parsed)
                          } catch (err) {
                            // Invalid JSON, ignore
                          }
                        }}
                        rows={20}
                        className="font-mono text-sm"
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Accordion type="multiple" className="w-full">
                        {/* SEO */}
                        <AccordionItem value="seo">
                          <AccordionTrigger>SEO Settings</AccordionTrigger>
                          <AccordionContent className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="seoTitle">Title</Label>
                              <Input
                                id="seoTitle"
                                value={marketingConfig.seo.title || ""}
                                onChange={(e) => setMarketingConfig({
                                  ...marketingConfig,
                                  seo: { ...marketingConfig.seo, title: e.target.value }
                                })}
                                placeholder="Blaze Robotics Academy - San Jose | Robotics Programs"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="seoDescription">Description</Label>
                              <Textarea
                                id="seoDescription"
                                value={marketingConfig.seo.description || ""}
                                onChange={(e) => setMarketingConfig({
                                  ...marketingConfig,
                                  seo: { ...marketingConfig.seo, description: e.target.value }
                                })}
                                placeholder="Join Blaze Robotics Academy for hands-on robotics and coding programs."
                                rows={3}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="seoKeywords">Keywords</Label>
                              <Input
                                id="seoKeywords"
                                value={marketingConfig.seo.keywords || ""}
                                onChange={(e) => setMarketingConfig({
                                  ...marketingConfig,
                                  seo: { ...marketingConfig.seo, keywords: e.target.value }
                                })}
                                placeholder="robotics, coding, STEM, San Jose"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="seoOgImage">OG Image URL</Label>
                                <Input
                                  id="seoOgImage"
                                  value={marketingConfig.seo.ogImage || ""}
                                  onChange={(e) => setMarketingConfig({
                                    ...marketingConfig,
                                    seo: { ...marketingConfig.seo, ogImage: e.target.value }
                                  })}
                                  placeholder="https://example.com/og-image.jpg"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="seoCanonicalUrl">Canonical URL</Label>
                                <Input
                                  id="seoCanonicalUrl"
                                  value={marketingConfig.seo.canonicalUrl || ""}
                                  onChange={(e) => setMarketingConfig({
                                    ...marketingConfig,
                                    seo: { ...marketingConfig.seo, canonicalUrl: e.target.value }
                                  })}
                                  placeholder="https://sanjose.blazerobotics.com"
                                />
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        {/* Slogan */}
                        <AccordionItem value="slogan">
                          <AccordionTrigger>Slogan</AccordionTrigger>
                          <AccordionContent className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="sloganMain">Main Slogan</Label>
                              <Input
                                id="sloganMain"
                                value={marketingConfig.slogan.main || ""}
                                onChange={(e) => setMarketingConfig({
                                  ...marketingConfig,
                                  slogan: { ...marketingConfig.slogan, main: e.target.value }
                                })}
                                placeholder="Empowering the Next Generation of Innovators"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="sloganSubtitle">Subtitle</Label>
                              <Input
                                id="sloganSubtitle"
                                value={marketingConfig.slogan.subtitle || ""}
                                onChange={(e) => setMarketingConfig({
                                  ...marketingConfig,
                                  slogan: { ...marketingConfig.slogan, subtitle: e.target.value }
                                })}
                                placeholder="Hands-on Robotics & Coding Education"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="sloganTagline">Tagline</Label>
                              <Input
                                id="sloganTagline"
                                value={marketingConfig.slogan.tagline || ""}
                                onChange={(e) => setMarketingConfig({
                                  ...marketingConfig,
                                  slogan: { ...marketingConfig.slogan, tagline: e.target.value }
                                })}
                                placeholder="Building Tomorrow's Leaders, One Robot at a Time"
                              />
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        {/* Descriptions */}
                        <AccordionItem value="descriptions">
                          <AccordionTrigger>Page Descriptions</AccordionTrigger>
                          <AccordionContent className="space-y-4">
                            <div className="space-y-2">
                              <Label className="font-semibold">Homepage</Label>
                              <div className="space-y-2 pl-4 border-l-2">
                                <div className="space-y-2">
                                  <Label htmlFor="homepageIntro" className="text-sm">Introduction</Label>
                                  <Textarea
                                    id="homepageIntro"
                                    value={marketingConfig.descriptions.homepage.intro || ""}
                                    onChange={(e) => setMarketingConfig({
                                      ...marketingConfig,
                                      descriptions: {
                                        ...marketingConfig.descriptions,
                                        homepage: { ...marketingConfig.descriptions.homepage, intro: e.target.value }
                                      }
                                    })}
                                    placeholder="Welcome to Blaze Robotics Academy..."
                                    rows={3}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="homepageMission" className="text-sm">Mission</Label>
                                  <Textarea
                                    id="homepageMission"
                                    value={marketingConfig.descriptions.homepage.mission || ""}
                                    onChange={(e) => setMarketingConfig({
                                      ...marketingConfig,
                                      descriptions: {
                                        ...marketingConfig.descriptions,
                                        homepage: { ...marketingConfig.descriptions.homepage, mission: e.target.value }
                                      }
                                    })}
                                    placeholder="Our mission is to provide high-quality STEM education..."
                                    rows={2}
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="font-semibold">About Page</Label>
                              <div className="space-y-2 pl-4 border-l-2">
                                <div className="space-y-2">
                                  <Label htmlFor="aboutOverview" className="text-sm">Overview</Label>
                                  <Textarea
                                    id="aboutOverview"
                                    value={marketingConfig.descriptions.about.overview || ""}
                                    onChange={(e) => setMarketingConfig({
                                      ...marketingConfig,
                                      descriptions: {
                                        ...marketingConfig.descriptions,
                                        about: { ...marketingConfig.descriptions.about, overview: e.target.value }
                                      }
                                    })}
                                    placeholder="Blaze Robotics Academy has been serving..."
                                    rows={2}
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="font-semibold">Programs Page</Label>
                              <div className="space-y-2 pl-4 border-l-2">
                                <div className="space-y-2">
                                  <Label htmlFor="programsIntro" className="text-sm">Introduction</Label>
                                  <Textarea
                                    id="programsIntro"
                                    value={marketingConfig.descriptions.programs.intro || ""}
                                    onChange={(e) => setMarketingConfig({
                                      ...marketingConfig,
                                      descriptions: {
                                        ...marketingConfig.descriptions,
                                        programs: { ...marketingConfig.descriptions.programs, intro: e.target.value }
                                      }
                                    })}
                                    placeholder="Explore our wide range of robotics and coding programs..."
                                    rows={2}
                                  />
                                </div>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        {/* CTA */}
                        <AccordionItem value="cta">
                          <AccordionTrigger>Call-to-Action Buttons</AccordionTrigger>
                          <AccordionContent className="space-y-4">
                            <div className="space-y-2">
                              <Label className="font-semibold">Primary CTA</Label>
                              <div className="grid grid-cols-2 gap-4 pl-4 border-l-2">
                                <div className="space-y-2">
                                  <Label htmlFor="ctaPrimaryText" className="text-sm">Text</Label>
                                  <Input
                                    id="ctaPrimaryText"
                                    value={marketingConfig.cta.primary.text || ""}
                                    onChange={(e) => setMarketingConfig({
                                      ...marketingConfig,
                                      cta: {
                                        ...marketingConfig.cta,
                                        primary: { ...marketingConfig.cta.primary, text: e.target.value }
                                      }
                                    })}
                                    placeholder="Explore Programs"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="ctaPrimaryLink" className="text-sm">Link</Label>
                                  <Input
                                    id="ctaPrimaryLink"
                                    value={marketingConfig.cta.primary.link || ""}
                                    onChange={(e) => setMarketingConfig({
                                      ...marketingConfig,
                                      cta: {
                                        ...marketingConfig.cta,
                                        primary: { ...marketingConfig.cta.primary, link: e.target.value }
                                      }
                                    })}
                                    placeholder="/programs"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="font-semibold">Secondary CTA</Label>
                              <div className="grid grid-cols-2 gap-4 pl-4 border-l-2">
                                <div className="space-y-2">
                                  <Label htmlFor="ctaSecondaryText" className="text-sm">Text</Label>
                                  <Input
                                    id="ctaSecondaryText"
                                    value={marketingConfig.cta.secondary.text || ""}
                                    onChange={(e) => setMarketingConfig({
                                      ...marketingConfig,
                                      cta: {
                                        ...marketingConfig.cta,
                                        secondary: { ...marketingConfig.cta.secondary, text: e.target.value }
                                      }
                                    })}
                                    placeholder="Contact Us"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="ctaSecondaryLink" className="text-sm">Link</Label>
                                  <Input
                                    id="ctaSecondaryLink"
                                    value={marketingConfig.cta.secondary.link || ""}
                                    onChange={(e) => setMarketingConfig({
                                      ...marketingConfig,
                                      cta: {
                                        ...marketingConfig.cta,
                                        secondary: { ...marketingConfig.cta.secondary, link: e.target.value }
                                      }
                                    })}
                                    placeholder="/contact"
                                  />
                                </div>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  !formData.name ||
                  !formData.code
                }
                className="w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingFranchise ? (
                  "Update Franchise"
                ) : (
                  "Create Franchise"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
