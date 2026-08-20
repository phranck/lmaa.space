declare namespace App {
  interface Locals {
    /**
     * A policy the route built for itself, to be sent instead of the site's.
     *
     * @remarks
     * Astro builds the policy from `astro.config.mjs` and writes it over
     * whatever a route set, so a route that needs its own has to hand it to the
     * middleware, which runs after Astro and is the last place before the
     * response. The markdown widgets are the case this exists for: each one
     * embeds a different third party and therefore needs different sources.
     */
    contentSecurityPolicy?: string;
  }
}
