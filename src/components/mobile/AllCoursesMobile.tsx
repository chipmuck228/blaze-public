'use client'

import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, ArrowRight, Sparkles, MapPin, X, Loader2 } from "lucide-react";
import Image from "next/image";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { PullToRefreshIndicator } from "@/components/mobile/PullToRefreshIndicator";
import { Skeleton } from "@/components/ui/skeleton";

interface Course {
  id: string;
  title: string;
  type: 'RoboQuest' | 'LaunchPad' | 'RoboChamps';
  gradeLevel: string;
  slug?: string;
  featured?: boolean;
  poster_url?: string | null;
}

interface Franchise {
  id: string;
  code: string;
  name: string;
}

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

export const AllCoursesMobile = () => {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [isLoadingFranchises, setIsLoadingFranchises] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const franchise = searchParams.get("franchise");

  const fetchCourses = async (pageNum: number = 1, reset: boolean = false) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (franchise) params.append('franchise', franchise);
      if (searchQuery) params.append('search', searchQuery);
      if (selectedType) params.append('type', selectedType);
      if (selectedGrade) params.append('grade', selectedGrade);
      params.append('page', pageNum.toString());
      params.append('limit', '20');

      const res = await fetch(`/api/courses?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load courses");
      }
      const data = await res.json();
      
      if (reset) {
        setCourses(data.courses || []);
      } else {
        setCourses(prev => [...prev, ...(data.courses || [])]);
      }
      
      setHasMore((data.courses || []).length === 20);
    } catch (err: any) {
      console.error("Error fetching courses:", err);
      setError(err.message || "Failed to load courses");
    } finally {
      setIsLoading(false);
    }
  };

  // 下拉刷新
  const { elementRef, isRefreshing, pullProgress } = usePullToRefresh({
    onRefresh: async () => {
      setPage(1);
      await fetchCourses(1, true);
    },
    enabled: true,
  });

  // 无限滚动
  const { isLoading: isLoadingMore } = useInfiniteScroll({
    onLoadMore: async () => {
      if (!isLoading && hasMore) {
        const nextPage = page + 1;
        setPage(nextPage);
        await fetchCourses(nextPage, false);
      }
    },
    hasMore,
    enabled: true,
  });

  // 获取 franchises
  useEffect(() => {
    const fetchFranchises = async () => {
      try {
        setIsLoadingFranchises(true);
        const res = await fetch("/api/public/franchises");
        if (!res.ok) {
          throw new Error("Failed to load franchises");
        }
        const data = await res.json();
        setFranchises(data || []);
      } catch (err: any) {
        console.error("Error fetching franchises:", err);
      } finally {
        setIsLoadingFranchises(false);
      }
    };
    fetchFranchises();
  }, []);

  // 初始加载
  useEffect(() => {
    fetchCourses(1, true);
  }, [franchise]);

  // 搜索和筛选变化时重新加载
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchCourses(1, true);
    }, 300); // 防抖

    return () => clearTimeout(timer);
  }, [searchQuery, selectedType, selectedGrade]);

  // 设置下拉刷新的 ref
  useEffect(() => {
    if (scrollContainerRef.current && elementRef) {
      elementRef.current = scrollContainerRef.current;
    }
  }, [elementRef]);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      if (searchQuery && !course.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (selectedType && course.type !== selectedType) {
        return false;
      }
      if (selectedGrade && course.gradeLevel !== selectedGrade) {
        return false;
      }
      return true;
    });
  }, [courses, searchQuery, selectedType, selectedGrade]);

  return (
    <div className="min-h-screen bg-background">
      {/* 搜索和筛选栏 */}
      <div className="sticky top-0 z-10 bg-background border-b border-border p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {/* 筛选器 */}
        {showFilters && (
          <div className="grid grid-cols-2 gap-2">
            <Select value={selectedType || ""} onValueChange={(value) => setSelectedType(value || null)}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="RoboQuest">RoboQuest</SelectItem>
                <SelectItem value="LaunchPad">LaunchPad</SelectItem>
                <SelectItem value="RoboChamps">RoboChamps</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedGrade || ""} onValueChange={(value) => setSelectedGrade(value || null)}>
              <SelectTrigger>
                <SelectValue placeholder="All Grades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Grades</SelectItem>
                <SelectItem value="K-2">K-2</SelectItem>
                <SelectItem value="3-5">3-5</SelectItem>
                <SelectItem value="6-8">6-8</SelectItem>
                <SelectItem value="9-11">9-11</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* 活动筛选标签 */}
        {(selectedType || selectedGrade) && (
          <div className="flex flex-wrap gap-2">
            {selectedType && (
              <Badge variant="secondary" className="gap-1">
                {selectedType}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setSelectedType(null)}
                />
              </Badge>
            )}
            {selectedGrade && (
              <Badge variant="secondary" className="gap-1">
                {selectedGrade}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setSelectedGrade(null)}
                />
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* 课程列表 */}
      <div
        ref={scrollContainerRef}
        className="relative"
        style={{ minHeight: 'calc(100vh - 200px)' }}
      >
        <PullToRefreshIndicator
          pullProgress={pullProgress}
          isRefreshing={isRefreshing}
        />

        {error ? (
          <div className="p-4 text-center text-destructive">
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => fetchCourses(1, true)}
            >
              Retry
            </Button>
          </div>
        ) : isLoading && filteredCourses.length === 0 ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p>No courses found</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {filteredCourses.map((course) => (
              <Card
                key={course.id}
                className="cursor-pointer hover:shadow-md transition-shadow active:scale-95"
                onClick={() => router.push(`/course-catalog/${course.slug || course.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="relative w-24 h-24 bg-muted rounded-lg overflow-hidden shrink-0">
                      {course.poster_url ? (
                        <Image
                          src={course.poster_url}
                          alt={course.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                          <Sparkles className="h-8 w-8 text-primary/40" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm line-clamp-2">
                          {course.title}
                        </h3>
                        {course.featured && (
                          <Badge variant="default" className="shrink-0">
                            Featured
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className={getTypeColor(course.type)}>
                          {course.type}
                        </Badge>
                        <Badge variant="secondary">{course.gradeLevel}</Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/course-catalog/${course.slug || course.id}`);
                        }}
                      >
                        View Details
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* 加载更多指示器 */}
            {isLoadingMore && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {!hasMore && filteredCourses.length > 0 && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No more courses to load
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

