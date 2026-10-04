/** Editable case-study content. All media paths are served from public/assets. */
export interface CaseParagraph {
  source?: { label: string; href: string };
  mediaBefore?: CaseBlock;
  type: string;
  text: string;
  fontSize?: string;
  lineHeight?: string;
  color?: string;
  font?: string;
  weight?: number;
  letterSpacing?: string;
  strongPrefix?: string;
  highlights?: string[];
}

export interface CaseBlock {
  stats?: boolean;
  testimonial?: { quote: string; name: string; company: string };
  points?: { label: string; text: string }[];
  type: string;
  title?: string;
  navLabel?: string;
  paragraphs?: CaseParagraph[];
  outcome?: boolean;
  src?: string;
  wideSrc?: string;
  width?: number;
  height?: number;
  ratio?: number;
  fit?: string;
  radius?: number;
  border?: boolean;
  alt?: string;
  wideOrder?: number;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  items?: CaseBlock[];
}

export interface Project {
  productUrl?: string;
  slug: string;
  title: string;
  description: string;
  details?: { scope?: string; timeline?: string; team?: string; role?: string };
  intro: CaseParagraph[][];
  galleries: CaseBlock[][];
  related: { title: string; slug: string; image: string }[];
}
