'use client'

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent } from "./ui/card"
import { Button } from "./ui/button"
import { Compass, TrendingUp, Trophy, ArrowRight } from "lucide-react"
import Link from "next/link"

interface JourneyStep {
  id: number
  stepNumber: string
  title: string
  description: string
  ctaText: string
  ctaLink: string
  icon: React.ReactNode
  gradientFrom: string
  gradientTo: string
  badge?: string
}

const journeySteps: JourneyStep[] = [
  {
    id: 1,
    stepNumber: "Step 1",
    title: "Explore Your Interests",
    description: "Discover robotics through engaging camps.",
    ctaText: "Join our camps",
    ctaLink: "#camps",
    icon: <Compass className="h-12 w-12" />,
    gradientFrom: "#3B82F6",
    gradientTo: "#1E40AF",
    badge: "Start Here"
  },
  {
    id: 2,
    stepNumber: "Step 2",
    title: "Build Your Skills",
    description: "Learn from experts with structured courses.",
    ctaText: "Enroll in our courses",
    ctaLink: "#courses",
    icon: <TrendingUp className="h-12 w-12" />,
    gradientFrom: "#10B981",
    gradientTo: "#047857"
  },
  {
    id: 3,
    stepNumber: "Step 3",
    title: "Challenge and Achieve",
    description: "Compete at the highest level.",
    ctaText: "Compete with our teams",
    ctaLink: "/programs",
    icon: <Trophy className="h-12 w-12" />,
    gradientFrom: "#F59E0B",
    gradientTo: "#D97706"
  }
]

