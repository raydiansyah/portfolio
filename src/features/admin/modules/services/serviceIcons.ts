import {
  BarChart3, Code2, Compass, Globe, GraduationCap, Layers, Megaphone, Palette, Rocket, Server, Smartphone, Sparkles,
  type LucideIcon,
} from 'lucide-react'

/** Curated lucide icons a service can use; `services.icon` stores the key. Explicit map keeps the bundle tree-shaken. */
export const SERVICE_ICONS: Record<string, LucideIcon> = {
  Globe, Sparkles, GraduationCap, Compass, Code2, Smartphone, Palette, Server, Rocket, BarChart3, Megaphone, Layers,
}

export const iconFor = (name: string): LucideIcon => SERVICE_ICONS[name] ?? Layers
