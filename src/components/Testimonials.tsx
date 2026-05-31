"use client";
import { useState, useEffect, useRef } from "react";
import { LazyRemoteImage } from "@/components/ui/LazyRemoteImage";
import { getErrorMessage } from "@/lib/admin-toast";

interface TestimonialProps {
  id: string;
  user_id: string;
  name: string;
  email?: string | null;
  comment: string;
  image_url?: string | null;
  campus_id?: string | null;
  location_name?: string | null;
}

interface TestimonialsProps {
  franchiseCode?: string; // 可选的 franchise code，如果提供则只显示该 franchise 的 testimonials
  locationName?: string; // 可选的 location 名称，用于显示在标题中
}

export const Testimonials = ({ franchiseCode, locationName }: TestimonialsProps = {}) => {
  const [testimonials, setTestimonials] = useState<TestimonialProps[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const rowRef = useRef<HTMLDivElement>(null);

  // 从数据库获取 testimonials
  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const params = new URLSearchParams()
        if (franchiseCode) {
          params.set('franchise', franchiseCode)
        }
        
        const response = await fetch(`/api/public/testimonials?${params.toString()}`)
        if (!response.ok) {
          throw new Error("Failed to load testimonials")
        }
        
        const data = await response.json()
        setTestimonials(data.testimonials || [])
      } catch (err: unknown) {
        console.error("Error fetching testimonials:", err)
        setError(getErrorMessage(err) || "Failed to load testimonials")
        // 如果出错，使用空数组
        setTestimonials([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchTestimonials()
  }, [franchiseCode])

  // 复制 testimonials 数组以创建无缝滚动效果（复制2次确保有足够内容形成无缝循环）
  const displayTestimonials = testimonials;
  const duplicatedTestimonials = testimonials.length > 0 ? [...displayTestimonials, ...displayTestimonials] : [];

  const getAvatarInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const getAvatarColor = (index: number) => {
    return index % 2 === 0 ? "bg-[#2563eb]" : "bg-[#e0f2fe]";
  };

  // 动画效果 useEffect - 只在有数据时运行
  useEffect(() => {
    // 如果没有数据，不初始化动画
    if (testimonials.length === 0) return;

    const row = rowRef.current;

    if (!row) return;

    let animation: Animation | null = null;

    // 等待元素完全渲染后再启动动画
    const initAnimation = () => {
      // 确保元素已经渲染并可以获取正确的宽度
      // 由于我们复制了内容2次，scrollWidth 是原始内容的2倍
      // 我们需要移动原始内容的宽度（1/2），这样当第一份移出时，第二份正好进入
      const originalWidth = row.scrollWidth / 2;

      // 验证宽度是否有效
      if (originalWidth <= 0) {
        console.warn('Testimonials: Invalid scroll width, retrying...');
        // 如果宽度无效，稍后重试
        setTimeout(initAnimation, 100);
        return;
      }

      // 从左向右滚动
      // 内容向左移动（负方向），视觉上是从左向右
      // 从 translateX(0) 到 translateX(-originalWidth)
      // 当第一份内容移出左边时，第二份内容正好在原来的位置，形成无缝循环
      animation = row.animate(
        [
          { transform: 'translateX(0)' },
          { transform: `translateX(-${originalWidth}px)` }
        ],
        {
          duration: 30000,
          iterations: Infinity,
          easing: 'linear',
        }
      );
    };

    // 鼠标悬停时暂停/恢复动画
    const handleMouseEnter = () => {
      animation?.pause();
    };

    const handleMouseLeave = () => {
      animation?.play();
    };

    const container = row.parentElement;
    if (container) {
      container.addEventListener('mouseenter', handleMouseEnter);
      container.addEventListener('mouseleave', handleMouseLeave);
    }

    // 使用 requestAnimationFrame 确保 DOM 已完全渲染
    requestAnimationFrame(() => {
      // 再等待一帧确保宽度计算准确
      requestAnimationFrame(initAnimation);
    });

    return () => {
      animation?.cancel();
      if (container) {
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [testimonials]); // 依赖 testimonials，当数据变化时重新初始化动画

  // 如果正在加载，显示加载状态
  if (isLoading) {
    return (
      <section
        id="testimonials"
        className="py-16 sm:py-20 lg:py-24 bg-slate-50 dark:bg-slate-900"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0f172a] dark:text-white">
              What {locationName ? `${locationName} Parents` : 'Parents Across Our Network'} Say
            </h2>
          </div>
          <div className="flex items-center justify-center py-10">
            <div className="text-slate-400">Loading testimonials...</div>
          </div>
        </div>
      </section>
    )
  }

  // 如果出错或没有数据，不显示组件
  if (error || testimonials.length === 0) {
    return null
  }

  return (
    <section
      id="testimonials"
      className="py-16 sm:py-20 lg:py-24 bg-slate-50 dark:bg-slate-900"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-[#0f172a] dark:text-white">
            What {locationName ? `${locationName} Parents` : 'Parents Across Our Network'} Say
          </h2>
        </div>
        
        <div className="relative overflow-hidden py-4">
          {/* 渐变遮罩 - 左侧 */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-slate-50 dark:from-slate-900 via-slate-50/80 dark:via-slate-900/80 to-transparent z-10 pointer-events-none" />
          {/* 渐变遮罩 - 右侧 */}
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-slate-50 dark:from-slate-900 via-slate-50/80 dark:via-slate-900/80 to-transparent z-10 pointer-events-none" />

          {/* 滚动行 - 从左到右滚动 */}
          <div className="flex gap-8 will-change-transform" ref={rowRef}>
            {duplicatedTestimonials.map((testimonial, index) => (
              <div
                key={`testimonial-${testimonial.id}-${index}`}
                className="flex-shrink-0 w-[350px] md:w-[400px] bg-white dark:bg-slate-800 p-10 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700"
              >
                <p className="text-lg italic text-slate-600 dark:text-slate-300 mb-6">
                  "{testimonial.comment}"
                </p>
                <div className="flex items-center space-x-4">
                  {testimonial.image_url ? (
                    <LazyRemoteImage
                      src={testimonial.image_url}
                      alt={testimonial.name}
                      containerClassName="w-12 h-12 shrink-0 rounded-full"
                      className="rounded-full"
                      fallback={
                        <div
                          className={`absolute inset-0 ${getAvatarColor(index)} rounded-full flex items-center justify-center font-semibold text-sm ${
                            index % 2 === 0 ? "text-white" : "text-[#2563eb]"
                          }`}
                        >
                          {getAvatarInitials(testimonial.name)}
                        </div>
                      }
                    />
                  ) : (
                    <div
                      className={`w-12 h-12 shrink-0 ${getAvatarColor(index)} rounded-full flex items-center justify-center font-semibold text-sm ${
                        index % 2 === 0 ? "text-white" : "text-[#2563eb]"
                      }`}
                    >
                      {getAvatarInitials(testimonial.name)}
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-[#0f172a] dark:text-white">{testimonial.name}</h4>
                    <p className="text-sm text-slate-400 dark:text-slate-500">
                      {locationName || testimonial.location_name || 'Blaze Robotics Academy'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};