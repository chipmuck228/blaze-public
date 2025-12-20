'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2 } from "lucide-react"
import type { FranchiseBrandingConfig } from "@/lib/db"

interface FranchiseContentEditDialogProps {
  franchiseId: string
  franchiseCode: string
  franchiseName: string
  brandingConfig: FranchiseBrandingConfig | null | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (config: FranchiseBrandingConfig) => Promise<void>
}

export function FranchiseContentEditDialog({
  franchiseId,
  franchiseCode,
  franchiseName,
  brandingConfig,
  open,
  onOpenChange,
  onSave,
}: FranchiseContentEditDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [config, setConfig] = useState<FranchiseBrandingConfig>({
    hero: {},
    contact: {},
    social: {},
    highlights: {},
    branding: {},
    seo: {},
  })

  useEffect(() => {
    if (brandingConfig) {
      setConfig(brandingConfig)
    } else {
      // 初始化默认值
      setConfig({
        hero: {
          title: franchiseName,
          description: `Local robotics, coding, and engineering programs for students in the ${franchiseName} area.`,
        },
        contact: {
          businessHours: {
            monday: '9:00 AM - 6:00 PM',
            tuesday: '9:00 AM - 6:00 PM',
            wednesday: '9:00 AM - 6:00 PM',
            thursday: '9:00 AM - 6:00 PM',
            friday: '9:00 AM - 6:00 PM',
            saturday: '10:00 AM - 4:00 PM',
            sunday: 'Closed',
          },
        },
        social: {},
        highlights: {
          programs: 'Age-appropriate robotics, coding, and STEM programs designed for local students.',
          schedule: 'After-school and weekend offerings during the school year, plus camps during breaks.',
          focus: 'Hands-on learning, teamwork, and preparing students for real-world robotics challenges.',
        },
        branding: {},
        seo: {
          title: `${franchiseName} | Blaze Robotics Academy`,
          description: `Join ${franchiseName} for hands-on robotics and coding programs...`,
          keywords: `robotics, coding, ${franchiseCode}, STEM education`,
        },
      })
    }
  }, [brandingConfig, franchiseName, franchiseCode])

  const handleSave = async () => {
    try {
      setIsSubmitting(true)
      await onSave(config)
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving branding config:', error)
      alert('Failed to save branding configuration')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Franchise Content - {franchiseName}</DialogTitle>
          <DialogDescription>
            Configure the branding and content for this franchise's public page.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="hero" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="hero">Hero</TabsTrigger>
            <TabsTrigger value="highlights">Highlights</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
          </TabsList>

          {/* Hero Tab */}
          <TabsContent value="hero" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hero-title">Hero Title</Label>
              <Input
                id="hero-title"
                value={config.hero?.title || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    hero: { ...config.hero, title: e.target.value },
                  })
                }
                placeholder={franchiseName}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hero-subtitle">Hero Subtitle (Optional)</Label>
              <Input
                id="hero-subtitle"
                value={config.hero?.subtitle || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    hero: { ...config.hero, subtitle: e.target.value },
                  })
                }
                placeholder="Empowering the next generation of innovators"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hero-description">Hero Description</Label>
              <Textarea
                id="hero-description"
                value={config.hero?.description || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    hero: { ...config.hero, description: e.target.value },
                  })
                }
                placeholder={`Local robotics, coding, and engineering programs for students in the ${franchiseName} area.`}
                rows={4}
              />
            </div>
          </TabsContent>

          {/* Highlights Tab */}
          <TabsContent value="highlights" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="highlight-programs">Programs Description</Label>
              <Textarea
                id="highlight-programs"
                value={config.highlights?.programs || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    highlights: { ...config.highlights, programs: e.target.value },
                  })
                }
                placeholder="Age-appropriate robotics, coding, and STEM programs designed for local students."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="highlight-schedule">Schedule Description</Label>
              <Textarea
                id="highlight-schedule"
                value={config.highlights?.schedule || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    highlights: { ...config.highlights, schedule: e.target.value },
                  })
                }
                placeholder="After-school and weekend offerings during the school year, plus camps during breaks."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="highlight-focus">Focus Description</Label>
              <Textarea
                id="highlight-focus"
                value={config.highlights?.focus || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    highlights: { ...config.highlights, focus: e.target.value },
                  })
                }
                placeholder="Hands-on learning, teamwork, and preparing students for real-world robotics challenges."
                rows={3}
              />
            </div>
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact-email">Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={config.contact?.email || ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      contact: { ...config.contact, email: e.target.value || null },
                    })
                  }
                  placeholder="contact@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-phone">Phone</Label>
                <Input
                  id="contact-phone"
                  value={config.contact?.phone || ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      contact: { ...config.contact, phone: e.target.value || null },
                    })
                  }
                  placeholder="+1 (425) 555-0123"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Street"
                  value={config.contact?.address?.street || ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      contact: {
                        ...config.contact,
                        address: {
                          ...config.contact?.address,
                          street: e.target.value || undefined,
                        },
                      },
                    })
                  }
                />
                <Input
                  placeholder="City"
                  value={config.contact?.address?.city || ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      contact: {
                        ...config.contact,
                        address: {
                          ...config.contact?.address,
                          city: e.target.value || undefined,
                        },
                      },
                    })
                  }
                />
                <Input
                  placeholder="State"
                  value={config.contact?.address?.state || ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      contact: {
                        ...config.contact,
                        address: {
                          ...config.contact?.address,
                          state: e.target.value || undefined,
                        },
                      },
                    })
                  }
                />
                <Input
                  placeholder="ZIP Code"
                  value={config.contact?.address?.zip || ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      contact: {
                        ...config.contact,
                        address: {
                          ...config.contact?.address,
                          zip: e.target.value || undefined,
                        },
                      },
                    })
                  }
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
                      value={config.contact?.businessHours?.[day as keyof typeof config.contact.businessHours] || ''}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          contact: {
                            ...config.contact,
                            businessHours: {
                              ...config.contact?.businessHours,
                              [day]: e.target.value || undefined,
                            },
                          },
                        })
                      }
                      placeholder="9:00 AM - 6:00 PM"
                    />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Social Tab */}
          <TabsContent value="social" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {['facebook', 'instagram', 'twitter', 'youtube'].map((platform) => (
                <div key={platform} className="space-y-2">
                  <Label className="capitalize">{platform}</Label>
                  <Input
                    type="url"
                    value={config.social?.[platform as keyof typeof config.social] || ''}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        social: {
                          ...config.social,
                          [platform]: e.target.value || null,
                        },
                      })
                    }
                    placeholder={`https://${platform}.com/...`}
                  />
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Branding Tab */}
          <TabsContent value="branding" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="branding-logo">Logo URL</Label>
              <Input
                id="branding-logo"
                type="url"
                value={config.branding?.logoUrl || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    branding: { ...config.branding, logoUrl: e.target.value || null },
                  })
                }
                placeholder="https://..."
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="branding-primary-color">Primary Color</Label>
                <Input
                  id="branding-primary-color"
                  type="color"
                  value={config.branding?.primaryColor || '#0066CC'}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      branding: { ...config.branding, primaryColor: e.target.value },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branding-secondary-color">Secondary Color</Label>
                <Input
                  id="branding-secondary-color"
                  type="color"
                  value={config.branding?.secondaryColor || '#FF6600'}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      branding: { ...config.branding, secondaryColor: e.target.value },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branding-accent-color">Accent Color</Label>
                <Input
                  id="branding-accent-color"
                  type="color"
                  value={config.branding?.accentColor || '#00CC66'}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      branding: { ...config.branding, accentColor: e.target.value },
                    })
                  }
                />
              </div>
            </div>
          </TabsContent>

          {/* SEO Tab */}
          <TabsContent value="seo" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="seo-title">Meta Title</Label>
              <Input
                id="seo-title"
                value={config.seo?.title || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    seo: { ...config.seo, title: e.target.value },
                  })
                }
                placeholder={`${franchiseName} | Blaze Robotics Academy`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seo-description">Meta Description</Label>
              <Textarea
                id="seo-description"
                value={config.seo?.description || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    seo: { ...config.seo, description: e.target.value },
                  })
                }
                placeholder={`Join ${franchiseName} for hands-on robotics and coding programs...`}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seo-keywords">Meta Keywords</Label>
              <Input
                id="seo-keywords"
                value={config.seo?.keywords || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    seo: { ...config.seo, keywords: e.target.value },
                  })
                }
                placeholder={`robotics, coding, ${franchiseCode}, STEM education`}
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

