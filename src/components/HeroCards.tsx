'use client'
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Check, Linkedin } from "lucide-react";
import { LightBulbIcon, YoutubeIcon, FacebookIcon, XiaohongshuIcon } from "./Icons";
import { InstagramLogoIcon } from "@radix-ui/react-icons";

export const HeroCards = () => {
  return (
    <div className="hidden lg:flex flex-row flex-wrap gap-8 relative w-[700px] h-[550px]">
      {/* Testimonial */}
      <Card className="absolute w-[340px] -top-[15px] drop-shadow-xl shadow-black/10 dark:shadow-white/10">
        <CardHeader className="flex flex-row items-center gap-4 pb-2">
          <Avatar>
            <AvatarImage
              alt=""
              src="https://github.com/shadcn.png"
            />
            <AvatarFallback>SH</AvatarFallback>
          </Avatar>

          <div className="flex flex-col">
            <CardTitle className="text-lg">John Doe</CardTitle>
            <CardDescription>@john_doe</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="text-sm">Awesome! A great program for kids to learn about robotics and coding.</CardContent>
      </Card>

      {/* Team */}
      <Card className="absolute right-[20px] top-4 w-80 flex flex-col justify-center items-center drop-shadow-xl shadow-black/10 dark:shadow-white/10">
        <CardHeader className="mt-8 flex justify-center items-center pb-2">
          <img
            src="https://i.pravatar.cc/150?img=58"
            alt="user avatar"
            className="absolute grayscale-[0%] -top-12 rounded-full w-24 h-24 aspect-square object-cover"
          />
          <CardTitle className="text-center">Leo Miranda</CardTitle>
          <CardDescription className="font-normal text-primary">
            Director of Blaze Robotics Academy
          </CardDescription>
        </CardHeader>

        <CardContent className="text-center pb-2">
          <p>
            I really enjoy helping kids learn about robotics and coding.
          </p>
        </CardContent>

        <CardFooter>
          <div>
            <Button
              variant="ghost"
              size="sm"
              asChild
            >
              <a
                rel="noreferrer noopener"
                href="https://instagram.com/leoMirandaa"
                target="_blank"
              >
                <InstagramLogoIcon className="w-5 h-5" />
              </a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              asChild
            >
              <a
                rel="noreferrer noopener"
                href="https://facebook.com/leoMirandaa"
                target="_blank"
              >
                <FacebookIcon className="w-5 h-5" />
              </a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              asChild
            >
              <a
                rel="noreferrer noopener"
                href="https://youtube.com/leo_mirand4"
                target="_blank"
              >
                <YoutubeIcon className="w-5 h-5" />
              </a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              asChild
            >
              <a
                rel="noreferrer noopener"
                href="https://xiaohongshu.com/in/leopoldo-miranda/"
                target="_blank"
              >
                <XiaohongshuIcon className="w-5 h-5" />
              </a>
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Pricing */}
      <Card className="absolute top-[150px] left-[50px] w-72  drop-shadow-xl shadow-black/10 dark:shadow-white/10">
        <CardHeader>
          <CardTitle className="flex item-center justify-between">
            RoboChamps
            <Badge
              variant="secondary"
              className="text-sm text-primary"
            >
              
            </Badge>
          </CardTitle>
          <div>
            <span className="text-2xl font-bold">Mastery Lifts & Arms with VEX IQ.</span>
          </div>

          <CardDescription>
          10-weeks/Grade Level: 3-5, 6-8
          
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Button variant={"destructive"} className="w-full">Enroll Now</Button>
        </CardContent>

        <hr className="w-4/5 m-auto mb-4" />

        <CardFooter className="flex">
          <div className="space-y-2">
            {["Master", "Build","Design", "Problem Solving", "Teamwork"].map(
              (benefit: string) => (
                <span
                  key={benefit}
                  className="flex items-center"
                >
                  <Check className="text-green-400" size={16} />{" "}
                  <h4 className="ml-2 text-sm">{benefit}</h4>
                </span>
              )
            )}
          </div>
        </CardFooter>
      </Card>

      {/* Service */}
      <Card className="absolute w-[350px] -right-[10px] bottom-[35px]  drop-shadow-xl shadow-black/10 dark:shadow-white/10">
        <CardHeader className="space-y-1 flex md:flex-row justify-start items-start gap-4">
          <div className="mt-1 bg-primary/20 p-1 rounded-2xl">
            <LightBulbIcon />
          </div>
          <div>
            <CardTitle>Champion Robotics Team</CardTitle>
            <CardDescription className="text-sm mt-2">
              We are a team of students who are passionate about robotics and coding. We are always looking for new challenges and opportunities to learn.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
};