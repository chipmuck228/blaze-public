'use client'
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % advantages.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToPrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + advantages.length) % advantages.length);
  };

  const goToNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % advantages.length);
  };

  const goToSlide = (index: number) => {
    setIsAutoPlaying(false);
    setCurrentIndex(index);
  };

  return (
    <section id="advantages" className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-24 sm:py-32">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
        Our{" "}
        <span 
          className="inline bg-clip-text text-transparent"
          style={{
            backgroundImage: 'linear-gradient(to bottom, hsl(var(--primary) / 0.6), hsl(var(--primary)))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Advantages
        </span>
      </h2>
      <p className="text-xl text-muted-foreground text-center mb-12">
        Discover what makes Blaze Robotics Academy unique
      </p>

      <div className="max-w-4xl mx-auto">
        {/* Carousel Container */}
        <div className="relative">
          {/* Card Display */}
          <div className="overflow-hidden rounded-lg">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {advantages.map((advantage) => (
                <div key={advantage.id} className="min-w-full px-2">
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="text-2xl md:text-3xl">
                        {advantage.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                        {advantage.description}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Buttons */}
          <Button
            variant="outline"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 z-10 rounded-full shadow-lg"
            onClick={goToPrevious}
            aria-label="Previous advantage"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 z-10 rounded-full shadow-lg"
            onClick={goToNext}
            aria-label="Next advantage"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Dots Indicator */}
        <div className="flex justify-center gap-2 mt-8">
          {advantages.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "w-8 bg-primary"
                  : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Slide Counter */}
        <div className="text-center mt-4 text-sm text-muted-foreground">
          {currentIndex + 1} / {advantages.length}
        </div>
      </div>
    </section>
  );
};

