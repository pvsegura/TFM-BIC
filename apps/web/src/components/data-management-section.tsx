import { Button, TextField } from "@verbysia/ui";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import { useDeleteAccount, useExportPersonalData } from "../hooks/use-data-management.js";
import { errorMessage } from "../services/api-error.js";
import { m } from "../i18n/index.js";

/**
 * "Your data" (M15, ADR-026): download a copy of what is stored about the account, and delete the
 * account. It sits on the profile page next to the profile form (rectification) and the email
 * preferences (consent withdrawal), so every privacy control is in one place. Plain wording, no
 * pre-ticked boxes, no nudging: deletion is explained, then confirmed twice (acknowledgement and
 * password) — and the lighter alternative, unsubscribing, is pointed out.
 */
export function DataManagementSection() {
  return (
    <section aria-labelledby="data-management-heading" className="mt-10">
      <h2 id="data-management-heading" className="text-xl font-semibold">
        {m.account.data.heading}
      </h2>
      <ExportPersonalData />
      <DeleteAccount />
    </section>
  );
}

function ExportPersonalData() {
  const exportData = useExportPersonalData();

  return (
    <div className="mt-4 rounded-md border border-primary/20 p-4 dark:border-surface/20">
      <h3 className="font-medium">{m.account.data.downloadHeading}</h3>
      <p className="mt-2 text-sm">{m.account.data.downloadBody}</p>
      <p className="mt-2 text-sm text-primary/70 dark:text-surface/70">
        {m.account.data.downloadNote}
      </p>
      <Button
        className="mt-3"
        disabled={exportData.isPending}
        onClick={() => {
          exportData.mutate();
        }}
      >
        {exportData.isPending ? m.account.data.preparing : m.account.data.download}
      </Button>
      {exportData.isSuccess ? (
        <p role="status" className="mt-3 text-sm">
          {m.account.data.downloaded(exportData.data)}
        </p>
      ) : null}
      {exportData.isError ? (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {errorMessage(exportData.error)}
        </p>
      ) : null}
    </div>
  );
}

function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const openerRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  // Return focus to the opener when the dialog closes (not on first render).
  useEffect(() => {
    if (!open && wasOpen.current) {
      openerRef.current?.querySelector("button")?.focus();
    }
    wasOpen.current = open;
  }, [open]);

  return (
    <div className="mt-4 rounded-md border border-primary/20 p-4 dark:border-surface/20">
      <h3 className="font-medium">{m.account.data.deleteHeading}</h3>
      {open ? (
        <DeleteAccountConfirmation
          onCancel={() => {
            setOpen(false);
          }}
        />
      ) : (
        <div ref={openerRef}>
          <p className="mt-2 text-sm">{m.account.data.deleteIntro}</p>
          <Button
            className="mt-3"
            variant="secondary"
            onClick={() => {
              setOpen(true);
            }}
          >
            {m.account.data.deleteOpen}
          </Button>
        </div>
      )}
    </div>
  );
}

function DeleteAccountConfirmation({ onCancel }: { onCancel: () => void }) {
  const deletion = useDeleteAccount();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [password, setPassword] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; acknowledgement?: string }>({});
  const ids = { heading: useId(), acknowledgement: useId(), acknowledgementError: useId() };

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const found: typeof errors = {};
    if (password === "") {
      found.password = m.account.data.passwordRequired;
    }
    if (!acknowledged) {
      found.acknowledgement = m.account.data.ackRequired;
    }
    setErrors(found);
    if (found.password !== undefined || found.acknowledgement !== undefined) {
      return;
    }
    deletion.mutate(password);
  }

  return (
    <div role="group" aria-labelledby={ids.heading} className="mt-3">
      <h4
        id={ids.heading}
        ref={headingRef}
        tabIndex={-1}
        className="text-lg font-semibold focus:outline-none"
      >
        {m.account.data.confirmHeading}
      </h4>
      <p className="mt-2 text-sm">
        {m.account.data.confirmBodyBefore} <strong>{m.account.data.confirmCannotUndo}</strong>{" "}
        {m.account.data.confirmListIntro}
      </p>
      <ul className="mt-2 list-disc pl-6 text-sm">
        {m.account.data.confirmList.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="mt-2 text-sm">{m.account.data.signedOutEverywhere}</p>
      <p className="mt-2 text-sm">{m.account.data.newsletterOnly}</p>

      <form noValidate onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
        <TextField
          label={m.account.data.currentPassword}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
          }}
          error={errors.password}
        />
        <div className="flex items-start gap-2">
          <input
            id={ids.acknowledgement}
            type="checkbox"
            className="mt-1 h-4 w-4"
            checked={acknowledged}
            onChange={(event) => {
              setAcknowledged(event.target.checked);
            }}
            aria-invalid={errors.acknowledgement !== undefined}
            aria-describedby={
              errors.acknowledgement !== undefined ? ids.acknowledgementError : undefined
            }
          />
          <label htmlFor={ids.acknowledgement} className="text-sm">
            I understand that my account and its data will be permanently deleted.
          </label>
        </div>
        {errors.acknowledgement !== undefined ? (
          <p
            id={ids.acknowledgementError}
            role="alert"
            className="text-sm text-red-600 dark:text-red-400"
          >
            {errors.acknowledgement}
          </p>
        ) : null}
        {deletion.isError ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {errorMessage(deletion.error)}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={deletion.isPending}>
            {deletion.isPending ? m.account.data.deleting : m.account.data.deleteForever}
          </Button>
          <Button variant="secondary" disabled={deletion.isPending} onClick={onCancel}>
            {m.account.data.cancel}
          </Button>
        </div>
      </form>
    </div>
  );
}
