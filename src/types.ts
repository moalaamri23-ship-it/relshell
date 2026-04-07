export type AccentColor = 'blue' | 'amber' | 'emerald' | 'red' | 'purple' | 'slate';

export interface AppConfig {
  id: string;
  name: string;
  url: string;
  description: string;
  accent: AccentColor;
}
