"use client";
import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface TestimonialProps {
  image: string;
  name: string;
  userName: string;
  comment: string;
}

const testimonials: TestimonialProps[] = [
  {
    image: "https://github.com/shadcn.png",
    name: "Mom of Sofia",
    userName: "@linda_sofia",
    comment: "Seeing Sophie's transformation during her time with Team 838G has been a profound experience for us. From a shy 3rd grader to a confident team player who's now comfortable collaborating with students from around the world, her progress has been remarkable.",
  },
  {
    image: "https://github.com/shadcn.png",
    name: "Dave Wang",
    userName: "@dave_wang",
    comment: "Being part of Team 938X has been an amazing adventure. The opportunity to compete at the world championship stage was a dream come true for us. It's not just about the robots; it's about pushing our limits and learning from failures.",
  },
  {
    image: "https://github.com/shadcn.png",
    name: "Team 938 X.",
    userName: "@spencer_y",
    comment: "This experience has taught us the true meaning of perseverance and innovation. The program has opened up a world of possibilities far beyond our expectations.",
  },
  {
    image: "https://github.com/shadcn.png",
    name: "Sarah Chen",
    userName: "@sarah_chen",
    comment: "Blaze Robotics Academy has been incredible for my daughter. She's learned so much about coding and robotics, and the instructors are amazing mentors who really care about each student's growth.",
  },
  {
    image: "https://github.com/shadcn.png",
    name: "Michael Johnson",
    userName: "@mike_j",
    comment: "The hands-on approach here is fantastic. My son has built several robots and even participated in competitions. The skills he's gained go way beyond just robotics.",
  },
  {
    image: "https://github.com/shadcn.png",
    name: "Emily Rodriguez",
    userName: "@emily_r",
    comment: "As a parent, I'm impressed by how Blaze Robotics Academy combines education with excitement. My kids love coming here and are always excited to share what they've learned.",
  },
  {
    image: "https://github.com/shadcn.png",
    name: "James Kim",
    userName: "@james_k",
    comment: "The 6000 sq ft Robot House is amazing! There's so much space for kids to experiment and create. The facilities are top-notch and the programs are well-structured.",
  },
  {
    image: "https://github.com/shadcn.png",
    name: "Lisa Thompson",
    userName: "@lisa_t",
    comment: "What I love most is how the program builds 21st century skills. My daughter has become more confident, collaborative, and creative. These are skills that will serve her well in the future.",
  },
];

// 复制 testimonials 数组以创建无缝滚动效果（复制2次确保有足够内容形成无缝循环）
const duplicatedTestimonials = [...testimonials, ...testimonials];

export const Testimonials = () => {
  const [isPaused, setIsPaused] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
      setIsPaused(true);
      animation?.pause();
    };

    const handleMouseLeave = () => {
      setIsPaused(false);
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
  }, []);

  return (
    <section
      id="testimonials"
      className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-1 sm:py-24"
    >
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
          How{" "}
          <span className="inline bg-gradient-to-b from-primary/60 to-primary bg-clip-text text-transparent">
            People Love
          </span>{" "}
          Blaze Robotics Academy
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          These are some testimonials from our community displayed to showcase the impact of our programs.
        </p>
      </div>

      <div className="relative overflow-hidden py-4">
        {/* 渐变遮罩 - 左侧 */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background via-background/80 to-transparent z-10 pointer-events-none" />
        {/* 渐变遮罩 - 右侧 */}
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background via-background/80 to-transparent z-10 pointer-events-none" />

        {/* 滚动行 - 从左到右滚动 */}
        <div className="flex gap-4 will-change-transform" ref={rowRef}>
          {duplicatedTestimonials.map((testimonial, index) => (
            <Card
              key={`testimonial-${index}`}
              className="flex-shrink-0 w-[350px] md:w-[400px]"
            >
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <Avatar>
                  <AvatarImage
                    alt={testimonial.name}
                    src={testimonial.image}
                  />
                  <AvatarFallback>
                    {testimonial.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <CardTitle className="text-base font-semibold">{testimonial.name}</CardTitle>
                  <CardDescription className="text-sm">{testimonial.userName}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {testimonial.comment}
              </CardContent>
            </Card>
          ))}
        </div>

      </div>
    </section>
  );
};