'use client'
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AllCourses } from "@/components/AllCourses";

export default function CourseCatalogPage() {
  return (
    <>
      <Navbar />
      <AllCourses />
      <Footer />
    </>
  );
}

