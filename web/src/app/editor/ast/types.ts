export type LyricsDocument = {
  type: 'doc';
  meta?: {
    languages?: string[];
  };
  blocks: Block[];
};

export type Block = LineBlock;

export type LineBlock = {
  type: 'line';
  time?: {
    startMs: number;
    endMs?: number;
  };
  children: Inline[];
};

export type Inline = TextInline | RubyInline;

export type TextInline = {
  type: 'text';
  text: string;
};

export type RubyInline = {
  type: 'ruby';
  base: string;
  ruby: string;
};
