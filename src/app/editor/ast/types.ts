export type LyricsDocument = {
  type: "doc";
  meta?: {
    languages?: string[];
  };
  blocks: Block[];
};

export type Block = LineBlock | ParagraphBlock;

export type LineBlock = {
  type: "line";
  time: {
    startMs: number;
    endMs?: number;
  };
  children: Inline[];
};

export type ParagraphBlock = {
  type: "p";
  children: Inline[];
};

export type Inline =
  | TextInline
  | RubyInline
  | EmInline
  | StrongInline
  | AnnotationInline
  | BreakInline;

export type TextInline = {
  type: "text";
  text: string;
};

export type RubyInline = {
  type: "ruby";
  base: string;
  ruby: string;
};

export type EmInline = {
  type: "em";
  children: Inline[];
};

export type StrongInline = {
  type: "strong";
  children: Inline[];
};

export type AnnotationInline = {
  type: "annotation";
  text: string;
  note: string;
};

export type BreakInline = {
  type: "br";
};
