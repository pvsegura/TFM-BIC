import { createBrowserRouter } from "react-router";

import { ProtectedRoute } from "./components/protected-route.js";
import { RootLayout } from "./layouts/root-layout.js";
import { ForgotPasswordPage } from "./pages/forgot-password-page.js";
import { ContentPage } from "./pages/content-page.js";
import { LearnPage } from "./pages/learn-page.js";
import { LoginPage } from "./pages/login-page.js";
import { ProfilePage } from "./pages/profile-page.js";
import { RegisterPage } from "./pages/register-page.js";
import { ResetPasswordPage } from "./pages/reset-password-page.js";
import { RoutePlaceholder } from "./pages/route-placeholder.js";
import { VerifyEmailPage } from "./pages/verify-email-page.js";

function placeholder(title: string, description: string) {
  return <RoutePlaceholder title={title} description={description} />;
}

/** Public, unauthenticated routes — the M3 Identity & Authentication
 * flows (see docs/adr/adr-006-authentication.md). */
const PUBLIC_ROUTES = [
  { path: "login", element: <LoginPage /> },
  { path: "register", element: <RegisterPage /> },
  { path: "verify-email", element: <VerifyEmailPage /> },
  { path: "forgot-password", element: <ForgotPasswordPage /> },
  { path: "reset-password", element: <ResetPasswordPage /> },
];

/** Language, level and content discovery (M5) — public, like the catalog API behind it. One
 * generic page set for every language; the choice lives in the URL. Deliberately not under
 * `/languages` or `/content`: those are the API paths, and a page and an API sharing a path
 * needs a proxy workaround (see ADR-017). Lessons themselves are M6. */
const LEARN_ROUTES = [
  { path: "learn/:languageCode?/:levelId?", element: <LearnPage /> },
  { path: "learn/:languageCode/:levelId/:contentId", element: <ContentPage /> },
];

/** Routes requiring an authenticated session — gated by ProtectedRoute,
 * which only hides UI; the backend remains the real authorization
 * boundary on every request. Profile is the real M4 page; the rest are
 * still placeholders for their features (M5+), real now only in that they
 * require login. */
const APP_ROUTES = [
  { path: "dashboard", element: placeholder("Dashboard", "Student dashboard placeholder.") },
  { path: "lessons", element: placeholder("Lessons", "Lesson list placeholder.") },
  { path: "vocabulary", element: placeholder("Vocabulary", "Vocabulary practice placeholder.") },
  { path: "phonetics", element: placeholder("Phonetics", "Phonetics practice placeholder.") },
  { path: "exercises", element: placeholder("Exercises", "Exercises placeholder.") },
  { path: "progress", element: placeholder("Progress", "Progress tracking placeholder.") },
  {
    path: "achievements",
    element: placeholder("Achievements", "Gamification/achievements placeholder."),
  },
  { path: "profile", element: <ProfilePage /> },
  { path: "settings", element: placeholder("Settings", "Account settings placeholder.") },
];

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: placeholder("TFM-BIC", "Language-learning platform — home.") },
      ...PUBLIC_ROUTES,
      ...LEARN_ROUTES,
      {
        element: <ProtectedRoute />,
        children: APP_ROUTES,
      },
      { path: "*", element: placeholder("Not found", "This route does not exist.") },
    ],
  },
]);
