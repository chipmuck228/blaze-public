'use client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ArrowRight } from "lucide-react";

interface Camp {
  id: number;
  title: string;
  type: 'Day Camp' | 'Winter Camp' | 'Mid-Winter Camp' | 'Spring Camp';
  gradeLevel: string;
  description?: string;
  slug?: string;
}

const camps: Camp[] = [
  {
    id: 1,
    title: "Robotics Tech Explorer Day Camp",
    type: "Day Camp",
    gradeLevel: "K-2",
    description: "Turn school breaks into discovery days! One-day camp inspires creativity through exciting robotics and technology projects."
  },
  {
    id: 2,
    title: "Mars Exploration with VEX GO",
    type: "Winter Camp",
    gradeLevel: "K-2",
    description: "Explore Mars through robotics and hands-on activities"
  },
  {
    id: 3,
    title: "RoboAthletes Olympics with VEX IQ",
    type: "Winter Camp",
    gradeLevel: "3-5",
    description: "Compete in robotics challenges and build athletic robots"
  },
  {
    id: 4,
    title: "Race Car to Code with VEX GO",
    type: "Mid-Winter Camp",
    gradeLevel: "K-2",
    description: "Turn mid-winter break into a tech adventure! Build, code, and create with robotics."
  },
  {
    id: 5,
    title: "3D Design Beginner - Junior Maker",
    type: "Mid-Winter Camp",
    gradeLevel: "2-4, 5-8",
    description: "Learn 3D design and printing fundamentals"
  },
  {
    id: 6,
    title: "RoboChamps: Intro to Python via VEX IQ",
    type: "Mid-Winter Camp",
    gradeLevel: "4-6",
    description: "Learn programming fundamentals through robotics"
  }
];

const getTypeColor = (type: Camp['type']) => {
  switch (type) {
    case 'Day Camp':
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
    case 'Winter Camp':
      return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
    case 'Mid-Winter Camp':
      return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20';
    case 'Spring Camp':
      return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20';
    default:
      return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20';
  }
};

export const Camps = () => {
  return (
    <section id="camps" className="container mx-auto px-4 py-24 sm:py-32">
      <div className="flex flex-col md:flex-row justify-between items-center mb-12">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Featured{" "}
            <span 
              className="inline bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(to bottom, hsl(var(--primary) / 0.6), hsl(var(--primary)))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Camps
            </span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Turn school breaks into tech adventures! Build, code, and create with robotics and 3D design.
          </p>
        </div>
        <Button
          variant="outline"
          className="mt-4 md:mt-0"
          asChild
        >
          <a href="/camps">
            View All Camps
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {camps.map((camp) => (
          <Card key={camp.id} className="flex flex-col hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between gap-2 mb-2">
                <Badge 
                  variant="outline" 
                  className={`${getTypeColor(camp.type)} border`}
                >
                  {camp.type}
                </Badge>
                <Badge variant="secondary" className="shrink-0">
                  Grades {camp.gradeLevel}
                </Badge>
              </div>
              <CardTitle className="text-xl leading-tight">
                {camp.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {camp.description && (
                <CardDescription className="mb-4 text-base">
                  {camp.description}
                </CardDescription>
              )}
              <div className="mt-auto">
                <Button
                  variant="ghost"
                  className="w-full justify-end group"
                  asChild
                >
                  <a
                    href={camp.slug ? `/camps/${camp.slug}` : "https://www.blazeroboticsacademy.org/winter-camps"}
                    {...(camp.slug ? {} : { target: "_blank", rel: "noreferrer noopener" })}
                  >
                    Learn More
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* More Camps Button - Mobile */}
      <div className="mt-8 text-center md:hidden">
        <Button
          variant="default"
          size="lg"
          asChild
        >
          <a href="/camps">
            View All Camps
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </div>
    </section>
  );
};

