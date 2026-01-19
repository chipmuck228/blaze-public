'use client'
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AllCamps } from "@/components/AllCamps";

export default function CampsPage() {
  return (
    <>
      <Navbar />
      <div className="pt-14">
        <AllCamps />
        <Footer />
      </div>
    </>
  );
}

