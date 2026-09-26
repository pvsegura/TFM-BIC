import { Button, TextField } from "@tfm-bic/ui";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";

import { useDeleteAccount, useExportPersonalData } from "../hooks/use-data-management.js";
import { ApiError } from "../services/api-error.js";

const GENERIC_ERROR = "Something went wrong. Please try again.";

function messageOf(error: unknown): string {
  return error instanceof ApiError ? error.message : GENERIC_ERROR;
}

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
        Your data
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
      <h3 className="font-medium">Download your data</h3>
      <p className="mt-2 text-sm">
        Get a copy of the information stored about your account — account details, profile, lesson
        and exercise history, points and achievements, vocabulary, phonetics, video requests and
        email preferences — as a machine-readable JSON file.
      </p>
      <p className="mt-2 text-sm text-primary/70 dark:text-surface/70">
        The file never includes your password or other security credentials.
      </p>
      <Button
        className="mt-3"
        disabled={exportData.isPending}
        onClick={() => {
          exportData.mutate();
        }}
      >
        {exportData.isPending ? "Preparing your download…" : "Download my data"}
      </Button>
      {exportData.isSuccess ? (
        <p role="status" className="mt-3 text-sm">
          {`Your data was downloaded as ${exportData.data}.`}
        </p>
      ) : null}
      {exportData.isError ? (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {messageOf(exportData.error)}
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
      <h3 className="font-medium">Delete your account</h3>
      {open ? (
        <DeleteAccountConfirmation
          onCancel={() => {
            setOpen(false);
          }}
        />
      ) : (
        <div ref={openerRef}>
          <p className="mt-2 text-sm">
            Permanently delete your account and everything stored about it.
          </p>
          <Button
            className="mt-3"
            variant="secondary"
            onClick={() => {
              setOpen(true);
            }}
          >
            Delete my account…
          </Button>
        </div>
      )}
    </div>
  );
}

function DeleteAccountConfirmation({ onCancel }: { onCancel: () => void }) {
  const deletion = useDeleteAccount();
  const navigate = useNavigate();
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
      found.password = "Enter your current password.";
    }
    if (!acknowledged) {
      found.acknowledgement = "Tick the box to confirm that you understand.";
    }
    setErrors(found);
    if (found.password !== undefined || found.acknowledgement !== undefined) {
      return;
    }
    deletion.mutate(password, {
      onSuccess: () => {
        void navigate("/account-deleted", { replace: true });
      },
    });
  }

  return (
    <div role="group" aria-labelledby={ids.heading} className="mt-3">
      <h4
        id={ids.heading}
        ref={headingRef}
        tabIndex={-1}
        className="text-lg font-semibold focus:outline-none"
      >
        Delete your account?
      </h4>
      <p className="mt-2 text-sm">
        Your account is deleted immediately and permanently. <strong>This cannot be undone.</strong>{" "}
        The following is deleted with it:
      </p>
      <ul className="mt-2 list-disc pl-6 text-sm">
        <li>your sign-in details and profile;</li>
        <li>your lesson progress, exercise answers, points and achievements;</li>
        <li>your saved vocabulary, phonetics progress and video requests;</li>
        <li>your newsletter subscription;</li>
        <li>any link that lets a teacher see your progress.</li>
      </ul>
      <p className="mt-2 text-sm">
        You will be signed out everywhere. If you want a copy of your data, download it first.
      </p>
      <p className="mt-2 text-sm">
        If you only want to stop the newsletter, unsubscribe in your email preferences instead —
        that keeps your account.
      </p>

      <form noValidate onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
        <TextField
          label="Current password"
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
            {messageOf(deletion.error)}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={deletion.isPending}>
            {deletion.isPending ? "Deleting your account…" : "Delete my account permanently"}
          </Button>
          <Button variant="secondary" disabled={deletion.isPending} onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
