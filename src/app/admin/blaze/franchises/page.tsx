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
import { Search, MoreVertical, Edit, Trash2, Plus, Loader2, RefreshCcw, Code, X, ChevronDown, ImageIcon } from "lucide-react"
import { PosterUploadField } from "@/components/ui/poster-upload-field"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { adminUiLabels } from "@/lib/admin-ui-labels"
import { adminToast, adminConfirm, getErrorMessage } from "@/lib/admin-toast"
import type { JsonRecord } from "@/types/json"

interface FranchiseBrandingColors {
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  backgroundColor?: string
  textColor?: string
  logoUrl?: string
  faviconUrl?: string
  theme?: string
}

interface FranchiseBrandingHero {
  title?: string
  subtitle?: string
  description?: string
  backgroundImage?: string
  ctaText?: string
  ctaLink?: string
}

interface FranchiseBusinessHours {
  monday?: string
  tuesday?: string
  wednesday?: string
  thursday?: string
  friday?: string
  saturday?: string
  sunday?: string
}

interface FranchiseBrandingContact {
  email?: string
  phone?: string
  address?: {
    street?: string
    city?: string
    state?: string
    zip?: string
    country?: string
  }
  businessHours?: FranchiseBusinessHours
}

interface FranchiseSocialLinks {
  facebook?: string
  instagram?: string
  twitter?: string
  youtube?: string
  linkedin?: string
}

interface FranchiseHighlights {
  programs?: string
  schedule?: string
  focus?: string
  achievements?: string
}

interface FranchiseBrandingConfig {
  branding?: FranchiseBrandingColors
  hero?: FranchiseBrandingHero
  contact?: FranchiseBrandingContact
  social?: FranchiseSocialLinks
  highlights?: FranchiseHighlights
  [key: string]: unknown
}

interface MarketingSeoConfig {
  title?: string
  description?: string
  keywords?: string
  ogImage?: string
  ogTitle?: string
  ogDescription?: string
  twitterCard?: string
  canonicalUrl?: string
}

interface MarketingHomepageDesc {
  intro?: string
  mission?: string
  values?: string[]
}

interface MarketingAboutDesc {
  overview?: string
  history?: string
  team?: string
}

interface MarketingProgramsDesc {
  intro?: string
  benefits?: string[]
}

interface MarketingDescriptions {
  homepage?: MarketingHomepageDesc
  about?: MarketingAboutDesc
  programs?: MarketingProgramsDesc
}

interface MarketingPromotion {
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
}

interface MarketingConfig {
  seo?: MarketingSeoConfig
  slogan?: { main?: string; subtitle?: string; tagline?: string }
  descriptions?: MarketingDescriptions
  promotions?: { current?: MarketingPromotion[]; upcoming?: MarketingPromotion[] }
  cta?: Record<string, { text?: string; link?: string; style?: string }>
  [key: string]: unknown
}

interface V2Franchise {
  id: string
  code: string
  name: string
  domain?: string
  logo_url?: string
  poster_url?: string | null
  branding_config: FranchiseBrandingConfig
  marketing_config: MarketingConfig
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
  const [posterFile, setPosterFile] = useState<File | null>(null)
  const [posterPreviewUrl, setPosterPreviewUrl] = useState<string | null>(null)

