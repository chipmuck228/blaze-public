'use client'

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Navbar } from "@/components/Navbar"
import { MobileLayout } from "@/app/mobile-layout"
import { usePlatform } from "@/hooks/usePlatform"
import { Footer } from "@/components/Footer"
import { Loader2, CreditCard, Plus, Trash2, MapPin, History, ShieldCheck, MoreVertical, ChevronRight } from "lucide-react"
import Link from "next/link"
import { AddPaymentMethodDialog } from "@/components/payment/AddPaymentMethodDialog"

interface PaymentMethod {
  id: string
  type: 'card' | 'paypal' | 'bank'
  card?: {
    brand?: string
    last4?: string
    exp_month?: number
    exp_year?: number
  }
  last4?: string
  brand?: string
  is_default: boolean
  expires_at?: string
  created?: number
}

interface BillingRecord {
  id: string
  amount: number
  currency: string
  payment_status: 'paid' | 'refunded'
  payment_transaction_id?: string
  created_at: string
  course?: {
    id: string
    name: string
  }
}

export default function BillingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { isNative, isReady } = usePlatform()
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [billingHistory, setBillingHistory] = useState<BillingRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddPaymentMethodOpen, setIsAddPaymentMethodOpen] = useState(false)
  const [isRemovingPaymentMethod, setIsRemovingPaymentMethod] = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (status === "authenticated" && session?.user) {
      fetchPaymentMethods()
      fetchBillingHistory()
    }
  }, [status, session, router])

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch("/api/user/payment-methods")
      if (response.ok) {
        const data = await response.json()
        setPaymentMethods(data || [])
      }
    } catch (error) {
      console.error("Error fetching payment methods:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchBillingHistory = async () => {
    try {
      const response = await fetch("/api/user/billing-history")
      if (response.ok) {
        const data = await response.json()
        setBillingHistory(data.billingHistory || [])
      }
    } catch (error) {
      console.error("Error fetching billing history:", error)
    }
  }

  const handleAddPaymentMethodSuccess = () => {
    fetchPaymentMethods()
  }

  const handleRemovePaymentMethod = async (paymentMethodId: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) {
      return
    }

    setIsRemovingPaymentMethod(paymentMethodId)
    try {
      const response = await fetch(`/api/user/payment-methods/${paymentMethodId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchPaymentMethods()
        toast.success('Payment method removed successfully')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to remove payment method')
      }
    } catch (error: any) {
      console.error('Error removing payment method:', error)
      toast.error('Failed to remove payment method')
    } finally {
      setIsRemovingPaymentMethod(null)
    }
  }

  const getCardBrandDisplay = (method: PaymentMethod): string => {
    if (method.card?.brand) {
      return method.card.brand.charAt(0).toUpperCase() + method.card.brand.slice(1)
    }
    if (method.brand) {
      return method.brand.charAt(0).toUpperCase() + method.brand.slice(1)
    }
    return method.type.toUpperCase()
  }

  const getCardLast4 = (method: PaymentMethod): string | undefined => {
    return method.card?.last4 || method.last4
  }

  const getCardExpiry = (method: PaymentMethod): string | undefined => {
    if (method.card?.exp_month && method.card?.exp_year) {
      return `${String(method.card.exp_month).padStart(2, '0')}/${method.card.exp_year}`
    }
    if (method.expires_at) {
      return formatDate(method.expires_at)
    }
    return undefined
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (status === "loading" || isLoading) {
    return (
      <>
        <Navbar />
        <div className="pt-14 min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    )
  }

  if (!session) {
    return null
  }

  // Mock data for transactions - replace with actual data
  const transactions = billingHistory.map((record) => ({
    date: formatDate(record.created_at),
    desc: record.course?.name || 'Course Enrollment',
    amount: record.amount,
    status: record.payment_status === 'paid' ? 'Paid' : 'Refunded',
  }))

  const content = (
    <div className="pb-24 bg-slate-50 min-h-screen">
      <section className="bg-[#0f172a] py-16 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center space-x-2 text-blue-400 mb-4">
            <Link href="/portal" className="hover:underline text-xs font-bold uppercase tracking-widest">Dashboard</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Billing</span>
          </div>
          <h1 className="text-4xl font-black mb-2">Billing & Payments</h1>
          <p className="text-slate-400">Manage your payment methods, billing address, and view your transaction ledger.</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 -mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            
            {/* Payment Methods Section */}
            <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Payment Methods</h3>
                </div>
                <button 
                  onClick={() => setIsAddPaymentMethodOpen(true)}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-500 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Card</span>
                </button>
              </div>
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                {paymentMethods.length === 0 ? (
                  <div className="col-span-2 text-center py-8">
                    <CreditCard className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-500 mb-4">No payment methods added</p>
                    <button 
                      onClick={() => setIsAddPaymentMethodOpen(true)}
                      className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-blue-500 transition-all"
                    >
                      Add Payment Method
                    </button>
                  </div>
                ) : (
                  paymentMethods.map((pm) => (
                    <div key={pm.id} className={`p-6 rounded-2xl border transition-all relative group ${
                      pm.is_default ? 'border-blue-500 bg-blue-50/30' : 'border-slate-100 bg-slate-50'
                    }`}>
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-8 bg-slate-900 rounded-md flex items-center justify-center text-white text-[10px] font-black italic">
                            {getCardBrandDisplay(pm)}
                          </div>
                          {pm.is_default && (
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-100 px-2 py-0.5 rounded">Default</span>
                          )}
                        </div>
                        <button 
                          onClick={() => handleRemovePaymentMethod(pm.id)}
                          disabled={isRemovingPaymentMethod === pm.id}
                          className="text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
                        >
                          {isRemovingPaymentMethod === pm.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Card Number</p>
                          <p className="text-lg font-bold text-slate-900 tracking-wider">•••• •••• •••• {getCardLast4(pm) || '0000'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Exp</p>
                          <p className="text-sm font-bold text-slate-900">{getCardExpiry(pm) || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Billing Information */}
            <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-8 py-6 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Billing Address</h3>
                </div>
              </div>
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Holder</label>
                    <input type="text" defaultValue={session.user?.name || ""} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email for Receipts</label>
                    <input type="email" defaultValue={session.user?.email || ""} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium" />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Street Address</label>
                    <input type="text" placeholder="123 Innovation Drive" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">City</label>
                    <input type="text" placeholder="Bellevue" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">State</label>
                      <input type="text" placeholder="WA" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-center" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Zip</label>
                      <input type="text" placeholder="98005" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-center" />
                    </div>
                  </div>
                </div>
                <div className="mt-8 flex justify-end">
                  <button className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg">
                    Save Billing Info
                  </button>
                </div>
              </div>
            </div>

            {/* Transaction Ledger */}
            <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                    <History className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Payment History</h3>
                </div>
              </div>
              <div className="overflow-x-auto">
                {transactions.length === 0 ? (
                  <div className="p-8 text-center">
                    <History className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-500">No payment history available</p>
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 border-b border-slate-100">
                      <tr>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="px-8 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {transactions.map((tx, idx) => (
                        <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-4 text-sm font-bold text-slate-900 whitespace-nowrap">{tx.date}</td>
                          <td className="px-8 py-4 text-sm text-slate-500">{tx.desc}</td>
                          <td className="px-8 py-4 text-sm font-black text-slate-900">${tx.amount.toFixed(2)}</td>
                          <td className="px-8 py-4">
                            <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${
                              tx.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {tx.status}
                            </span>
                          </td>
                          <td className="px-8 py-4 text-right">
                            <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                              <MoreVertical className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-blue-600 text-white p-8 rounded-[32px] shadow-xl flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
              <div className="p-4 bg-white/20 rounded-2xl shrink-0">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-xl font-bold mb-1">Bank-Level Security</h4>
                <p className="text-blue-100 text-sm">Your payment information is encrypted and securely processed. We never store full credit card numbers on our servers.</p>
              </div>
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )

  // 移动端：使用移动端布局
  if (isReady && isNative) {
    return (
      <MobileLayout>
        {content}
        <AddPaymentMethodDialog
          open={isAddPaymentMethodOpen}
          onOpenChange={setIsAddPaymentMethodOpen}
          onSuccess={handleAddPaymentMethodSuccess}
        />
      </MobileLayout>
    )
  }

  // Web 端：使用完整布局
  return (
    <>
      <Navbar />
      <div className="pt-14">
        {content}
        <AddPaymentMethodDialog
          open={isAddPaymentMethodOpen}
          onOpenChange={setIsAddPaymentMethodOpen}
          onSuccess={handleAddPaymentMethodSuccess}
        />
      </div>
      <Footer />
    </>
  )
}
