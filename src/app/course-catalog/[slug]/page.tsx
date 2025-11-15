
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CourseDetail } from "@/components/CourseDetail";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  return [
    { slug: 'rq-go-mars' },
    { slug: 'rq-go-intro' },
  ];
}

// Course data - in a real app, this would come from a CMS or database
const courseData: Record<string, any> = {
  "rq-go-mars": {
    title: "RoboQuest: Mars Math with VEX GO",
    type: "RoboQuest",
    gradeLevel: "1-3",
    status: "Coming Soon",
    description: "Join us for an exciting and challenging experience in our VEX GO Mars Math! In this robotics course, students will take their skills to the next level as they design, build, and program their Hero Robots to complete real-world challenges inspired by the Mars 2020 mission. Through a series of competition-based labs, students will practice critical skills in driving, building, and problem-solving as they work to collect samples, rescue rovers, and lift rocket ships. This course is ideal for students ready to apply their knowledge in a competitive environment, pushing the limits of their creativity and engineering abilities.",
    targetStudents: "This course is ideal for curious and creative learners who enjoy building, experimenting, and solving challenges. Whether they're budding engineers or simply fascinated by how things work, students with a love for hands-on activities and an interest in STEM concepts will thrive in this course. Prior experience with robotics or VEX GO is recommended but not required, as students will be building on foundational skills.",
    learningOutcomes: [
      "Hands-on experience in robot driving, building, and programming through real-world tasks such as collecting samples, rescuing a rover, lifting a rocket, and moving fuel cells",
      "Develop critical problem-solving and teamwork skills as they compete in the Mars Math Expedition Competition",
      "Gain practical knowledge in robotics competition strategy, learning how to optimize their robot's performance and complete challenges efficiently"
    ],
    image: "/growth-details-cover-1.png" // Placeholder - you'll need to add actual images
  },
  "rq-go-intro": {
    title: "RoboQuest: Introduction to Robotics with VEX GO",
    type: "RoboQuest",
    gradeLevel: "K-2",
    status: "View Available Sessions",
    description: "Welcome to RoboQuests: Introduction to Robotics with VEX GO, an exciting and playful 10-week course designed specifically for our youngest learners in grades K-2. This course introduces children to the fundamentals of robotics in a fun and engaging way, using the VEX GO platform. Through interactive activities and imaginative projects, students will explore basic robotics concepts, build simple robots, and learn the basics of programming — all while developing a love for STEM.",
    targetStudents: "This course is ideal for curious and creative learners who enjoy building, experimenting, and solving challenges. Whether they're budding engineers or simply fascinated by how things work, students with a love for hands-on activities and an interest in STEM concepts will thrive in this course. No prior experience with robotics or VEX GO is required, making it accessible to all skill levels.",
    learningOutcomes: [
      "Explore the exciting world of robotics through hands-on experiences in building, programming, and driving robots",
      "Build different robots or robot parts in each class, exploring various mechanisms and how they function within the robotics field",
      "Engage in creative projects, tackle real-world challenges, and learn from robotics engineers",
      "Develop problem-solving skills and spark creativity within the field of robotics through project-based learning"
    ],
    image: "/growth-details-cover-1.png" // Placeholder - you'll need to add actual images
  }
};

export default async function CoursePage({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  const { slug } = await params;
  const course = courseData[slug];

  if (!course) {
    notFound();
  }

  return (
    <>
      <Navbar />
      <CourseDetail course={course} />
      <Footer />
    </>
  );
}

