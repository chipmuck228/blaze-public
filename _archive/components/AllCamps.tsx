'use client'
import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Search, Filter, ArrowRight, Sparkles } from "lucide-react";

interface Camp {
  id: string;
  title: string;
  type: 'Day Camp' | 'Winter Camp' | 'Mid-Winter Camp' | 'Spring Camp';
  gradeLevel: string;
  slug?: string;
  featured?: boolean;
}

const allCamps: Camp[] = [
  // Day Camps
  { id: '1', title: "Robotics Tech Explorer Day Camp", type: "Day Camp", gradeLevel: "K-2" },
  { id: '2', title: "Robotics Tech Explorer Day Camp", type: "Day Camp", gradeLevel: "3-5" },
  { id: '3', title: "Robotics Tech Explorer Day Camp", type: "Day Camp", gradeLevel: "6-8" },
  
  // Winter Camps
  { id: '4', title: "Mars Exploration with VEX GO", type: "Winter Camp", gradeLevel: "K-2", featured: true },
  { id: '5', title: "RoboAthletes Olympics with VEX IQ", type: "Winter Camp", gradeLevel: "3-5", featured: true },
  { id: '6', title: "3D Design Beginner - Junior Maker", type: "Winter Camp", gradeLevel: "2-4, 5-8" },
  
  // Mid-Winter Camps
  { id: '7', title: "Race Car to Code with VEX GO", type: "Mid-Winter Camp", gradeLevel: "K-2", featured: true },
  { id: '8', title: "RoboAthletes Olympics with VEX IQ", type: "Mid-Winter Camp", gradeLevel: "3-5" },
  { id: '9', title: "3D Design Beginner - Junior Maker", type: "Mid-Winter Camp", gradeLevel: "2-4, 5-8" },
  { id: '10', title: "RoboChamps: Intro to Python via VEX IQ", type: "Mid-Winter Camp", gradeLevel: "4-6" },
  { id: '11', title: "RoboChamps: Intro to C++ via VEX V5", type: "Mid-Winter Camp", gradeLevel: "6-8" },
  
  // Spring Camps
  { id: '12', title: "VEX GO Robotics Explorer", type: "Spring Camp", gradeLevel: "K-2", featured: true },
  { id: '13', title: "VEX IQ Robotics Explorer", type: "Spring Camp", gradeLevel: "3-5" },
  { id: '14', title: "VEX V5 Robotics Explorer", type: "Spring Camp", gradeLevel: "6-8" },
  { id: '15', title: "3D Design Beginner - Junior Maker", type: "Spring Camp", gradeLevel: "2-4, 5-8" },
  { id: '16', title: "RoboChamps: Intro to Python via VEX IQ", type: "Spring Camp", gradeLevel: "4-6" },
  { id: '17', title: "RoboChamps: Intro to C++ via VEX V5", type: "Spring Camp", gradeLevel: "6-8" },
];

const campTypes = ['Day Camp', 'Winter Camp', 'Mid-Winter Camp', 'Spring Camp'] as const;

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

export const AllCamps = () => {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredCamps = useMemo(() => {
    return allCamps.filter((camp) => {
      const matchesSearch = camp.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = !selectedType || camp.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [searchQuery, selectedType]);

  const campsByType = useMemo(() => {
    const grouped: Record<string, Camp[]> = {};
    campTypes.forEach((type) => {
      grouped[type] = filteredCamps.filter((camp) => camp.type === type);
    });
    return grouped;
  }, [filteredCamps]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedType(null);
  };

  const hasActiveFilters = searchQuery || selectedType;

  if (!mounted) {
    return (
      <div className="min-h-screen">
        <section className="container mx-auto px-4 py-12 md:py-20">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Camps
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-2">
              VEX Robotics | 3D Modeling and Printing | Coding
            </p>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mt-6">
              Turn winter break into a tech adventure! Build, code, and create with robotics and 3D design.
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Camps
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-2">
            VEX Robotics | 3D Modeling and Printing | Coding
          </p>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mt-6">
            Turn winter break into a tech adventure! Build, code, and create with robotics and 3D design.
          </p>
        </div>

        {/* Search and Filter Section */}
        <div className="max-w-6xl mx-auto mb-12">
          <div className="bg-muted/50 rounded-lg p-6 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search camps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Filter by:</span>
              </div>
              
              {/* Type Filter */}
              <div className="flex flex-wrap gap-2">
                {campTypes.map((type) => (
                  <Button
                    key={type}
                    variant={selectedType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedType(selectedType === type ? null : type)}
                    className="h-8"
                  >
                    {type}
                  </Button>
                ))}
              </div>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8 ml-auto"
                >
                  Clear Filters
                </Button>
              )}
            </div>

            {/* Results Count */}
            <div className="text-sm text-muted-foreground">
              Showing {filteredCamps.length} of {allCamps.length} camps
            </div>
          </div>
        </div>

        {/* Camps by Type */}
        {campTypes.map((type) => {
          const camps = campsByType[type];
          if (camps.length === 0) return null;

          return (
            <div key={type} className="max-w-6xl mx-auto mb-16">
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl md:text-3xl font-bold">
                  {type}
                </h2>
                <Badge variant="secondary" className="text-sm">
                  {camps.length} {camps.length === 1 ? 'camp' : 'camps'}
                </Badge>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {camps.map((camp) => (
                  <Card
                    key={camp.id}
                    className={`flex flex-col hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${
                      camp.featured ? 'ring-2 ring-primary/20' : ''
                    }`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Badge
                          variant="outline"
                          className={`${getTypeColor(camp.type)} border text-xs`}
                        >
                          {camp.type}
                        </Badge>
                        {camp.featured && (
                          <Badge variant="outline" className="border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-400">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Featured
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg leading-tight min-h-[3rem]">
                        {camp.title}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        Grades {camp.gradeLevel}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                      <div className="mt-auto pt-4">
                        <Button
                          variant="ghost"
                          className="w-full justify-between group"
                          asChild
                        >
                          <a
                            href={camp.slug ? `/camps/${camp.slug}` : "https://www.blazeroboticsacademy.org/winter-camps"}
                            {...(camp.slug ? {} : { target: "_blank", rel: "noreferrer noopener" })}
                          >
                            Learn More
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}

        {/* No Results */}
        {filteredCamps.length === 0 && (
          <div className="max-w-2xl mx-auto text-center py-16">
            <p className="text-xl text-muted-foreground mb-4">
              No camps found matching your criteria.
            </p>
            <Button onClick={clearFilters} variant="outline">
              Clear Filters
            </Button>
          </div>
        )}

        {/* CTA Section */}
        <div className="max-w-4xl mx-auto mt-20 mb-12">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl md:text-3xl mb-2">
                Ready to Join a Camp?
              </CardTitle>
              <CardDescription className="text-base">
                Explore our comprehensive camp programs designed for students from K-8
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <a href="https://www.blazeroboticsacademy.org/winter-camps" target="_blank" rel="noreferrer noopener">
                  Enroll Now
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="/#camps">
                  View Featured Camps
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

