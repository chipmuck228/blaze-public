'use client'

import { useState, useMemo } from 'react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { AboutHero } from '@/components/about/AboutHero'
import { faqData, type FaqTabKey } from '@/lib/faq-data'
import { HelpCircle, Plus, Minus } from 'lucide-react'
import Script from 'next/script'

function getFaqSchemaItems() {
  const items: { question: string; answer: string }[] = []
  for (const tab of Object.values(faqData)) {
    for (const faq of tab.items) {
      const text = typeof faq.answer === 'string' ? faq.answer : ''
      if (text) items.push({ question: faq.question, answer: text })
    }
  }
  return items
}

export default function FaqPage() {
  const [activeTab, setActiveTab] = useState<FaqTabKey>('general')
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const currentFaqs = faqData[activeTab].items

  const faqSchema = useMemo(() => {
    const mainEntity = getFaqSchemaItems().map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    }))
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity,
    }
  }, [])

  return (
    <>
      <Script
        id="faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        strategy="afterInteractive"
      />
      <Navbar />
      <main className="min-h-screen bg-background pt-20">
        <div className="pb-24 bg-white">
          <AboutHero />

          <section className="py-24 px-4 bg-white">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-16">
                <h1 className="text-4xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h1>
                <p className="text-slate-500 text-lg">Find answers to common questions about our programs, camps, and competitions.</p>
              </div>

              <div className="bg-slate-100 rounded-3xl p-2 flex mb-12 overflow-x-auto scrollbar-hide">
                {(Object.entries(faqData) as [FaqTabKey, (typeof faqData)[FaqTabKey]][]).map(([key, data]) => (
                  <button
                    key={key}
                    onClick={() => { setActiveTab(key); setOpenIndex(0); }}
                    className={`flex items-center space-x-2 px-6 py-4 rounded-2xl text-sm font-bold transition-all whitespace-nowrap grow justify-center ${
                      activeTab === key ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {data.icon}
                    <span>{data.label}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                {currentFaqs.map((faq, index) => (
                  <div
                    key={`${activeTab}-${index}`}
                    className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md"
                  >
                    <button
                      onClick={() => setOpenIndex(openIndex === index ? null : index)}
                      className="w-full flex items-center justify-between p-6 text-left"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-lg transition-colors ${openIndex === index ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                          <HelpCircle className="w-5 h-5" />
                        </div>
                        <span className={`text-lg font-bold transition-colors ${openIndex === index ? 'text-blue-600' : 'text-slate-800'}`}>
                          {faq.question}
                        </span>
                      </div>
                      {openIndex === index ? <Minus className="w-5 h-5 text-blue-600" /> : <Plus className="w-5 h-5 text-slate-400" />}
                    </button>
                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="p-6 pt-0 text-slate-600 leading-relaxed border-t border-slate-50 mt-2">
                        <div className="pl-12">
                          {typeof faq.answer === 'string' ? <p>{faq.answer}</p> : faq.answer}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
