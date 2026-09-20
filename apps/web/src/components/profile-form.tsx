import { zodResolver } from "@hookform/resolvers/zod";
import { AVATAR_CATALOG, type ProfileResponse } from "@tfm-bic/contracts";
import { Avatar, AvatarPicker, Button, TextField } from "@tfm-bic/ui";
import { useRef } from "react";
import { Controller, useForm } from "react-hook-form";

import { useUpdateProfile } from "../hooks/use-update-profile.js";
import { ApiError } from "../services/api-error.js";
import {
  profileFormSchema,
  toFormValues,
  type ProfileFormRequest,
  type ProfileFormValues,
} from "./profile-form-schema.js";

const ROLE_LABELS: Record<ProfileResponse["role"], string> = {
  STUDENT: "Student",
  TEACHER: "Teacher",
};

const FORM_FIELDS = ["firstName", "lastName", "nickname", "avatarId"] as const;

function isFormField(key: string): key is (typeof FORM_FIELDS)[number] {
  return (FORM_FIELDS as readonly string[]).includes(key);
}

/** Safe, user-facing text for a failed save. Field-level detail is shown next
 * to the inputs, so a failure that has it only needs a pointer here. Nothing
 * from an unexpected error is ever shown — only fixed wording. */
function saveErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.fieldErrors ? "Please fix the highlighted fields." : error.message;
  }
  if (error instanceof TypeError) {
    return "We couldn't reach the server. Check your connection and try again.";
  }
  return "Something went wrong while saving. Please try again.";
}

export interface ProfileFormProps {
  profile: ProfileResponse;
}

/**
 * The editable profile plus the read-only account facts. The form is
 * initialised from `profile` once and is never re-synced from later query
 * updates (that would clobber an edit in progress); after a successful save it
 * is reset to what the server persisted. Validation rules come from the shared
 * contract, and all API/cache handling lives in `useUpdateProfile` — this
 * component only wires them to the inputs.
 */
export function ProfileForm({ profile }: ProfileFormProps) {
  const updateProfile = useUpdateProfile();
  const inFlight = useRef(false);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues, unknown, ProfileFormRequest>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: toFormValues(profile),
  });

  const onSubmit = async (request: ProfileFormRequest) => {
    // Two rapid submits can both pass validation before the first re-render
    // disables the button, so the guard is a ref, not render state.
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    updateProfile.reset();
    try {
      const persisted = await updateProfile.mutateAsync(request);
      reset(toFormValues(persisted));
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          if (isFormField(field)) {
            setError(field, { type: "server", message });
          }
        }
      }
    } finally {
      inFlight.current = false;
    }
  };

  const savedAvatarLabel = AVATAR_CATALOG.find((avatar) => avatar.id === profile.avatarId)?.label;
  const showSaved = updateProfile.isSuccess && !isDirty;

  return (
    <div className="mt-6 flex flex-col gap-8">
      <section aria-labelledby="account-heading" className="flex items-center gap-4">
        <Avatar
          avatarId={profile.avatarId}
          size="lg"
          {...(savedAvatarLabel ? { label: savedAvatarLabel } : {})}
        />
        <div>
          <h2 id="account-heading" className="text-lg font-semibold">
            Account
          </h2>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-primary/70 dark:text-surface/70">Email</dt>
            <dd className="break-all">{profile.email}</dd>
            <dt className="text-primary/70 dark:text-surface/70">Role</dt>
            <dd>{ROLE_LABELS[profile.role]}</dd>
          </dl>
          <p className="mt-2 text-sm text-primary/70 dark:text-surface/70">
            Your email is how you sign in and can&apos;t be changed here.
          </p>
        </div>
      </section>

      <form
        aria-labelledby="personal-details-heading"
        className="flex flex-col gap-4"
        noValidate
        onSubmit={(event) => {
          void handleSubmit(onSubmit)(event);
        }}
      >
        <h2 id="personal-details-heading" className="text-lg font-semibold">
          Personal details
        </h2>

        <TextField
          label="First name"
          autoComplete="given-name"
          error={errors.firstName?.message}
          {...register("firstName")}
        />
        <TextField
          label="Last name"
          autoComplete="family-name"
          error={errors.lastName?.message}
          {...register("lastName")}
        />
        <TextField
          label="Nickname"
          autoComplete="nickname"
          error={errors.nickname?.message}
          {...register("nickname")}
        />

        <Controller
          control={control}
          name="avatarId"
          render={({ field }) => (
            <AvatarPicker
              legend="Choose your avatar"
              avatars={AVATAR_CATALOG}
              value={field.value}
              onChange={field.onChange}
              disabled={updateProfile.isPending}
              error={errors.avatarId?.message}
            />
          )}
        />

        {updateProfile.isError ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {saveErrorMessage(updateProfile.error)}
          </p>
        ) : null}

        <div className="flex items-center gap-4">
          <Button type="submit" disabled={updateProfile.isPending || !isDirty}>
            {updateProfile.isPending ? "Saving…" : "Save changes"}
          </Button>
          <p role="status" className="text-sm text-green-700 dark:text-green-400">
            {showSaved ? (
              <>
                <span aria-hidden="true">✓ </span>Profile saved.
              </>
            ) : null}
          </p>
        </div>
      </form>
    </div>
  );
}
