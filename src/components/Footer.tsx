'use client'
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
                className="text-primary transition-all border-primary hover:border-b-2"
              >
                Blaze Robotics Academy
              </a>
            </div>
          </div>

          {/* Right side: Follow US and About in horizontal layout */}
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 shrink-0">
          {/* Follow US */}
          <div className="flex flex-col gap-2 shrink-0">
            <h3 className="font-bold text-lg">Follow US</h3>
            <div>
              <a
                rel="noreferrer noopener"
                href="#"
                className="opacity-60 hover:opacity-100 flex items-center gap-2"
              >
                <FacebookIcon />
                Facebook
              </a>
            </div>

            <div>
              <a
                rel="noreferrer noopener"
                href="#"
                className="opacity-60 hover:opacity-100 flex items-center gap-2"
              >
                <InstagramIcon />
                Instagram
              </a>
            </div>

            <div>
              <a
                rel="noreferrer noopener"
                href="#"
                className="opacity-60 hover:opacity-100 flex items-center gap-2"
              >
                <YoutubeIcon />
                Youtube
              </a>
            </div>

            <div>
              <a
                rel="noreferrer noopener"
                href="#"
                className="opacity-60 hover:opacity-100 flex items-center gap-2"
              >
                <XiaohongshuIcon />
                Xiaohongshu
              </a>
            </div>
          </div>

          {/* About */}
          <div className="flex flex-col gap-2 shrink-0">
            <h3 className="font-bold text-lg">About</h3>
            <div>
              <a
                rel="noreferrer noopener"
                href="/teacher-portal/login"
                className="opacity-60 hover:opacity-100"
              >
                Teacher Portal
              </a>
            </div>

            <div>
              <a
                rel="noreferrer noopener"
                href="/about#careers"
                className="opacity-60 hover:opacity-100"
              >
                Careers
              </a>
            </div>

            <div>
              <a
                rel="noreferrer noopener"
                href="#"
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