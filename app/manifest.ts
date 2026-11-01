import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Judo Beskydy – správa klubu",
    short_name: "Judo Beskydy",
    description: "Členové, akce, přihlášky a výsledky klubu Judo Beskydy.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#a4161a",
    lang: "cs",
  };
}
