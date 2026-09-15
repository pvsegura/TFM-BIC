# packages/shared

Cross-cutting pure utilities (formatting, general-purpose helpers) with no business rules and no
dependency on domain/application/data — safe to import from anywhere.

## What's here (M1)

`Brand<T, BrandName>` (nominal-typing helper backing `packages/domain`'s `LanguageId`) and
`assertNever` (exhaustiveness checking). Kept deliberately small — see the package description
above for what does _not_ belong here.
