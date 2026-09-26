import type { EmailPreferencesResponse, NewsletterPreferenceResponse } from "@tfm-bic/contracts";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import {
  confirmNewsletterSubscription,
  fetchEmailPreferences,
  subscribeToNewsletter,
  unsubscribeFromNewsletter,
  unsubscribeWithToken,
} from "../services/email-preferences-api.js";
import { endingSessionOnUnauthorized, endSessionIfUnauthorized } from "./session-cache.js";

/** User-scoped: cleared with the rest of the user cache on a session change (session-cache.ts). */
export const EMAIL_PREFERENCES_QUERY_KEY = ["email-preferences", "me"] as const;

function setNewsletter(queryClient: QueryClient, newsletter: NewsletterPreferenceResponse): void {
  queryClient.setQueryData<EmailPreferencesResponse>(EMAIL_PREFERENCES_QUERY_KEY, (current) =>
    current ? { ...current, newsletter } : current,
  );
}

export function useEmailPreferences() {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: EMAIL_PREFERENCES_QUERY_KEY,
    queryFn: () => endingSessionOnUnauthorized(queryClient, fetchEmailPreferences),
    retry: false,
    refetchOnWindowFocus: true,
  });
}

/** The cache shows what the server recorded (pending/subscribed), not what was submitted. */
export function useSubscribeToNewsletter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: subscribeToNewsletter,
    onSuccess: (result) => {
      setNewsletter(queryClient, result.newsletter);
    },
    onError: (error) => {
      endSessionIfUnauthorized(queryClient, error);
    },
  });
}

export function useUnsubscribeFromNewsletter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: unsubscribeFromNewsletter,
    onSuccess: (newsletter) => {
      setNewsletter(queryClient, newsletter);
    },
    onError: (error) => {
      endSessionIfUnauthorized(queryClient, error);
    },
  });
}

/** Public pages reached from an email: the token is the only credential. */
export function useConfirmNewsletterSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: confirmNewsletterSubscription,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EMAIL_PREFERENCES_QUERY_KEY }),
  });
}

export function useUnsubscribeWithToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: unsubscribeWithToken,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EMAIL_PREFERENCES_QUERY_KEY }),
  });
}
