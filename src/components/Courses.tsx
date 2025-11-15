'use client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ArrowRight } from "lucide-react";

interface Course {
  id: number;
  title: string;
  type: 'RoboQuest' | 'LaunchPad' | 'RoboChamps';
  gradeLevel: string;
  description?: string;
  slug?: string;
}

const courses: Course[] = [
  {
    id: 1,
    title: "Introduction to Robotics with VEX GO",
    type: "RoboQuest",
    gradeLevel: "K-2",
    description: "Perfect introduction to robotics for young learners",
    slug: "rq-go-intro"
  },
  {
    id: 2,
    title: "Introduction to Robotics with VEX IQ",
    type: "LaunchPad",
    gradeLevel: "3-4, 5-7",
    description: "Hands-on experience to spark interest in robotics",
    slug: "lp-iq-intro"
  },
  {
    id: 3,
    title: "Introduction to Python via VEX IQ",
    type: "RoboChamps",
    gradeLevel: "4-6",
    description: "Learn programming fundamentals through robotics",
    slug: "rc-python-iq"
  },
  {
    id: 4,
    title: "Mastery Robotics Programming",
    type: "RoboChamps",
    gradeLevel: "3-5",
    description: "Advanced programming skills for robotics",
    slug: "rc-mastery-programming"
  },
  {
    id: 5,
    title: "Introduction to C++ via VEX V5",
    type: "RoboChamps",
    gradeLevel: "6-8",
    description: "Master C++ programming for competitive robotics",
    slug: "rc-cpp-v5"
  },
  {
    id: 6,
    title: "Mars Math with VEX GO",
    type: "RoboQuest",
    gradeLevel: "1-3",
    description: "Complete real-world challenges inspired by the Mars 2020 mission",
    slug: "rq-go-mars"
  }
];

const getTypeColor = (type: Course['type']) => {
  switch (type) {
    case 'RoboQuest':
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
    case 'LaunchPad':
      return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
    case 'RoboChamps':
      return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20';
    default:
      return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20';
  }
};

export const Courses = () => {
  return (
    <section id="courses" className="container mx-auto px-4 py-24 sm:py-32">
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
              Courses
            </span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Explore our Winter 2026 Robotics & Programming Programs
          </p>
        </div>
        <Button
          variant="outline"
          className="mt-4 md:mt-0"
          asChild
        >
          <a href="/course-catalog">
            View All Courses
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <Card key={course.id} className="flex flex-col hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between gap-2 mb-2">
                <Badge 
                  variant="outline" 
                  className={`${getTypeColor(course.type)} border`}
                >
                  {course.type}
                </Badge>
                <Badge variant="secondary" className="shrink-0">
                  Grades {course.gradeLevel}
                </Badge>
              </div>
              <CardTitle className="text-xl leading-tight">
                {course.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {course.description && (
                <CardDescription className="mb-4 text-base">
                  {course.description}
                </CardDescription>
              )}
              <div className="mt-auto">
                <Button
                  variant="ghost"
                  className="w-full justify-end group"
                  asChild
                >
                  <a
                    href={course.slug ? `/course-catalog/${course.slug}` : "https://www.blazeroboticsacademy.org/winter2026"}
                    {...(course.slug ? {} : { target: "_blank", rel: "noreferrer noopener" })}
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

      {/* More Courses Button - Mobile */}
      <div className="mt-8 text-center md:hidden">
        <Button
          variant="default"
          size="lg"
          asChild
        >
          <a href="/course-catalog">
            View All Courses
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </div>
    </section>
  );
};

