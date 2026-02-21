/**
 * Category images – all served locally from /public/images/.
 * No external requests to Unsplash or any other CDN.
 */

const LOCAL: Record<string, string> = {
  "3d-druck":               "/images/3d-druck.jpg",
  astronomie:               "/images/astronomie.jpg",
  fahrraeder:               "/images/fahrraeder.jpg",
  brettspiele:              "/images/brettspiele.jpg",
  buecher:                  "/images/buecher.jpg",
  cannabis:                 "/images/cannabis.jpg",
  klamotten:                "/images/klamotten.jpg",
  computer:                 "/images/computer.jpg",
  unterhaltungselektronik:  "/images/unterhaltungselektronik.jpg",
  "kosmetik-drogerie":      "/images/kosmetik-drogerie.jpg",
  "musik-foto-video":       "/images/musik-foto-video.jpg",
  allgemein:                "/images/allgemein.jpg",
  "gesundheit-apotheken":   "/images/gesundheit-apotheken.jpg",
  "babys-kinder":           "/images/babys-kinder.jpg",
  wohnen:                   "/images/wohnen.jpg",
  modellbau:                "/images/modellbau.jpg",
  ernaehrung:               "/images/ernaehrung.jpg",
  haustiere:                "/images/haustiere.jpg",
  "geschenke-kunst":        "/images/geschenke-kunst.jpg",
  refurbished:              "/images/refurbished.jpg",
  "erneuerbare-energien":   "/images/erneuerbare-energien.jpg",
  "retro-computer":         "/images/retro-computer.jpg",
  "smart-home":             "/images/smarthome.jpg",
  sport:                    "/images/sport.jpg",
  "schreibwaren-buero":     "/images/schreibwaren-buero.jpg",
  "werkzeuge-diy":          "/images/werkzeuge-diy.jpg",
};

const FALLBACK = "/images/allgemein.jpg";

/** Full-size hero image for the homepage */
export const heroImage = "/images/hero.jpg";

/** Full-width category page banner */
export function categoryHeroImage(slug: string): string {
  return LOCAL[slug] ?? FALLBACK;
}

/** Compact thumbnail for category cards */
export function categoryCardImage(slug: string): string {
  return LOCAL[slug] ?? FALLBACK;
}
