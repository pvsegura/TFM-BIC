import { createBrowserRouter, Navigate, type RouteObject } from "react-router";

import { ProtectedRoute } from "./components/protected-route.js";
import { RouteErrorFallback } from "./components/route-error-fallback.js";
import { AdminRoute } from "./components/admin-route.js";
import { TeacherRoute } from "./components/teacher-route.js";
import { RootLayout } from "./layouts/root-layout.js";
import { AccountDeletedPage } from "./pages/account-deleted-page.js";
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
import { NewsletterConfirmPage } from "./pages/newsletter-confirm-page.js";
import { NewsletterUnsubscribePage } from "./pages/newsletter-unsubscribe-page.js";
import { PhoneticDetailPage } from "./pages/phonetic-detail-page.js";
import { PhoneticsPage } from "./pages/phonetics-page.js";
import { GrammarPage } from "./pages/grammar-page.js";
import { GrammarTopicPage } from "./pages/grammar-topic-page.js";
import { PrivacyPage } from "./pages/privacy-page.js";
import { ProfilePage } from "./pages/profile-page.js";
import { RegisterPage } from "./pages/register-page.js";
import { ResetPasswordPage } from "./pages/reset-password-page.js";
import { NotFoundPage } from "./pages/not-found-page.js";
import { VerifyEmailPage } from "./pages/verify-email-page.js";
import { VideosPage } from "./pages/videos-page.js";
import { VocabularyDetailPage } from "./pages/vocabulary-detail-page.js";
import { VocabularyPage } from "./pages/vocabulary-page.js";

/** Public, unauthenticated routes — the M3 Identity & Authentication
 * flows (see docs/adr/adr-006-authentication.md). */
const PUBLIC_ROUTES = [
  { path: "login", element: <LoginPage /> },
  { path: "register", element: <RegisterPage /> },
  { path: "verify-email", element: <VerifyEmailPage /> },
  { path: "forgot-password", element: <ForgotPasswordPage /> },
  { path: "reset-password", element: <ResetPasswordPage /> },
  // Newsletter links from emails (M14): public, the token is the credential; each asks for a click.
  { path: "newsletter/confirm", element: <NewsletterConfirmPage /> },
  { path: "newsletter/unsubscribe", element: <NewsletterUnsubscribePage /> },
  // Privacy (M15): the notice is public; the deletion confirmation is shown once the session is
  // gone. Not under `/data-management`, which is the API path.
  { path: "privacy", element: <PrivacyPage /> },
  { path: "account-deleted", element: <AccountDeletedPage /> },
];

/** Language, level and content discovery (M5) — public, like the catalog API behind it. One
 * generic page set for every language; the choice lives in the URL. Deliberately not under
 * `/languages` or `/content`: those are the API paths, and a page and an API sharing a path
 * needs a proxy workaround (see ADR-017). */
/** Verbysia public pages, with Polish slugs (SEO). Each its own chunk. */
const MARKETING_ROUTES: RouteObject[] = [
  {
    path: "metoda-puente",
    lazy: () =>
      import("./pages/public/method-page.js").then(({ MethodPage }) => ({ Component: MethodPage })),
  },
  {
    path: "wyzwanie-7-dni",
    lazy: () =>
      import("./pages/public/challenge-page.js").then(({ ChallengePage }) => ({
        Component: ChallengePage,
      })),
  },
  {
    path: "wyzwanie-7-dni/demo/:lessonId",
    lazy: () =>
      import("./pages/public/demo-lesson-page.js").then(({ DemoLessonPage }) => ({
        Component: DemoLessonPage,
      })),
  },
  {
    path: "kurs-a1",
    lazy: () =>
      import("./pages/public/course-a1-page.js").then(({ CourseA1Page }) => ({
        Component: CourseA1Page,
      })),
  },
  {
    path: "cennik",
    lazy: () =>
      import("./pages/public/pricing-page.js").then(({ PricingPage }) => ({
        Component: PricingPage,
      })),
  },
  {
    path: "inne-kursy",
    lazy: () =>
      import("./pages/public/other-courses-page.js").then(({ OtherCoursesPage }) => ({
        Component: OtherCoursesPage,
      })),
  },
  {
    path: "test-sluchu",
    lazy: () =>
      import("./pages/public/listening-test-page.js").then(({ ListeningTestPage }) => ({
        Component: ListeningTestPage,
      })),
  },
  {
    path: "kontakt",
    lazy: () =>
      import("./pages/public/contact-page.js").then(({ ContactPage }) => ({
        Component: ContactPage,
      })),
  },
  {
    path: "faq",
    lazy: () =>
      import("./pages/public/faq-page.js").then(({ FaqPage }) => ({ Component: FaqPage })),
  },
];

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

/** Grammar reference (M23) — quick-lookup tables per language, and one topic. Under `/learn`
 * because `/grammar` is the API path, the same reasoning as Phonetics. */
const GRAMMAR_ROUTES = [
  { path: "learn/grammar", element: <GrammarPage /> },
  { path: "learn/grammar/:topicId", element: <GrammarTopicPage /> },
];

