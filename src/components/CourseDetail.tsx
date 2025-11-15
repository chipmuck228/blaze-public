'use client'
import Image from "next/image";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { CheckCircle2, Users, Target, BookOpen } from "lucide-react";

interface CourseDetailProps {
  course: {
    title: string;
    type: string;
    gradeLevel: string;
    status?: string;
    description: string;
    targetStudents: string;
    learningOutcomes: string[];
    image?: string;
  };
}

const getTypeColor = (type: string) => {
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

export const CourseDetail = ({ course }: CourseDetailProps) => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <nav className="text-sm text-muted-foreground mb-6">
            <a href="/" className="hover:text-primary transition-colors">Home</a>
            <span className="mx-2">/</span>
            <a href="/#courses" className="hover:text-primary transition-colors">Courses</a>
            <span className="mx-2">/</span>
            <span className="text-foreground">{course.title}</span>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Badge 
                variant="outline" 
                className={`${getTypeColor(course.type)} border text-sm px-3 py-1`}
              >
                {course.type}
              </Badge>
              <Badge variant="secondary" className="text-sm px-3 py-1">
                Grades {course.gradeLevel}
              </Badge>
              {course.status && (
                <Badge variant="outline" className="text-sm px-3 py-1 border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-400">
                  {course.status}
                </Badge>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {course.title}
            </h1>
          </div>

          {/* Course Image */}
          <div className="mb-8 rounded-lg overflow-hidden bg-muted aspect-video relative">
            <Image
              src="/growth-details-cover-1.png"
              alt={course.title}
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* Description */}
          <div className="prose prose-lg dark:prose-invert max-w-none mb-12">
            <p className="text-lg text-muted-foreground leading-relaxed">
              {course.description}
            </p>
          </div>

          {/* Key Information Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Target Students */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-primary" />
                  <CardTitle className="text-xl">Target Students</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {course.targetStudents}
                </p>
              </CardContent>
            </Card>

            {/* Learning Outcomes */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-primary" />
                  <CardTitle className="text-xl">Learning Outcomes</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {course.learningOutcomes.map((outcome, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground leading-relaxed">
                        {outcome}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* CTA Section */}
          <div className="bg-muted/50 rounded-lg p-8 text-center">
            <BookOpen className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Join us for this exciting robotics adventure and take your skills to the next level!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="destructive" size="lg" asChild>
                <a href="https://www.blazeroboticsacademy.org/winter2026" target="_blank" rel="noreferrer noopener">
                  Enroll Now
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="/course-catalog">
                  View All Courses
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

