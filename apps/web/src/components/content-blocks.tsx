import type { ContentResponse } from "@verbysia/contracts";
import type { ReactNode } from "react";
import { m } from "../i18n/index.js";

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

const b = m.learn.blocks;

function SectionView({ block }: BlockProps<Extract<ContentBlock, { type: "section" }>>) {
  return (
    <div className="mt-4 border-b-2 border-accent pb-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent-ink dark:text-accent">
        {b.phases[block.phase]}
      </p>
      <h2 className="text-xl font-semibold">{block.title}</h2>
    </div>
  );
}

function ReadingView({ block, language }: BlockProps<Extract<ContentBlock, { type: "reading" }>>) {
  return (
    <article className="rounded-lg border border-primary/20 px-4 py-3 dark:border-surface/20">
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{b.reading}</p>
      <h3 className="font-semibold">
        <LearningText language={language}>{block.title}</LearningText>
      </h3>
      {block.paragraphs.map((paragraph, index) => (
        <p key={String(index)} className="mt-2">
          <LearningText language={language}>{paragraph}</LearningText>
        </p>
      ))}
    </article>
  );
}

function CultureView({
  block,
  instructionLanguage,
}: BlockProps<Extract<ContentBlock, { type: "culture" }>>) {
  return (
    <aside lang={instructionLanguage} className="rounded-lg bg-accent/10 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{b.culture}</p>
      <h3 className="font-semibold">{block.title}</h3>
      {block.paragraphs.map((paragraph, index) => (
        <p key={String(index)} className="mt-2">
          {paragraph}
        </p>
      ))}
    </aside>
  );
}

function PitfallView({
  block,
  language,
  instructionLanguage,
}: BlockProps<Extract<ContentBlock, { type: "pitfall" }>>) {
  return (
    <div className="rounded-lg border-l-4 border-danger bg-danger/5 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide">{b.pitfall}</p>
      <p className="mt-1">
        <span className="font-semibold">✗ {b.wrong}: </span>
        <s>
          <LearningText language={language}>{block.wrong}</LearningText>
        </s>
      </p>
      <p>
        <span className="font-semibold">✓ {b.right}: </span>
        <LearningText language={language}>{block.right}</LearningText>
      </p>
      <p lang={instructionLanguage} className="mt-1 text-sm text-primary/80 dark:text-surface/80">
        {block.explanation}
      </p>
    </div>
  );
}

function ComparisonView({
  block,
  language,
  instructionLanguage,
}: BlockProps<Extract<ContentBlock, { type: "comparison" }>>) {
  return (
    <div className="grid gap-1 rounded-lg bg-primary/5 px-4 py-3 sm:grid-cols-2 dark:bg-surface/10">
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70 sm:col-span-2">
        {b.comparison}
      </p>
      <p lang={instructionLanguage}>{block.source}</p>
      <p className="font-medium">
        <LearningText language={language}>{block.target}</LearningText>
      </p>
      {block.note ? (
        <p lang={instructionLanguage} className="text-sm opacity-80 sm:col-span-2">
          {block.note}
        </p>
      ) : null}
    </div>
  );
}

function TableView({ block }: BlockProps<Extract<ContentBlock, { type: "table" }>>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-primary/15 dark:border-surface/15">
      <table className="w-full border-collapse text-left text-sm">
        {block.caption ? (
          <caption className="px-3 pt-2 text-left text-xs opacity-70">{block.caption}</caption>
        ) : null}
        <thead>
          <tr className="bg-paper-shade dark:bg-night-paper">
            {block.columns.map((column, index) => (
              <th key={String(index)} scope="col" className="px-3 py-2 font-semibold">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, r) => (
            <tr key={String(r)} className="border-t border-primary/10 dark:border-surface/10">
              {row.map((cell, c) => (
                <td key={String(c)} className="px-3 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MissionView({
  block,
  instructionLanguage,
}: BlockProps<Extract<ContentBlock, { type: "mission" }>>) {
  return (
    <div lang={instructionLanguage} className="rounded-lg border-2 border-accent px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide">{b.mission}</p>
      <h3 className="font-semibold">{block.title}</h3>
      <ol className="mt-2 list-decimal space-y-1 pl-6">
        {block.steps.map((step, index) => (
          <li key={String(index)}>{step}</li>
        ))}
      </ol>
    </div>
  );
}

function SummaryView({
  block,
  language,
  instructionLanguage,
}: BlockProps<Extract<ContentBlock, { type: "summary" }>>) {
  return (
    <div className="rounded-lg bg-primary/5 px-4 py-3 dark:bg-surface/10">
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{b.summary}</p>
      <ul className="mt-2 grid gap-1 sm:grid-cols-2">
        {block.phrases.map((phrase, index) => (
          <li key={String(index)}>
            <span className="font-medium">
              <LearningText language={language}>{phrase.text}</LearningText>
            </span>{" "}
            <span lang={instructionLanguage} className="text-sm opacity-80">
              — {phrase.translation}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 font-semibold">{b.canDo}</p>
      <ul lang={instructionLanguage} className="mt-1 space-y-1">
        {block.canDo.map((item, index) => (
          <li key={String(index)}>☐ {item}</li>
        ))}
      </ul>
    </div>
  );
}

function UnsupportedView() {
  return (
    <p className="rounded-lg border border-dashed border-primary/30 px-4 py-3 text-sm dark:border-surface/30">
      {m.learn.catalog.unsupportedBlock}
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
          case "section":
            return <SectionView key={key} block={block} {...common} />;
          case "reading":
            return <ReadingView key={key} block={block} {...common} />;
          case "culture":
            return <CultureView key={key} block={block} {...common} />;
          case "pitfall":
            return <PitfallView key={key} block={block} {...common} />;
          case "comparison":
            return <ComparisonView key={key} block={block} {...common} />;
          case "table":
            return <TableView key={key} block={block} {...common} />;
          case "mission":
            return <MissionView key={key} block={block} {...common} />;
          case "summary":
            return <SummaryView key={key} block={block} {...common} />;
          default:
            return <UnsupportedView key={key} />;
        }
      })}
    </div>
  );
}