/** The AI Learning Coach (M23, ADR-034) — one page for every language and mode; contextual entry
 * points land on it with a query parameter (`?lesson=`, `?exercise=`, `?vocabulary=`, `?video=`,
 * `?phonetic=`). Under `/learn` because `/ai-coach` is the API path: the dev proxy matches API
 * paths by prefix, so a page there would need a `bypass` like `/profile`'s, and the convention
 * since M5 is to move the page instead (ADR-018/022). */
const COACH_ROUTES: RouteObject[] = [
  {
    path: "learn/coach",
    // Its own chunk: most visits never open the coach.
    lazy: () =>
      import("./pages/ai-coach-page.js").then(({ AiCoachPage }) => ({ Component: AiCoachPage })),
  },
];

/** The video library (M21, ADR-031) — published explainer videos of lessons and words. Videos are
 * produced offline by the media pipeline; nothing here generates one. */
const VIDEO_ROUTES = [{ path: "learn/videos", element: <VideosPage /> }];

/** The PUENTE memory trainer (spaced repetition). The API checks licences on every request. */
const MEMORY_ROUTES: RouteObject[] = [
  {
    path: "learn/memory",
    lazy: () =>
      import("./pages/memory-trainer-page.js").then(({ MemoryTrainerPage }) => ({
        Component: MemoryTrainerPage,
      })),
  },
];

/** The admin panel: AdminRoute only spares non-admins a page of refused requests; the API
 * authorises every request by role (ADMIN) and audits every change. */
const ADMIN_ROUTES: RouteObject[] = [
  {
    element: <AdminRoute />,
    children: [
      {
        path: "admin",
        lazy: () =>
          import("./pages/admin-page.js").then(({ AdminPage }) => ({ Component: AdminPage })),
      },
    ],
  },
];

/** The teacher dashboard (M13) — the overview/roster and one student. Behind login *and* the
 * TeacherRoute guard, which only spares a student a page of refused requests: the API authorises
 * every request by role and teacher–student link (ADR-024). Not under `/teacher-dashboard`, which
 * is the API path, so no proxy bypass is needed. */
const TEACHER_ROUTES: RouteObject[] = [
  {
    element: <TeacherRoute />,
    children: [
      // Their own chunks: only teachers ever load them.
      {
        path: "teacher",
        lazy: () =>
          import("./pages/teacher-dashboard-page.js").then(({ TeacherDashboardPage }) => ({
            Component: TeacherDashboardPage,
          })),
      },
      {
        path: "teacher/students/:studentId",
        lazy: () =>
          import("./pages/teacher-student-page.js").then(({ TeacherStudentPage }) => ({
            Component: TeacherStudentPage,
          })),
      },
    ],
  },
];

/** Routes requiring an authenticated session — gated by ProtectedRoute, which only hides UI; the
 * backend remains the real authorization boundary on every request. The dashboard and achievements
 * use the API under `/gamification`, so no page-vs-API path clash. */
const APP_ROUTES = [
  { path: "dashboard", element: <DashboardPage /> },
  ...LESSON_ROUTES,
  ...EXERCISE_ROUTES,
  ...VOCABULARY_ROUTES,
  ...PHONETICS_ROUTES,
  ...VIDEO_ROUTES,
  ...GRAMMAR_ROUTES,
  ...COACH_ROUTES,
  ...MEMORY_ROUTES,
  ...TEACHER_ROUTES,
  ...ADMIN_ROUTES,
  // M21: former Milestone-1 placeholders now lead somewhere real — progress lives on the dashboard,
  // account settings on the profile. Still behind login.
  { path: "progress", element: <Navigate to="/dashboard" replace /> },
  { path: "achievements", element: <AchievementsPage /> },
  { path: "profile", element: <ProfilePage /> },
  { path: "settings", element: <Navigate to="/profile" replace /> },
];

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <RootLayout />,
    // M18: any route that throws while rendering shows a safe fallback and is reported.
    errorElement: <RouteErrorFallback />,
    // M20A: shown only while a lazy route (the homepage, the coach, the teacher pages) loads on the
    // very first navigation — a blank page in the page colour, so nothing flashes or shifts.
    hydrateFallbackElement: (
      <div aria-busy="true" className="min-h-screen bg-surface dark:bg-surface-dark" />
    ),
    children: [
      // The public homepage (M20A): its own chunk (scenes, stylesheet), so no other page carries it;
      // full-bleed, so the root layout drops its centred column for it.
      // Verbysia: the Polish public homepage (the M20A scroll homepage in pages/home-page.tsx is no
      // longer routed — it told the old Polish-for-English-speakers story; kept until removal is approved).
      {
        index: true,
        lazy: () =>
          import("./pages/public/verbysia-home-page.js").then(({ VerbysiaHomePage }) => ({
            Component: VerbysiaHomePage,
          })),
      },
      ...MARKETING_ROUTES,
      ...PUBLIC_ROUTES,
      ...LEARN_ROUTES,
      {
        element: <ProtectedRoute />,
        children: APP_ROUTES,
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
