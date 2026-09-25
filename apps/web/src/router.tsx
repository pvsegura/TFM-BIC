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
import { MyVocabularyPage } from "./pages/my-vocabulary-page.js";
import { PhoneticDetailPage } from "./pages/phonetic-detail-page.js";
import { PhoneticsPage } from "./pages/phonetics-page.js";
import { ProfilePage } from "./pages/profile-page.js";
import { RegisterPage } from "./pages/register-page.js";
import { ResetPasswordPage } from "./pages/reset-password-page.js";
import { RoutePlaceholder } from "./pages/route-placeholder.js";
import { VerifyEmailPage } from "./pages/verify-email-page.js";
import { VideoGenerationDemoPage } from "./pages/video-generation-demo-page.js";
import { VocabularyDetailPage } from "./pages/vocabulary-detail-page.js";
import { VocabularyPage } from "./pages/vocabulary-page.js";

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

/** Vocabulary (M9) — browse, "My Vocabulary" and one entry. Under `/learn` because `/vocabulary`
 * and `/user-vocabulary` are the API paths (see ADR-022). `learn/vocabulary/mine` is a static
 * segment, so React Router ranks it above `learn/vocabulary/:vocabularyId` regardless of
 * registration order — the same technique `learn/lessons` and `learn/exercises` already use. */
const VOCABULARY_ROUTES = [
  { path: "learn/vocabulary", element: <VocabularyPage /> },
  { path: "learn/vocabulary/mine", element: <MyVocabularyPage /> },
  { path: "learn/vocabulary/:vocabularyId", element: <VocabularyDetailPage /> },
];

/** Phonetics (M10) — browse and one representation. Under `/learn` because `/phonetics` is the
 * API path, the same reasoning as Vocabulary (ADR-022) and Lessons (ADR-019). Independent of
 * Vocabulary: no shared route, no shared identifier. */
const PHONETICS_ROUTES = [
  { path: "learn/phonetics", element: <PhoneticsPage /> },
  { path: "learn/phonetics/:phoneticId", element: <PhoneticDetailPage /> },
];

/** Video generation (M11) — one demo page requesting generation of the milestone's one authored
 * definition (see VideoGenerationDemoPage's doc comment for why there is no browse/list route).
 * Under `/learn` because `/video-generations` is the API path, the same reasoning as Phonetics. */
const VIDEO_ROUTES = [{ path: "learn/videos", element: <VideoGenerationDemoPage /> }];

/** Routes requiring an authenticated session — gated by ProtectedRoute,
 * which only hides UI; the backend remains the real authorization
 * boundary on every request. Profile is the real M4 page, lessons the
 * real M6 pages, exercises the real M7 page, vocabulary the real M9 pages, phonetics the real
 * M10 pages, video generation the real M11 demo page, and the dashboard and achievements the real
 * M8 pages (their API is under `/gamification`, so no page-vs-API path
 * clash); the rest are still placeholders for their features, real now only in that they require
 * login. */
const APP_ROUTES = [
  { path: "dashboard", element: <DashboardPage /> },
  ...LESSON_ROUTES,
  ...EXERCISE_ROUTES,
  ...VOCABULARY_ROUTES,
  ...PHONETICS_ROUTES,
  ...VIDEO_ROUTES,
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
