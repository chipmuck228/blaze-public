"use client";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Facebook, Instagram, Linkedin } from "lucide-react";
import { YoutubeIcon, XiaohongshuIcon, FacebookIcon, InstagramIcon } from "./Icons";

interface TeamProps {
  imageUrl: string;
  name: string;
  position: string;
  description: string;
  socialNetworks: SociaNetworkslProps[];
}

interface SociaNetworkslProps {
  name: string;
  url: string;
}

const teamList: TeamProps[] = [
  {
    imageUrl: "/Dave-W-1.png",
    name: "Dave W. 1",
    position: "Chef Coach",
    description: "Coach Dave is a distinguished VEX Robotics coach with extensive experience at Blaze Robotics Academy. Over three seasons, Dave has coached a total of 68 teams, with 44 teams making it to State Championships and 18 teams advancing to the Worlds Championship.",
    socialNetworks: [
      {
        name: "Youtube",
        url: "https://youtube.com/leopoldo-miranda/",
      },
      {
        name: "Facebook",
        url: "https://www.facebook.com/",
      },
      {
        name: "Instagram",
        url: "https://www.instagram.com/",
      },
    ],
  },
  {
    imageUrl: "/Max-K.png",
    name: "Max K.",
    position: "Senior Coach",
    description: "Coach Max brings extensive experience in robotics coaching, mentoring, and competition judging. having coached VEX, FRC, and FTC teams and developed VEX curriculum.",
    socialNetworks: [
      {
        name: "Youtube",
        url: "https://youtube.com/leopoldo-miranda/",
      },
      {
        name: "Facebook",
        url: "https://www.facebook.com/",
      },
      {
        name: "Instagram",
        url: "https://www.instagram.com/",
      },
      {
        name: "Xiaohongshu",
        url: "https://xiaohongshu.com/leopoldo-miranda/",
      },
    ],
  },
  {
    imageUrl: "/Daisy-D.png",
    name: "Daisy D.",
    position: "Senior Coach",
    description: "Coach Daisy holds both a Master’s and Bachelor’s degree in Information Management and Psychology from the University of Washington and is the holder of a national patent.",
    socialNetworks: [
      {
        name: "Facebook",
        url: "https://facebook.com/leopoldo-miranda/",
      },

      {
        name: "Instagram",
        url: "https://www.instagram.com/",
      },
    ],
  },
  {
    imageUrl: "/Randall-C.webp",
    name: "Randall C.",
    position: "Senior Coach",
    description: "Coach Daisy holds both a Master’s and Bachelor’s degree in Information Management and Psychology from the University of Washington and is the holder of a national patent.",
    socialNetworks: [
      {
        name: "Youtube",
        url: "https://youtube.com/leopoldo-miranda/",
      },
      {
        name: "Xiaohongshu",
        url: "https://xiaohongshu.com/leopoldo-miranda/",
      },

      {
        name: "Instagram",
        url: "https://www.instagram.com/",
      },
    ],
  },
  {
    imageUrl: "/Bowen-T.webp",
    name: "Bowen T.",
    position: "Senior Coach",
    description: "Coach Daisy holds both a Master’s and Bachelor’s degree in Information Management and Psychology from the University of Washington and is the holder of a national patent.",
    socialNetworks: [
      {
        name: "Youtube",
        url: "https://youtube.com/leopoldo-miranda/",
      },

      {
        name: "Instagram",
        url: "https://www.instagram.com/",
      },
    ],
  },
  {
    imageUrl: "/Chris-P.webp",
    name: "Chris P.",
    position: "Senior Coach",
    description: "Coach Daisy holds both a Master’s and Bachelor’s degree in Information Management and Psychology from the University of Washington and is the holder of a national patent.",
    socialNetworks: [
      {
        name: "Facebook",
        url: "https://facebook.com/leopoldo-miranda/",
      },

      {
        name: "Instagram",
        url: "https://www.instagram.com/",
      },
    ],
  },
  {
    imageUrl: "/Spencer-Y.webp",
    name: "Spencer Y.",
    position: "Senior Coach",
    description: "Coach Daisy holds both a Master’s and Bachelor’s degree in Information Management and Psychology from the University of Washington and is the holder of a national patent.",
    socialNetworks: [
      {
        name: "Facebook",
        url: "https://facebook.com/leopoldo-miranda/",
      },

      {
        name: "Instagram",
        url: "https://www.instagram.com/",
      },
    ],
  },
];

export const Team = () => {
  const socialIcon = (iconName: string) => {
    switch (iconName) {
      case "Linkedin":
        return <Linkedin size="20" />;

      case "Facebook":
        return <FacebookIcon className="w-5 h-5" />;

      case "Instagram":
        return <InstagramIcon className="w-5 h-5" />;
    
        case "Youtube":
        return <YoutubeIcon className="w-5 h-5" />;

      case "Xiaohongshu":
        return <XiaohongshuIcon className="w-5 h-5" />;
    }
  };

  return (
    <section
      id="team"
      className="container mx-auto px-4 py-24 sm:py-32"
    >
      <h2 className="text-3xl md:text-4xl font-bold text-center">
        <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
          
        </span>
        Our Dedicated{" "} Team
      </h2>

      <p className="mt-4 mb-10 text-xl text-muted-foreground text-center">
      
      </p>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 gap-y-10 justify-items-center max-w-5xl mx-auto">
        {teamList.map(
          ({ imageUrl, name, position, socialNetworks, description }: TeamProps) => (
            <Card
              key={name}
              className="bg-muted/50 relative mt-8 flex flex-col justify-center items-center"
            >
              <CardHeader className="mt-8 flex justify-center items-center pb-2">
                <Image
                  src={imageUrl}
                  alt={`${name} ${position}`}
                  width={96}
                  height={96}
                  className="absolute -top-12 rounded-full w-24 h-24 aspect-square object-cover"
                />
                <CardTitle className="text-center">{name}</CardTitle>
                <CardDescription className="text-primary">
                  {position}
                </CardDescription>
              </CardHeader>

              <CardContent className="text-center pb-2 text-sm">
                <p>{description}</p>
              </CardContent>

              <CardFooter className="flex justify-center gap-2">
                {socialNetworks.map(({ name, url }: SociaNetworkslProps) => (
                  <Button
                    key={name}
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <a
                      rel="noreferrer noopener"
                      href={url}
                      target="_blank"
                    >
                      {socialIcon(name)}
                    </a>
                  </Button>
                ))}
              </CardFooter>
            </Card>
          )
        )}
      </div>
    </section>
  );
};