export const RoboticsJourney = () => {
  const [currentStep, setCurrentStep] = useState(0) // 0 = 未开始, 1-3 = 显示到第几步, 4 = 全部显示完成
  const [isAnimating, setIsAnimating] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 动画序列控制
  const startAnimation = useCallback(() => {
    setIsAnimating(true)
    setCurrentStep(0)
    
    // 清除之前的定时器
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current)
    }

    // 动画序列时间线：
    // 0ms: 开始
    // 600ms: 显示第一个card
    // 1400ms: 延伸第一个箭头
    // 2000ms: 显示第二个card
    // 2800ms: 延伸第二个箭头
    // 3400ms: 显示第三个card
    // 4200ms: 全部完成
    // 6200ms: 重新开始循环

    // Step 1: 显示第一个card (600ms)
    animationTimeoutRef.current = setTimeout(() => {
      setCurrentStep(1)
    }, 600)

    // Step 2: 延伸第一个箭头 (1400ms)
    animationTimeoutRef.current = setTimeout(() => {
      setCurrentStep(2)
    }, 1400)

    // Step 3: 显示第二个card (2000ms)
    animationTimeoutRef.current = setTimeout(() => {
      setCurrentStep(3)
    }, 2000)

    // Step 4: 延伸第二个箭头 (2800ms)
    animationTimeoutRef.current = setTimeout(() => {
      setCurrentStep(4)
    }, 2800)

    // Step 5: 显示第三个card (3400ms)
    animationTimeoutRef.current = setTimeout(() => {
      setCurrentStep(5)
    }, 3400)

    // Step 6: 全部完成，等待后循环 (6200ms)
    animationTimeoutRef.current = setTimeout(() => {
      setCurrentStep(6)
      // 等待2秒后重新开始
      animationTimeoutRef.current = setTimeout(() => {
        startAnimation()
      }, 2000)
    }, 6200)
  }, [])

  // 检测元素进入视口
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isAnimating) {
            startAnimation()
          }
        })
      },
      { threshold: 0.1 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current)
      }
    }
  }, [isAnimating, startAnimation])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current)
      }
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      id="journey"
      className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-16 md:py-24 bg-gradient-to-b from-background to-muted/20"
    >
      <div className="text-center mb-12 md:mb-16">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
          Your Robotics Journey
        </h2>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          From exploration to competition, follow your path to robotics excellence
        </p>
      </div>

      {/* Desktop: Horizontal Layout */}
      <div className="hidden lg:block">
        <div className="relative">
          {/* Steps Container */}
          <div className="relative z-10 flex items-start justify-between gap-4 xl:gap-8">
            {journeySteps.map((step, index) => {
              const stepNumber = index + 1
              // Card显示逻辑：
              // Step 1: 显示第一个card (currentStep >= 1)
              // Step 3: 显示第二个card (currentStep >= 3)
              // Step 5: 显示第三个card (currentStep >= 5)
              const cardStep = stepNumber === 1 ? 1 : stepNumber === 2 ? 3 : 5
              const isCardVisible = currentStep >= cardStep
              
              // 箭头显示逻辑：
              // 第一个箭头在step 2时延伸（第一个card显示后）
              // 第二个箭头在step 4时延伸（第二个card显示后）
              const arrowStep = stepNumber === 1 ? 2 : 4
              const isArrowVisible = currentStep >= arrowStep
              
              return (
                <div
                  key={step.id}
                  className="flex-1"
                >
                  <Card
                    className={`group relative h-full border-0 transition-all duration-500 hover:shadow-xl hover:scale-105 ${
                      index === 1 ? 'lg:scale-110 z-20' : ''
                    } ${
                      isCardVisible 
                        ? 'opacity-100 translate-y-0 scale-100' 
                        : 'opacity-0 translate-y-10 scale-95'
                    }`}
                    style={{
                      transitionDelay: isCardVisible ? '0ms' : '0ms'
                    }}
                  >
                    {/* Connection Arrow (between cards, except last) */}
                    {index < journeySteps.length - 1 && (
                      <div
                        className="absolute top-1/2 -right-4 xl:-right-8 -translate-y-1/2 z-30"
                      >
                        <div className="flex items-center">
                          {/* Path Line - 延伸动画 */}
                          <div
                            className={`h-1 bg-gradient-to-r transition-all duration-700 ease-out ${
                              isArrowVisible ? 'w-8 xl:w-12 opacity-100' : 'w-0 opacity-0'
                            }`}
                            style={{
                              background: `linear-gradient(to right, ${step.gradientTo}, ${journeySteps[index + 1].gradientFrom})`,
                              transitionDelay: isArrowVisible ? '300ms' : '0ms'
                            }}
                          />
                          {/* Arrow Icon */}
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-500 ${
                              isArrowVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
                            }`}
                            style={{
                              background: `linear-gradient(135deg, ${step.gradientTo}, ${journeySteps[index + 1].gradientFrom})`,
                              transitionDelay: isArrowVisible ? '600ms' : '0ms'
                            }}
                          >
                            <ArrowRight className="h-4 w-4" />
                          </div>
                        </div>
                      </div>
                    )}
                  {/* Badge */}
                  {step.badge && (
                    <div
                      className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold text-white shadow-lg"
                      style={{
                        background: `linear-gradient(135deg, ${step.gradientFrom}, ${step.gradientTo})`
                      }}
                    >
                      {step.badge}
                    </div>
                  )}

                  <CardContent className="p-6 md:p-8 text-center space-y-4">
                    {/* Icon */}
                    <div
                      className="mx-auto w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg transition-transform duration-300 group-hover:scale-110"
                      style={{
                        background: `linear-gradient(135deg, ${step.gradientFrom}, ${step.gradientTo})`
                      }}
                    >
                      {step.icon}
                    </div>

                    {/* Step Number */}
                    <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      {step.stepNumber}
                    </div>

                    {/* Title */}
                    <h3 className="text-xl md:text-2xl font-bold">
                      {step.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm md:text-base text-muted-foreground leading-relaxed min-h-[60px]">
                      {step.description}
                    </p>

                    {/* CTA Button */}
                    <Button
                      asChild
                      className="w-full mt-4"
                      style={{
                        background: `linear-gradient(135deg, ${step.gradientFrom}, ${step.gradientTo})`
                      }}
                    >
                      <Link href={step.ctaLink}>
                        {step.ctaText}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )
            })}
          </div>
        </div>
      </div>

      {/* Mobile/Tablet: Vertical Layout */}
      <div className="lg:hidden space-y-6">
        {journeySteps.map((step, index) => {
          const stepNumber = index + 1
          // Card显示逻辑：与桌面端一致
          const cardStep = stepNumber === 1 ? 1 : stepNumber === 2 ? 3 : 5
          const isCardVisible = currentStep >= cardStep
          
          // 箭头显示逻辑：与桌面端一致
          const arrowStep = stepNumber === 1 ? 2 : 4
          const isArrowVisible = currentStep >= arrowStep
          
          return (
            <div
              key={step.id}
              className="transition-all duration-500"
            >
              <Card 
                className={`group relative border-0 transition-all duration-500 ${
                  isCardVisible 
                    ? 'opacity-100 translate-x-0 scale-100' 
                    : 'opacity-0 -translate-x-10 scale-95'
                }`}
              >
                {/* Badge */}
                {step.badge && (
                  <div
                    className="absolute -top-3 left-4 px-3 py-1 rounded-full text-xs font-semibold text-white shadow-lg z-10"
                    style={{
                      background: `linear-gradient(135deg, ${step.gradientFrom}, ${step.gradientTo})`
                    }}
                  >
                    {step.badge}
                  </div>
                )}

                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-transform duration-300 group-hover:scale-110"
                      style={{
                        background: `linear-gradient(135deg, ${step.gradientFrom}, ${step.gradientTo})`
                      }}
                    >
                      {step.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-3">
                      {/* Step Number */}
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {step.stepNumber}
                      </div>

                      {/* Title */}
                      <h3 className="text-lg md:text-xl font-bold">
                        {step.title}
                      </h3>

                      {/* Description */}
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>

                      {/* CTA Button */}
                      <Button
                        asChild
                        className="w-full sm:w-auto"
                        style={{
                          background: `linear-gradient(135deg, ${step.gradientFrom}, ${step.gradientTo})`
                        }}
                      >
                        <Link href={step.ctaLink}>
                          {step.ctaText}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>

                    {/* Connection Arrow (except last) */}
                    {index < journeySteps.length - 1 && (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-500 ${
                            isArrowVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
                          }`}
                          style={{
                            background: `linear-gradient(135deg, ${step.gradientTo}, ${journeySteps[index + 1].gradientFrom})`,
                            transitionDelay: isArrowVisible ? '300ms' : '0ms'
                          }}
                        >
                          <ArrowRight className="h-4 w-4 rotate-90" />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: translateY(-50%) scale(1);
          }
          50% {
            opacity: 0.8;
            transform: translateY(-50%) scale(1.2);
          }
        }
      `}</style>
    </section>
  )
}
