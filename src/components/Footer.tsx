'use client'
import { BlazeLogoIcon } from "./Icons";
import { FacebookIcon, InstagramIcon, YoutubeIcon, XiaohongshuIcon } from "./Icons";
import { ExternalLink } from "lucide-react";

export const Footer = () => {
  return (
    <footer id="footer">
      <hr className="w-11/12 mx-auto" />

      <section className="container mx-auto px-4 py-20">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
          {/* Logo */}
          <div className="shrink-0">
            <a
              rel="noreferrer noopener"
              href="/"
              className="font-bold text-xl flex"
            >
              <BlazeLogoIcon />
            </a>
          </div>

          {/* Address Information */}
          <div className="flex flex-col gap-3 text-sm text-muted-foreground min-w-0 flex-1">
            <div>
              <p className="font-semibold text-foreground mb-1">Bellevue:</p>
              <div className="flex items-center gap-2">
                <p>1910 132nd Ave NE #7, Bellevue, WA 98005</p>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=1910+132nd+Ave+NE+%237,+Bellevue,+WA+98005"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-primary hover:text-primary/80 transition-colors"
                  aria-label="Open Bellevue location in Google Maps"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Bel-Red:</p>
              <div className="flex items-center gap-2">
                <p>12509 Bel-Red Rd #100, Bellevue, WA 98005</p>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=12509+Bel-Red+Rd+%23100,+Bellevue,+WA+98005"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-primary hover:text-primary/80 transition-colors"
                  aria-label="Open Bel-Red location in Google Maps"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Issaquah:</p>
              <div className="flex items-center gap-2">
                <p>1045 12th Ave NW #F-2, Issaquah, WA 98027</p>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=1045+12th+Ave+NW+%23F-2,+Issaquah,+WA+98027"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-primary hover:text-primary/80 transition-colors"
                  aria-label="Open Issaquah location in Google Maps"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
            <div className="mt-2">
              <a
                href="mailto:info@blazeroboticsacademy.org"
                className="hover:text-primary transition-colors"
              >
                info@blazeroboticsacademy.org
              </a>
            </div>
            <div>
              <a
                href="tel:425-610-8618"
                className="hover:text-primary transition-colors"
              >
                425-610-8618
              </a>
            </div>
          </div>

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
                href="#"
                className="opacity-60 hover:opacity-100"
              >
                Teacher Portal
              </a>
            </div>

            <div>
              <a
                rel="noreferrer noopener"
                href="#"
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
      </section>

      <section className="container mx-auto px-4 pb-14 text-center">
        <h3>
          &copy; 2025{" "}
          <a
            rel="noreferrer noopener"
            target="_blank"
            href="https://www.linkedin.com/in/leopoldo-miranda/"
            className="text-primary transition-all border-primary hover:border-b-2"
          >
            Blaze Robotics Academy
          </a>
        </h3>
      </section>
    </footer>
  );
};