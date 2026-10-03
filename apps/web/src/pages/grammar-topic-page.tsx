import type { GrammarTopicResponse } from "@tfm-bic/contracts";
import type { ReactNode } from "react";
import { useParams } from "react-router";

import { Link } from "../components/app-link.js";
import { WordAudioButton } from "../components/word-audio-button.js";
import { LoadError, NotFoundNotice } from "../components/catalog-notices.js";
import { useGrammarTopic } from "../hooks/use-grammar.js";
import { useGrammarMedia } from "../hooks/use-media.js";
import { isNotFoundError } from "../services/api-error.js";

const enc = encodeURIComponent;

type Section = GrammarTopicResponse["sections"][number];

/** A table cell: the text, plus a play button when the column is spoken and a clip exists. */
function Cell({
  text,
  clips,
  lang,
}: {
  text: string;
  clips?: Map<string, string> | undefined;
  lang?: string | undefined;
}) {
  const url = lang ? clips?.get(text.trim()) : undefined;
  if (!url || !lang) return <>{text}</>;
  return (
    <span className="inline-flex items-center gap-2">
      <span lang={lang}>{text}</span>
      <WordAudioButton url={url} word={text} lang={lang} />
    </span>
  );
}

function Table({
  table,
  clips,
  lang,
}: {
  table: NonNullable<Section["table"]>;
  clips?: Map<string, string> | undefined;
  lang: string;
}) {
  const spoken = (column: number) => table.speak?.includes(column) ?? false;
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-primary/15 dark:border-surface/15">
      <table className="w-full border-collapse text-left text-sm">
        {table.caption ? (
          <caption className="px-3 pt-2 text-left text-xs text-primary/70 dark:text-surface/70">
            {table.caption}
          </caption>
        ) : null}
        <thead>
          <tr className="bg-paper-shade dark:bg-night-paper">
            {table.columns.map((column, i) => (
              <th key={i} scope="col" className="px-3 py-2 font-semibold">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, r) => (
            <tr key={r} className="border-t border-primary/10 dark:border-surface/10">
              {row.map((cell, c) =>
                c === 0 ? (
                  <th key={c} scope="row" className="px-3 py-2 font-medium">
                    <Cell text={cell} clips={clips} lang={spoken(c) ? lang : undefined} />
                  </th>
                ) : (
                  <td key={c} className="px-3 py-2">
                    <Cell text={cell} clips={clips} lang={spoken(c) ? lang : undefined} />
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TopicBody({ topic }: { topic: GrammarTopicResponse }) {
  const clips = useGrammarMedia(topic.id).data;
  return (
    <>
      <p className="text-sm font-medium uppercase tracking-wide text-accent-ink dark:text-accent">
        Grammar reference{topic.levelId ? ` · from ${topic.levelId.toUpperCase()}` : ""}
      </p>
      <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">{topic.title}</h1>
      <p className="mt-2 max-w-2xl text-primary/75 dark:text-surface/75">{topic.description}</p>
      {topic.sections.map((section, i) => (
        <section key={i} className="mt-8">
          {section.heading ? <h2 className="text-xl font-semibold">{section.heading}</h2> : null}
          {section.text ? <p className="mt-2 max-w-3xl leading-relaxed">{section.text}</p> : null}
          {section.table ? (
            <Table table={section.table} clips={clips} lang={topic.languageId} />
          ) : null}
          {section.examples ? (
            <ul className="mt-3 grid gap-2">
              {section.examples.map((example, j) => (
                <li
                  key={j}
                  className="rounded-lg border-l-4 border-accent bg-paper-shade/60 px-3 py-2 dark:bg-night-paper/60"
                >
                  <p className="font-medium" lang={topic.languageId}>
                    {example.text}
                  </p>
                  <p className="text-sm text-primary/75 dark:text-surface/75">
                    {example.translation}
                  </p>
                  {example.note ? (
                    <p className="mt-0.5 text-xs text-primary/65 dark:text-surface/65">
                      {example.note}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </>
  );
}

/**
 * One grammar reference topic (M23): its tables, notes and examples. Public and read-only. The API
 * decides whether the topic exists; a missing or unpublished id is "not found", never echoed.
 */
export function GrammarTopicPage() {
  const { topicId } = useParams();
  const topicQuery = useGrammarTopic(topicId);
  const backTo = topicQuery.data
    ? `/learn/grammar?language=${enc(topicQuery.data.languageId)}`
    : "/learn/grammar";

  let body: ReactNode;
  if (topicQuery.isPending) {
    body = (
      <p role="status" className="mt-6">
        Loading…
      </p>
    );
  } else if (topicQuery.isError) {
    body = isNotFoundError(topicQuery.error) ? (
      <NotFoundNotice
        title="Grammar topic not found"
        message="That reference topic is not available."
        backTo="/learn/grammar"
        backLabel="Back to the grammar reference"
      />
    ) : (
      <LoadError
        message="We couldn't load this topic. Please try again."
        onRetry={() => void topicQuery.refetch()}
      />
    );
  } else {
    body = <TopicBody topic={topicQuery.data} />;
  }

  return (
    <div className="mx-auto max-w-5xl py-8">
      <Link to={backTo} className="text-sm underline underline-offset-2">
        ← All grammar topics
      </Link>
      <div className="mt-4">{body}</div>
    </div>
  );
}
