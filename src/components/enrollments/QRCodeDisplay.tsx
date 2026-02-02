'use client'

import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'

interface QRCodeDisplayProps {
  qrCodeData: string
  enrollmentId: string
  studentName: string
  className?: string
}

export function QRCodeDisplay({ qrCodeData, enrollmentId, studentName, className = '' }: QRCodeDisplayProps) {
  const qrRef = useRef<HTMLDivElement>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    if (!qrRef.current) return

    setIsDownloading(true)
    try {
      // Get the SVG element
      const svgElement = qrRef.current.querySelector('svg')
      if (!svgElement) return

      // Convert SVG to blob
      const svgData = new XMLSerializer().serializeToString(svgElement)
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      const svgUrl = URL.createObjectURL(svgBlob)

      // Create a canvas to convert SVG to PNG
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width * 2 // Higher resolution
        canvas.height = img.height * 2
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        // Download as PNG
        canvas.toBlob((blob) => {
          if (!blob) return
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `qr-code-${enrollmentId.slice(0, 8)}-${studentName.replace(/\s+/g, '-')}.png`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
          setIsDownloading(false)
        }, 'image/png')
      }
      img.src = svgUrl
    } catch (error) {
      console.error('Error downloading QR code:', error)
      setIsDownloading(false)
    }
  }

  return (
    <div className={className}>
      <div ref={qrRef} className="flex justify-center p-4 bg-white rounded-lg border-2 border-dashed">
        <QRCodeSVG
          value={qrCodeData}
          size={192}
          level="M"
          includeMargin={true}
        />
      </div>
      <Button
        variant="outline"
        className="w-full mt-4"
        onClick={handleDownload}
        disabled={isDownloading}
      >
        {isDownloading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Downloading...
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Download QR Code
          </>
        )}
      </Button>
    </div>
  )
}
