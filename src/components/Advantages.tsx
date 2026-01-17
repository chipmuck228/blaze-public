'use client'
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "./ui/carousel";
import { useEffect, useState } from "react";

interface Advantage {
  id: number;
  title: string;
  description: string;
}

const advantages: Advantage[] = [
  {
    id: 1,
    title: "Sparking STEM Curiosity",
    description: "Blaze Robotics Academy stands out with a 6000 sq ft Robot House for all ages, from elementary to high school enthusiasts. Our camps ignite a passion for STEM, blending education with excitement. With 90% of campers returning for more, our sessions prove to be both inspirational and impactful, fostering a community of curious and dedicated learners."
  },
  {
    id: 2,
    title: "Hands-On Experience",
    description: "We emphasizes the importance of hands-on, interactive learning. That is why our camps are packed with practical activities, from building and programming robots to designing and creating 3D printed projects. By actively engaging with the material, campers develop a deeper understanding of STEM principles, all while having a blast."
  },
  {
    id: 3,
    title: "Expert Guidance",
    description: "Our instructors are more than teachers; they're mentors from competition team coaches and robotics enthusiasts with extensive experience in building robots. Deeply passionate about education, they offer personalized support, ensuring each camper learns in a nurturing and engaging setting, helping every participant reach their highest potential."
  },
  {
    id: 4,
    title: "Building 21st Century Skills",
    description: "In today's rapidly evolving world, skills such as collaboration, communication, critical thinking, and creativity (the 4Cs) are indispensable. Our camps are designed to foster these essential skills, ensuring students are well-prepared for the challenges and opportunities of the future."
  },
  {
    id: 5,
    title: "Showcase and Recognition",
    description: "Every camper's hard work and creativity are celebrated. Our end-of-camp showcases allow students to present their projects, fostering a sense of accomplishment and pride in their achievements."
  },
  {
    id: 6,
    title: "Pathway to Compete",
    description: "Join Blaze camps as a gateway to our competitive teams, where passionate campers advance to compete in robotics challenges globally. It's the perfect avenue for those eager to transform their STEM enthusiasm into notable achievements."
  }
];

export const Advantages = () => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  // Auto-play functionality
  useEffect(() => {
    if (!api || !isAutoPlaying) return;

    const interval = setInterval(() => {
      api.scrollNext();
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [api, isAutoPlaying]);

  // Stop auto-play when user interacts
  const handleInteraction = () => {
    setIsAutoPlaying(false);
  };

  return (
    <section id="advantages" className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-16 md:py-24">
      <div className="text-center mb-12 md:mb-16">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-purple-500 to-pink-500 text-transparent bg-clip-text">
          Our Advantages
        </h2>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Discover what makes Blaze Robotics Academy unique
        </p>
      </div>

      <div className="max-w-5xl mx-auto relative">
        <Carousel
          setApi={setApi}
          opts={{
            align: "start",
            loop: true,
            dragFree: false,
            containScroll: "trimSnaps",
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {advantages.map((advantage, index) => (
              <CarouselItem key={advantage.id} className="pl-2 md:pl-4 basis-full md:basis-11/12">
                <div className="p-1 h-full">
                  <Card className="h-full min-h-[200px] group relative overflow-hidden border-2 border-transparent hover:border-primary/20 transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 bg-gradient-to-br from-card via-card to-card/95 cursor-grab active:cursor-grabbing flex flex-col">
                    {/* Decorative gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    
                    {/* Number badge */}
                    <div className="absolute top-4 right-4 w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-0 group-hover:scale-100">
                      {index + 1}
                    </div>

                    <CardHeader className="relative z-10 pb-4 flex-shrink-0">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-md">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-purple-500" />
                        </div>
                        <CardTitle className="text-2xl md:text-3xl font-bold leading-tight group-hover:text-primary transition-colors duration-300 flex-1">
                          {advantage.title}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="relative z-10 pt-0 flex-1 flex flex-col min-h-0">
                      <p className="text-muted-foreground text-base md:text-lg leading-relaxed group-hover:text-foreground/90 transition-colors duration-300 line-clamp-6 overflow-hidden">
                        {advantage.description}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* Dots Indicator - Enhanced for better mobile interaction */}
        <div className="flex justify-center items-center gap-3 mt-10 px-4">
          {advantages.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                handleInteraction();
                api?.scrollTo(index);
              }}
              className={`rounded-full transition-all duration-300 ease-out touch-manipulation ${
                index === current - 1
                  ? "w-10 h-3 bg-gradient-to-r from-primary via-purple-500 to-pink-500 shadow-md shadow-primary/50"
                  : "w-3 h-3 bg-muted-foreground/30 hover:bg-muted-foreground/60 active:scale-125 hover:scale-125"
              }`}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === current - 1 ? "true" : "false"}
            />
          ))}
        </div>

        {/* Slide Counter with hint */}
        <div className="text-center mt-6 space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 backdrop-blur-sm border border-border/50">
            <span className="text-sm font-medium text-muted-foreground">
              {current}
            </span>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-sm font-medium text-muted-foreground">
              {count}
            </span>
          </div>
          <p className="text-xs text-muted-foreground/70">
            Swipe or tap dots to navigate
          </p>
        </div>
      </div>
    </section>
  );
};
