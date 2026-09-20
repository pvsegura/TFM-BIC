import type { ContentResponse } from "@tfm-bic/contracts";
import type { ReactNode } from "react";

type ContentBlock = ContentResponse["blocks"][number];

/** How to mark up text in the language being learned. `direction` is optional:
 * without it the browser decides (`dir="auto"`) — never a hardcoded `ltr`. */
export interface LearningLanguage {
  locale: string;
  direction?: "ltr" | "rtl" | undefined;
}

export interface ContentBlocksProps {
  blocks: readonly ContentBlock[];
  language: LearningLanguage | undefined;
  /** Language the explanations and translations are written in. */
  instructionLanguage: string;
}

function LearningText({
  language,
  children,
}: {
  language: LearningLanguage | undefined;
  children: ReactNode;
}) {
  return (
    <span lang={language?.locale} dir={language?.direction ?? "auto"}>
      {children}
    </span>
  );
}

interface BlockProps<T extends ContentBlock> {
  block: T;
  language: LearningLanguage | undefined;
  instructionLanguage: string;
}

function ExplanationView({
  block,
  instructionLanguage,
}: BlockProps<Extract<ContentBlock, { type: "explanation" }>>) {
  return <p lang={instructionLanguage}>{block.text}</p>;
}

function ExampleView({
  block,
  language,
  instructionLanguage,
}: BlockProps<Extract<ContentBlock, { type: "example" }>>) {
  return (
    <div className="rounded-lg bg-primary/5 px-4 py-3 dark:bg-surface/10">
      <p className="text-lg font-medium">
        <LearningText language={language}>{block.text}</LearningText>
      </p>
      <p lang={instructionLanguage} className="text-primary/80 dark:text-surface/80">
        {block.translation}
      </p>
      {block.note ? (
        <p
          data-testid="example-note"
          lang={instructionLanguage}
          className="mt-1 text-sm text-primary/70 dark:text-surface/70"
        >
          {block.note}
        </p>
      ) : null}
    </div>
  );
}

function DialogueView({
  block,
  language,
  instructionLanguage,
}: BlockProps<Extract<ContentBlock, { type: "dialogue" }>>) {
  return (
    <ul className="grid gap-2 rounded-lg border border-primary/20 px-4 py-3 dark:border-surface/20">
      {block.lines.map((line, index) => (
        <li key={`${String(index)}-${line.speaker}`}>
          <span className="font-semibold">{line.speaker}</span>{" "}
          <LearningText language={language}>{line.text}</LearningText>
          <span
            lang={instructionLanguage}
            className="block text-sm text-primary/70 dark:text-surface/70"
          >
            {line.translation}
          </span>
        </li>
      ))}
    </ul>
  );
}

function UnsupportedView() {
  return (
    <p className="rounded-lg border border-dashed border-primary/30 px-4 py-3 text-sm dark:border-surface/30">
      This part can&apos;t be displayed in this version of the app.
    </p>
  );
}

/**
 * Maps each *known* block type to a safe component. Everything is rendered as
 * text through React, so nothing in the data can become markup, and no
 * component is chosen by (or imported from) the data. A type this app does not
 * know renders a neutral notice — none of its data is shown — and the rest of
 * the content still displays.
 */
export function ContentBlocks({ blocks, language, instructionLanguage }: ContentBlocksProps) {
  return (
    <div className="grid gap-4">
      {blocks.map((block, index) => {
        const key = `${String(index)}-${block.type}`;
        const common = { language, instructionLanguage };
        switch (block.type) {
          case "explanation":
            return <ExplanationView key={key} block={block} {...common} />;
          case "example":
            return <ExampleView key={key} block={block} {...common} />;
          case "dialogue":
            return <DialogueView key={key} block={block} {...common} />;
          default:
            return <UnsupportedView key={key} />;
        }
      })}
    </div>
  );
}
