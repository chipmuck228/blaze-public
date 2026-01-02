"use client";
import { useEffect, useState } from "react";
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
import { Facebook, Instagram, Linkedin, Loader2 } from "lucide-react";
import { YoutubeIcon, XiaohongshuIcon, FacebookIcon, InstagramIcon } from "./Icons";

interface TeamProps {
  id: string;
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

interface TeamMember {
  id: string;
  image_url: string;
  name: string;
  position: string;
  description: string;
  social_networks: Array<{
    id: string;
    name: string;
    url: string;
  }>;
}

// 默认团队数据（作为后备）
const teamList: TeamProps[] = [
  {
    id: "default-dave-w-1",
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
    id: "default-max-k",
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
    id: "default-daisy-d",
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
    id: "default-randall-c",
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
    id: "default-bowen-t",
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
    id: "default-chris-p",
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
];

export const Team = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/teams");
      
      if (!response.ok) {
        throw new Error("Failed to fetch team members");
      }

      const data = await response.json();
      setTeamMembers(data);
    } catch (err) {
      console.error("Error fetching team members:", err);
      setError("Failed to load team members");
      // 如果加载失败，使用默认数据
      setTeamMembers(teamList.map(team => ({
        id: team.id,
        image_url: team.imageUrl,
        name: team.name,
        position: team.position,
        description: team.description,
        social_networks: team.socialNetworks.map((sn, idx) => ({
          id: `${team.id}-${idx}`,
          name: sn.name,
          url: sn.url,
        })),
      })));
    } finally {
      setIsLoading(false);
    }
  };

  // 转换数据库格式到组件格式
  const teamListToDisplay: TeamProps[] = teamMembers.map(member => ({
    id: member.id,
    imageUrl: member.image_url,
    name: member.name,
    position: member.position,
    description: member.description,
    socialNetworks: member.social_networks.map(sn => ({
      name: sn.name,
      url: sn.url,
    })),
  }));

  // 如果没有数据，使用默认数据
  const displayList = teamListToDisplay.length > 0 ? teamListToDisplay : teamList;
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
      className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-16 sm:py-24"
    >
      <h2 className="text-3xl md:text-4xl font-bold text-center">
        <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
          
        </span>
        Our Dedicated{" "} Team
      </h2>

      <p className="mt-4 mb-10 text-xl text-muted-foreground text-center">
      
      </p>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-muted-foreground">
          {error}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 gap-y-10 max-w-5xl mx-auto">
          {displayList.map(
          ({ id, imageUrl, name, position, socialNetworks, description }: TeamProps) => (
            <Card
              key={id}
              className="bg-muted/50 relative mt-8 flex flex-col h-full w-full"
            >
              <CardHeader className="mt-8 flex flex-col justify-center items-center pb-2 flex-shrink-0">
                <Image
                  src={imageUrl}
                  alt={`${name} ${position}`}
                  width={96}
                  height={96}
                  className="absolute -top-12 rounded-full w-24 h-24 aspect-square object-cover"
                  loading="lazy"
                  placeholder="blur"
                  blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNDgiIGN5PSI0OCIgcj0iNDgiIGZpbGw9IiNlNWU3ZWIiLz48L3N2Zz4="
                />
                <CardTitle className="text-center">{name}</CardTitle>
                <CardDescription className="text-primary">
                  {position}
                </CardDescription>
              </CardHeader>

              <CardContent className="text-center pb-2 text-sm flex-1 flex flex-col justify-center min-h-[100px] px-4">
                <p className="line-clamp-4 leading-relaxed">{description}</p>
              </CardContent>

              <CardFooter className="flex justify-center gap-2 flex-shrink-0 pt-4 pb-4">
                {socialNetworks.map(({ name, url }: SociaNetworkslProps, index) => (
                  <Button
                    key={`${id}-${name}-${index}`}
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
      )}
    </section>
  );
};