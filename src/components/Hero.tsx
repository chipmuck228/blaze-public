'use client'
import { Button } from "./ui/button";
import { HeroCards } from "./HeroCards";

export const Hero = () => {
  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl flex flex-col items-center py-20 md:py-32 gap-10 overflow-x-hidden">
      <div className="text-center space-y-6 w-full">
        <main className="text-5xl md:text-6xl font-bold">
          <h1 className="inline">
            <span className="inline bg-gradient-to-r from-[#F596D3]  to-[#D247BF] text-transparent bg-clip-text">
              BlazeRobotics
            </span>{" "}
          </h1>{" "}
          <br />
          <h2 className="inline">
            <span className="inline bg-gradient-to-r from-[#61DAFB] via-[#1fc0f1] to-[#03a3d7] text-transparent bg-clip-text">
              From Imagination
            </span>{" "}
            To Innovation
          </h2>
        </main>

        <p className="text-xl text-muted-foreground md:w-10/12 mx-auto">
          Blaze your trail with robotics
        </p>

        <div className="space-y-4 md:space-y-0 md:space-x-4">
          <Button variant="default" size="lg">Enroll Now</Button>
        </div>
      </div>

      {/* Hero cards sections */}
      <div className="z-10 w-full overflow-hidden">
        <HeroCards />
      </div>

      {/* Shadow effect */}
      <div className="shadow"></div>
    </section>
  );
};