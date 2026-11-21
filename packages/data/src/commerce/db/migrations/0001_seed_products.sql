-- Launch catalogue (prices are the recommended launch hypotheses in docs/product/verbysia/AUDITORIA-Y-PLAN.md §7,
-- in grosze, VAT included). No provider price ids yet: nothing is purchasable until a payment provider is configured.
-- A2, B1 and B2 stay 'draft' (not offered) until their content exists. Administrators change all of this in the panel.
INSERT INTO "products" ("id", "licence_kind", "billing", "status", "name_pl", "description_pl", "price_minor", "currency", "access_days", "provider_price_id", "sort_order", "created_at", "updated_at") VALUES
('premium-monthly', 'PREMIUM_MONTHLY', 'monthly', 'active', 'Verbysia Premium — miesięcznie', 'Wszystkie dostępne kursy, pełny trener pamięci i ćwiczenia. Odnawia się co miesiąc; możesz anulować w dowolnym momencie.', 4900, 'PLN', NULL, NULL, 10, now(), now()),
('premium-yearly', 'PREMIUM_YEARLY', 'yearly', 'active', 'Verbysia Premium — rocznie', 'Wszystko z planu miesięcznego na 12 miesięcy, płatne z góry. Odnawia się co rok; możesz anulować w dowolnym momencie.', 34900, 'PLN', NULL, NULL, 20, now(), now()),
('course-a1', 'COURSE_A1', 'one_off', 'active', 'Kurs hiszpańskiego A1', 'Pełny kurs A1 metodą PUENTE z jednorazową płatnością i dostępem bezterminowym.', 14900, 'PLN', NULL, NULL, 30, now(), now()),
('course-a2', 'COURSE_A2', 'one_off', 'draft', 'Kurs hiszpańskiego A2', 'Kurs A2 metodą PUENTE. W przygotowaniu.', 14900, 'PLN', NULL, NULL, 40, now(), now()),
('course-b1', 'COURSE_B1', 'one_off', 'draft', 'Kurs hiszpańskiego B1', 'Kurs B1 metodą PUENTE. W przygotowaniu.', 17900, 'PLN', NULL, NULL, 50, now(), now()),
('course-b2', 'COURSE_B2', 'one_off', 'draft', 'Kurs hiszpańskiego B2', 'Kurs B2 metodą PUENTE. W przygotowaniu.', 17900, 'PLN', NULL, NULL, 60, now(), now())
ON CONFLICT ("id") DO NOTHING;
