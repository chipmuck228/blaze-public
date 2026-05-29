'use client'
import { ExternalLink } from "lucide-react";
import { BlazeLogoIcon } from "./Icons";
import { FacebookIcon, InstagramIcon, YoutubeIcon, XiaohongshuIcon } from "./Icons";

export const Footer = () => {
  return (
    <footer id="footer">
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-10 border-t border-border">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start justify-between">
          {/* Logo */}
          <div className="shrink-0 flex flex-col gap-4">
            <a
              rel="noreferrer noopener"
              href="/"
              className="font-bold text-xl flex"
            >
              <BlazeLogoIcon />
            </a>
            {/* Copyright */}
            <div className="text-sm text-muted-foreground pl-4">
              &copy; 2025{" "}
              <a
                rel="noreferrer noopener"
                target="_blank"
                href="https://www.blazeroboticsacademy.org/"
                className="text-primary transition-all border-primary hover:border-b-2 inline-flex items-center gap-1"
              >
                Blaze Robotics Academy
                <ExternalLink className="w-3.5 h-3.5 opacity-70" aria-hidden />
              </a>
            </div>
          </div>

          {/* Right side: Follow US, Resources, and About */}
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 shrink-0">
          {/* Follow US */}
          <div className="flex flex-col gap-2 shrink-0">
            <h3 className="font-bold text-lg">Follow US</h3>
            <div>
              <a
                rel="noreferrer noopener"
                target="_blank"
                href="https://www.facebook.com/BlazeEdu/"
                className="opacity-60 hover:opacity-100 flex items-center gap-2"
              >
                <FacebookIcon />
                Facebook
                <ExternalLink className="w-3.5 h-3.5 opacity-70 shrink-0" aria-hidden />
              </a>
            </div>

            <div>
              <a
                rel="noreferrer noopener"
                target="_blank"
                href="https://www.instagram.com/blaze_robotics/"
                className="opacity-60 hover:opacity-100 flex items-center gap-2"
              >
                <InstagramIcon />
                Instagram
                <ExternalLink className="w-3.5 h-3.5 opacity-70 shrink-0" aria-hidden />
              </a>
            </div>

            <div>
              <a
                rel="noreferrer noopener"
                target="_blank"
                href="https://www.youtube.com/@BlazeRoboticsAcademy"
                className="opacity-60 hover:opacity-100 flex items-center gap-2"
              >
                <YoutubeIcon />
                Youtube
                <ExternalLink className="w-3.5 h-3.5 opacity-70 shrink-0" aria-hidden />
              </a>
            </div>

            <div>
              <a
                rel="noreferrer noopener"
                target="_blank"
                href="https://www.xiaohongshu.com/user/profile/5dd69d76000000000100af94?xsec_token=ABGyBANRXA9VJZXgMt0kwTUCrTxvBRs7nCQQsKIEUcPJ4%3D&xsec_source=pc_search"
                className="opacity-60 hover:opacity-100 flex items-center gap-2"
              >
                <XiaohongshuIcon />
                Xiaohongshu
                <ExternalLink className="w-3.5 h-3.5 opacity-70 shrink-0" aria-hidden />
              </a>
            </div>
          </div>

          {/* Resources */}
          <div className="flex flex-col gap-2 shrink-0">
            <h3 className="font-bold text-lg">Resources</h3>
            <div>
              <a
                rel="noreferrer noopener"
                href="/resources"
                className="opacity-60 hover:opacity-100"
              >
                Resource Library
              </a>
            </div>
            <div>
              <a
                rel="noreferrer noopener"
                href="/teacher-portal/login"
                className="opacity-60 hover:opacity-100"
              >
                Teacher Portal
              </a>
            </div>
          </div>

          {/* About */}
          <div className="flex flex-col gap-2 shrink-0">
            <h3 className="font-bold text-lg">About</h3>

            <div>
              <a
                rel="noreferrer noopener"
                href="/about/careers"
                className="opacity-60 hover:opacity-100"
              >
                Careers
              </a>
            </div>

            <div>
              <a
                rel="noreferrer noopener"
                href="/calendar"
                className="opacity-60 hover:opacity-100"
              >
                Calendar
              </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </footer>
  );
};