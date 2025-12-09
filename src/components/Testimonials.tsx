"use client";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface TestimonialProps {
  image: string;
  name: string;
  userName: string;
  comment: string;
}

const testimonials: TestimonialProps[] = [
  {
    image: "https://github.com/shadcn.png",
    name: "Mom of Sofia",
    userName: "@linda_sofia",
    comment: "Seeing Sophie's transformation during her time with Team 838G has been a profound experience for us. From a shy 3rd grader to a confident team player who's now comfortable collaborating with students from around the world, her progress has been remarkable. This program has opened up a world of possibilities for her, far beyond my expectations.",
  },
  {
    image: "https://github.com/shadcn.png",
    name: "Dave Wang",
    userName: "@dave_wang",
    comment:
    "Being part of Team 938X has been an amazing adventure. The opportunity to compete at the world championship stage was a dream come true for us. It's not just about the robots; it's about pushing our limits, learning from failures, and coming back stronger. This experience has taught us the true meaning of perseverance and innovation.",
  },

  {
    image: "https://github.com/shadcn.png",
    name: "Team 938 X.",
    userName: "@spencer_y",
    comment:
      "Being part of Team 938X has been an amazing adventure. The opportunity to compete at the world championship stage was a dream come true for us. It's not just about the robots; it's about pushing our limits, learning from failures, and coming back stronger. This experience has taught us the true meaning of perseverance and innovation.",
  },
];

export const Testimonials = () => {
  return (
    <section
      id="testimonials"
      className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-24 sm:py-32"
    >
      <h2 className="text-3xl md:text-4xl font-bold pb-8">
        How{" "}
        <span className="inline bg-gradient-to-b from-primary/60 to-primary bg-clip-text">
          People Love
        </span>{" "}
        Blaze Robotics Academy
      </h2>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 sm:block columns-2  lg:columns-3 lg:gap-6 mx-auto space-y-4 lg:space-y-6">
        {testimonials.map(
          ({ image, name, userName, comment }: TestimonialProps) => (
            <Card
              key={userName}
              className="max-w-md md:break-inside-avoid overflow-hidden"
            >
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <Avatar>
                  <AvatarImage
                    alt={name}
                    src={image}
                  />
                  <AvatarFallback>
                    {name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex flex-col">
                  <CardTitle className="text-lg">{name}</CardTitle>
                  <CardDescription>{userName}</CardDescription>
                </div>
              </CardHeader>

              <CardContent>{comment}</CardContent>
            </Card>
          )
        )}
      </div>
    </section>
  );
};