  const [formData, setFormData] = useState<Omit<V2Franchise, 'id' | 'created_at' | 'updated_at'>>({
    code: "",
    name: "",
    domain: "",
    logo_url: "",
    poster_url: "",
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
    } catch (err: unknown) {
      console.error("Error fetching franchises:", err)
      setError(getErrorMessage(err) || "Failed to load franchises")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (franchiseId: string) => {
    const franchise = franchises.find(f => f.id === franchiseId)
    if (!franchise) return

    if (!(await adminConfirm({
      title: `Delete "${franchise.name}"?`,
      description: "This will fail if there are programs, locations, or activities using it.",
      confirmLabel: "Delete",
    }))) {
      return
    }

    try {
      const response = await fetch(`/api/admin/franchises/v2/${franchiseId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchFranchises()
        adminToast.success("Franchise deleted")
      } else {
        const data = await response.json()
        adminToast.error("Failed to delete franchise", {
          description: getErrorMessage(data.error, "Failed to delete franchise"),
        })
      }
    } catch (error) {
      console.error("Error deleting franchise:", error)
      adminToast.error("Failed to delete franchise", {
        description: getErrorMessage(error),
      })
    }
  }

  const handlePosterFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl)
    if (file) {
      setPosterFile(file)
      setPosterPreviewUrl(URL.createObjectURL(file))
    } else {
      setPosterFile(null)
      setPosterPreviewUrl(null)
    }
  }

  const clearPosterFile = () => {
    if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl)
    setPosterFile(null)
    setPosterPreviewUrl(null)
    if (!editingFranchise) setFormData((prev) => ({ ...prev, poster_url: "" }))
  }

  const uploadPosterFile = async (): Promise<string | null> => {
    if (!posterFile) return null
    const uploadFormData = new FormData()
    uploadFormData.append("file", posterFile)
    const res = await fetch("/api/admin/franchises/v2/upload", {
      method: "POST",
      body: uploadFormData,
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || "Failed to upload poster")
    }
    const data = await res.json()
    return data.url ?? null
  }

  const handleEdit = (franchise: V2Franchise) => {
    if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl)
    setPosterFile(null)
    setPosterPreviewUrl(null)
    setEditingFranchise(franchise)
    setFormData({
      code: franchise.code,
      name: franchise.name,
      domain: franchise.domain || "",
      logo_url: franchise.logo_url || "",
      poster_url: franchise.poster_url ?? "",
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
    const branding: FranchiseBrandingConfig = franchise.branding_config || {}
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
    const marketing: MarketingConfig = franchise.marketing_config || {}
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
    if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl)
    setPosterFile(null)
    setPosterPreviewUrl(null)
    setFormData({
      code: "",
      name: "",
      domain: "",
      logo_url: "",
      poster_url: "",
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
      let posterUrl: string | undefined = formData.poster_url || undefined
      if (posterFile) {
        posterUrl = (await uploadPosterFile()) ?? undefined
      }

      // Convert form data to JSON config
      // Clean up empty values from branding config
      const cleanBrandingConfig: JsonRecord = {}
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
      const cleanMarketingConfig: JsonRecord = {}
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
        poster_url: posterUrl,
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
        clearPosterFile()
        adminToast.success(editingFranchise ? "Franchise updated" : "Franchise created")
      } else {
        const error = await response.json()
        adminToast.error("Failed to save franchise", {
          description: getErrorMessage(error.error, "Failed to save franchise"),
        })
      }
    } catch (error) {
      console.error("Error saving franchise:", error)
      adminToast.error("Failed to save franchise", {
        description: getErrorMessage(error),
      })
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
        <h1 className="text-3xl font-bold">V2 {adminUiLabels.franchise.plural} Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage campuses (multi-tenant branches) using the V2 database schema
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{adminUiLabels.franchise.plural}</CardTitle>
              <CardDescription>
                A list of all campuses in the V2 system
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Search ${adminUiLabels.franchise.plural.toLowerCase()}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add {adminUiLabels.franchise.singular}
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
              {searchQuery ? `No ${adminUiLabels.franchise.plural.toLowerCase()} found matching your search.` : `No ${adminUiLabels.franchise.plural.toLowerCase()} found.`}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[72px]">Poster</TableHead>
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
                      <TableCell className="w-[72px] p-2 align-middle">
                        <div className="w-14 h-14 rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800/50 flex-shrink-0">
                          {franchise.poster_url ? (
                            <img
                              src={franchise.poster_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 p-0.5">
                              <ImageIcon className="h-6 w-6" strokeWidth={1.5} />
                              <span className="text-[9px] leading-tight">No poster</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
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
            <DialogTitle>{editingFranchise ? `Edit ${adminUiLabels.franchise.singular}` : `Add New ${adminUiLabels.franchise.singular}`}</DialogTitle>
            <DialogDescription>
              {editingFranchise ? `Update ${adminUiLabels.franchise.singular.toLowerCase()} information` : `Create a new ${adminUiLabels.franchise.singular.toLowerCase()}`}
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

                <TabsContent value="basic" className="mt-4">
                  <div className="space-y-4">
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm font-medium">Identity</CardTitle>
                        <CardDescription className="text-xs">Code and name. Code cannot be changed after creation.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-0">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="code" className="text-xs">Code *</Label>
                            <Input
                              id="code"
                              value={formData.code}
                              onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                              placeholder="e.g. san_jose, new_york"
                              required
                              disabled={!!editingFranchise}
                              className="h-9 font-mono text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="name" className="text-xs">Name *</Label>
                            <Input
                              id="name"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              placeholder="e.g. San Jose, New York"
                              required
                              className="h-9 text-sm"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="domain" className="text-xs">Domain</Label>
                            <Input
                              id="domain"
                              value={formData.domain}
                              onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                              placeholder="sanjose.blazerobotics.com"
                              className="h-9 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="logo_url" className="text-xs">Logo URL</Label>
                            <Input
                              id="logo_url"
                              value={formData.logo_url}
                              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                              placeholder="https://example.com/logo.png"
                              className="h-9 text-sm"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm font-medium">Poster</CardTitle>
                        <CardDescription className="text-xs">{adminUiLabels.franchise.singular} poster image. JPEG, PNG or WebP, max 5MB. Uploaded when you save.</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <PosterUploadField
                          id="franchise_poster"
                          label="Poster image"
                          hint={`Optional. Upload happens when you save the ${adminUiLabels.franchise.singular.toLowerCase()}.`}
                          previewSrc={posterPreviewUrl || (editingFranchise && formData.poster_url && !posterFile ? (formData.poster_url as string) : null) || null}
                          onFileChange={handlePosterFileChange}
                          onClear={clearPosterFile}
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm font-medium">Contact &amp; location</CardTitle>
                        <CardDescription className="text-xs">Email, phone, address, timezone and locale.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-0">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="contact_email" className="text-xs">Contact Email</Label>
                            <Input
                              id="contact_email"
                              type="email"
                              value={formData.contact_email}
                              onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                              placeholder="contact@example.com"
                              className="h-9 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="contact_phone" className="text-xs">Contact Phone</Label>
                            <Input
                              id="contact_phone"
                              value={formData.contact_phone}
                              onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                              placeholder="+1 (555) 123-4567"
                              className="h-9 text-sm"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="address" className="text-xs">Address</Label>
                          <Textarea
                            id="address"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            placeholder="Street address"
                            rows={2}
                            className="resize-none text-sm min-h-[60px]"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="timezone" className="text-xs">Timezone *</Label>
                            <Input
                              id="timezone"
                              value={formData.timezone}
                              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                              placeholder="UTC"
                              required
                              className="h-9 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="locale" className="text-xs">Locale *</Label>
                            <Input
                              id="locale"
                              value={formData.locale}
                              onChange={(e) => setFormData({ ...formData, locale: e.target.value })}
                              placeholder="en"
                              required
                              className="h-9 text-sm"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <Checkbox
                            id="is_active"
                            checked={formData.is_active}
                            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked === true })}
                          />
                          <Label htmlFor="is_active" className="text-sm cursor-pointer">Active</Label>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="branding" className="mt-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-sm font-medium text-muted-foreground">Branding configuration</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setShowJsonEditor({ ...showJsonEditor, branding: !showJsonEditor.branding })}
                    >
                      <Code className="h-3.5 w-3.5 mr-1.5" />
                      {showJsonEditor.branding ? "Form" : "JSON"}
                    </Button>
                  </div>

                  {showJsonEditor.branding ? (
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
                      rows={18}
                      className="font-mono text-sm resize-y min-h-[280px]"
                    />
                  ) : (
                    <Accordion type="multiple" className="w-full space-y-1">
                        {/* Branding Colors & Theme */}
                        <AccordionItem value="branding-colors" className="border rounded-md px-3">
                          <AccordionTrigger className="py-2.5 text-sm hover:no-underline">Branding Colors & Theme</AccordionTrigger>
                          <AccordionContent className="space-y-2 pb-3 pt-0">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {[
                                { key: 'primaryColor', label: 'Primary', placeholder: '#2563EB', def: brandingConfig.branding.primaryColor || '#2563EB' },
                                { key: 'secondaryColor', label: 'Secondary', placeholder: '#1E40AF', def: brandingConfig.branding.secondaryColor || '#1E40AF' },
                                { key: 'accentColor', label: 'Accent', placeholder: '#3B82F6', def: brandingConfig.branding.accentColor || '#3B82F6' },
                                { key: 'backgroundColor', label: 'Background', placeholder: '#FFFFFF', def: brandingConfig.branding.backgroundColor || '#FFFFFF' },
                              ].map(({ key, label, placeholder, def }) => (
                                <div key={key} className="space-y-1">
                                  <Label htmlFor={key} className="text-xs">{label}</Label>
                                  <div className="flex gap-1.5">
                                    <input
                                      type="color"
                                      id={key}
                                      value={(brandingConfig.branding as Record<string, string>)[key] || def}
                                      onChange={(e) => setBrandingConfig({
                                        ...brandingConfig,
                                        branding: { ...brandingConfig.branding, [key]: e.target.value }
                                      })}
                                      className="w-9 h-8 rounded border border-input cursor-pointer p-0.5 bg-transparent"
                                    />
                                    <Input
                                      value={(brandingConfig.branding as Record<string, string>)[key] || ""}
                                      onChange={(e) => setBrandingConfig({
                                        ...brandingConfig,
                                        branding: { ...brandingConfig.branding, [key]: e.target.value }
                                      })}
                                      placeholder={placeholder}
                                      className="flex-1 h-8 text-xs font-mono"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label htmlFor="logoUrl" className="text-xs">Logo URL</Label>
                                <Input id="logoUrl" value={brandingConfig.branding.logoUrl || ""} onChange={(e) => setBrandingConfig({ ...brandingConfig, branding: { ...brandingConfig.branding, logoUrl: e.target.value } })} placeholder="https://example.com/logo.png" className="h-8 text-sm" />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="faviconUrl" className="text-xs">Favicon URL</Label>
                                <Input id="faviconUrl" value={brandingConfig.branding.faviconUrl || ""} onChange={(e) => setBrandingConfig({ ...brandingConfig, branding: { ...brandingConfig.branding, faviconUrl: e.target.value } })} placeholder="https://example.com/favicon.ico" className="h-8 text-sm" />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="theme" className="text-xs">Theme</Label>
                              <Input id="theme" value={brandingConfig.branding.theme || ""} onChange={(e) => setBrandingConfig({ ...brandingConfig, branding: { ...brandingConfig.branding, theme: e.target.value } })} placeholder="e.g. modern, classic" className="h-8 text-sm" />
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="hero" className="border rounded-md px-3">
                          <AccordionTrigger className="py-2.5 text-sm hover:no-underline">Hero Section</AccordionTrigger>
                          <AccordionContent className="space-y-2 pb-3 pt-0">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label htmlFor="heroTitle" className="text-xs">Title</Label>
                                <Input id="heroTitle" value={brandingConfig.hero.title || ""} onChange={(e) => setBrandingConfig({ ...brandingConfig, hero: { ...brandingConfig.hero, title: e.target.value } })} placeholder="Blaze Robotics Academy" className="h-8 text-sm" />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="heroSubtitle" className="text-xs">Subtitle</Label>
                                <Input id="heroSubtitle" value={brandingConfig.hero.subtitle || ""} onChange={(e) => setBrandingConfig({ ...brandingConfig, hero: { ...brandingConfig.hero, subtitle: e.target.value } })} placeholder="Empowering the Next Generation" className="h-8 text-sm" />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="heroDescription" className="text-xs">Description</Label>
                              <Textarea id="heroDescription" value={brandingConfig.hero.description || ""} onChange={(e) => setBrandingConfig({ ...brandingConfig, hero: { ...brandingConfig.hero, description: e.target.value } })} placeholder="Join us for hands-on robotics and coding programs." rows={2} className="text-sm resize-none min-h-[52px]" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <Label htmlFor="heroBackgroundImage" className="text-xs">Background Image URL</Label>
                                <Input id="heroBackgroundImage" value={brandingConfig.hero.backgroundImage || ""} onChange={(e) => setBrandingConfig({ ...brandingConfig, hero: { ...brandingConfig.hero, backgroundImage: e.target.value } })} placeholder="https://..." className="h-8 text-sm" />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="heroCtaText" className="text-xs">CTA Text</Label>
                                <Input id="heroCtaText" value={brandingConfig.hero.ctaText || ""} onChange={(e) => setBrandingConfig({ ...brandingConfig, hero: { ...brandingConfig.hero, ctaText: e.target.value } })} placeholder="Explore Programs" className="h-8 text-sm" />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="heroCtaLink" className="text-xs">CTA Link</Label>
                                <Input id="heroCtaLink" value={brandingConfig.hero.ctaLink || ""} onChange={(e) => setBrandingConfig({ ...brandingConfig, hero: { ...brandingConfig.hero, ctaLink: e.target.value } })} placeholder="/programs" className="h-8 text-sm" />
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="contact" className="border rounded-md px-3">
                          <AccordionTrigger className="py-2.5 text-sm hover:no-underline">Contact Information</AccordionTrigger>
                          <AccordionContent className="space-y-2 pb-3 pt-0">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label htmlFor="contactEmail" className="text-xs">Email</Label>
                                <Input id="contactEmail" type="email" value={brandingConfig.contact.email || ""} onChange={(e) => setBrandingConfig({ ...brandingConfig, contact: { ...brandingConfig.contact, email: e.target.value } })} placeholder="contact@example.com" className="h-8 text-sm" />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="contactPhone" className="text-xs">Phone</Label>
                                <Input id="contactPhone" value={brandingConfig.contact.phone || ""} onChange={(e) => setBrandingConfig({ ...brandingConfig, contact: { ...brandingConfig.contact, phone: e.target.value } })} placeholder="+1 (555) 123-4567" className="h-8 text-sm" />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Address</Label>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <Input value={brandingConfig.contact.address.street || ""} onChange={(e) => setBrandingConfig({ ...brandingConfig, contact: { ...brandingConfig.contact, address: { ...brandingConfig.contact.address, street: e.target.value } } })} placeholder="Street" className="h-8 text-sm" />
                                <Input value={brandingConfig.contact.address.city || ""} onChange={(e) => setBrandingConfig({ ...brandingConfig, contact: { ...brandingConfig.contact, address: { ...brandingConfig.contact.address, city: e.target.value } } })} placeholder="City" className="h-8 text-sm" />
                                <Input value={brandingConfig.contact.address.state || ""} onChange={(e) => setBrandingConfig({ ...brandingConfig, contact: { ...brandingConfig.contact, address: { ...brandingConfig.contact.address, state: e.target.value } } })} placeholder="State" className="h-8 text-sm" />
                                <Input value={brandingConfig.contact.address.zip || ""} onChange={(e) => setBrandingConfig({ ...brandingConfig, contact: { ...brandingConfig.contact, address: { ...brandingConfig.contact.address, zip: e.target.value } } })} placeholder="ZIP" className="h-8 text-sm" />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Business Hours</Label>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                                  <div key={day} className="space-y-0.5">
                                    <Label className="text-xs capitalize">{day}</Label>
                                    <Input value={brandingConfig.contact.businessHours[day as keyof typeof brandingConfig.contact.businessHours] || ""} onChange={(e) => setBrandingConfig({ ...brandingConfig, contact: { ...brandingConfig.contact, businessHours: { ...brandingConfig.contact.businessHours, [day]: e.target.value } } })} placeholder={day === 'sunday' ? "Closed" : "9–6"} className="h-8 text-sm" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="social" className="border rounded-md px-3">
                          <AccordionTrigger className="py-2.5 text-sm hover:no-underline">Social Media</AccordionTrigger>
                          <AccordionContent className="space-y-2 pb-3 pt-0">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {['facebook', 'instagram', 'twitter', 'youtube', 'linkedin'].map((platform) => (
                                <div key={platform} className="space-y-1">
                                  <Label className="text-xs capitalize">{platform}</Label>
                                  <Input value={brandingConfig.social[platform as keyof typeof brandingConfig.social] || ""} onChange={(e) => setBrandingConfig({ ...brandingConfig, social: { ...brandingConfig.social, [platform]: e.target.value } })} placeholder={`${platform}.com/...`} className="h-8 text-sm" />
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="highlights" className="border rounded-md px-3">
                          <AccordionTrigger className="py-2.5 text-sm hover:no-underline">Highlights</AccordionTrigger>
                          <AccordionContent className="space-y-2 pb-3 pt-0">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {(['programs', 'schedule', 'focus', 'achievements'] as const).map((field) => (
                                <div key={field} className="space-y-1">
                                  <Label className="text-xs capitalize">{field}</Label>
                                  <Textarea
                                    value={brandingConfig.highlights[field] || ""}
                                    onChange={(e) => setBrandingConfig({ ...brandingConfig, highlights: { ...brandingConfig.highlights, [field]: e.target.value } })}
                                    placeholder={field === 'programs' ? "Age-appropriate robotics, coding..." : field === 'achievements' ? "Our students have won..." : "..."}
                                    rows={2}
                                    className="text-sm resize-none min-h-[52px]"
                                  />
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                  )}
                </TabsContent>

                <TabsContent value="marketing" className="mt-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-sm font-medium text-muted-foreground">Marketing configuration</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setShowJsonEditor({ ...showJsonEditor, marketing: !showJsonEditor.marketing })}
                    >
                      <Code className="h-3.5 w-3.5 mr-1.5" />
                      {showJsonEditor.marketing ? "Form" : "JSON"}
                    </Button>
                  </div>

                  {showJsonEditor.marketing ? (
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
                      rows={18}
                      className="font-mono text-sm resize-y min-h-[280px]"
                    />
                  ) : (
                    <Accordion type="multiple" className="w-full space-y-1">
                        <AccordionItem value="seo" className="border rounded-md px-3">
                          <AccordionTrigger className="py-2.5 text-sm hover:no-underline">SEO Settings</AccordionTrigger>
                          <AccordionContent className="space-y-2 pb-3 pt-0">
                            <div className="space-y-1">
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
                        <AccordionItem value="slogan" className="border rounded-md px-3">
                          <AccordionTrigger className="py-2.5 text-sm hover:no-underline">Slogan</AccordionTrigger>
                          <AccordionContent className="space-y-2 pb-3 pt-0">
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
                        <AccordionItem value="descriptions" className="border rounded-md px-3">
                          <AccordionTrigger className="py-2.5 text-sm hover:no-underline">Page Descriptions</AccordionTrigger>
                          <AccordionContent className="space-y-2 pb-3 pt-0">
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

                        <AccordionItem value="cta" className="border rounded-md px-3">
                          <AccordionTrigger className="py-2.5 text-sm hover:no-underline">Call-to-Action Buttons</AccordionTrigger>
                          <AccordionContent className="space-y-2 pb-3 pt-0">
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
                  `Update ${adminUiLabels.franchise.singular}`
                ) : (
                  `Create ${adminUiLabels.franchise.singular}`
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
