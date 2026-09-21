import { createBrowserRouter, type RouteObject } from "react-router";

import { ProtectedRoute } from "./components/protected-route.js";
import { RootLayout } from "./layouts/root-layout.js";
import { AchievementsPage } from "./pages/achievements-page.js";
import { DashboardPage } from "./pages/dashboard-page.js";
import { ExercisePage } from "./pages/exercise-page.js";
import { ForgotPasswordPage } from "./pages/forgot-password-page.js";
import { ContentPage } from "./pages/content-page.js";
import { LearnPage } from "./pages/learn-page.js";
import { LessonPage } from "./pages/lesson-page.js";
import { LessonsPage } from "./pages/lessons-page.js";
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
 * needs a proxy workaround (see ADR-017). */
const LEARN_ROUTES = [
  { path: "learn/:languageCode?/:levelId?", element: <LearnPage /> },
  { path: "learn/:languageCode/:levelId/:contentId", element: <ContentPage /> },
];

/** The student lesson experience (M6) — the lessons list and one lesson. Under `/learn` because
 * `/lessons` is the API path (see ADR-019). React Router ranks these static paths above the public
 * `learn/:languageCode?/:levelId?` route, and no language code can be spelled "lessons" (codes are
 * two or three letters), so the two never compete. They sit behind ProtectedRoute like the rest. */
const LESSON_ROUTES = [
  { path: "learn/lessons", element: <LessonsPage /> },
  { path: "learn/lessons/:lessonId", element: <LessonPage /> },
];

/** One exercise (M7). Under `/learn` because `/exercises` is the API path (see ADR-020). Its static
 * `learn/exercises` segment ranks above the public `learn/:languageCode/:levelId` route, and no language
 * code can be spelled "exercises" (codes are two or three letters), so the two never compete. Behind
 * ProtectedRoute like the rest. */
const EXERCISE_ROUTES = [{ path: "learn/exercises/:exerciseId", element: <ExercisePage /> }];

/** Routes requiring an authenticated session — gated by ProtectedRoute,
 * which only hides UI; the backend remains the real authorization
 * boundary on every request. Profile is the real M4 page, lessons the
 * real M6 pages, exercises the real M7 page and the dashboard and achievements the real M8 pages
 * (their API is under `/gamification`, so no page-vs-API path clash); the rest are still placeholders for their features,
 * real now only in that they require login. */
const APP_ROUTES = [
  { path: "dashboard", element: <DashboardPage /> },
  ...LESSON_ROUTES,
  ...EXERCISE_ROUTES,
  { path: "vocabulary", element: placeholder("Vocabulary", "Vocabulary practice placeholder.") },
  { path: "phonetics", element: placeholder("Phonetics", "Phonetics practice placeholder.") },
  { path: "progress", element: placeholder("Progress", "Progress tracking placeholder.") },
  { path: "achievements", element: <AchievementsPage /> },
  { path: "profile", element: <ProfilePage /> },
  { path: "settings", element: placeholder("Settings", "Account settings placeholder.") },
];

export const routes: RouteObject[] = [
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
];

export const router = createBrowserRouter(routes);
