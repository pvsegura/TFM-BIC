# TFM-BIC 
- Trabajo de Fin de Master Desarrollod de Software con AI de BIC

- Descripción: Aplicación para aprender idiomas con videos y de forma interactiva, con ejercicios y con gamificación. Tendrás un Dashboard para el alumno con los logros conseguidos y los ejercicios y videos realizados. Tambén otro Dashboard para profesores, para que puedan ver los resultados de varios alumnos y organizar clases.

# Tegnologías

- Front-End: React, TypeScript, Vite, Tailwind
- Back-End: Node.js, TypeScript
- DB: PostgreSQL (remoto, gestionado — proveedor por decidir, ver [ADR-005](docs/adr/adr-005-database.md); **sin AWS**)
- Testing: Vitest, React Testing Library, Husky (hooks), Playwright
- Assistants: Claude (código), Gemini (audio de contenido), ChatGPT (información general y prompts)

# DevOps

- Jenkins
- SonarQube

# Arquitectura
- Clean Architecture + Hexagonal + modular monolith

> Nota: la base de datos se especificó inicialmente como DynamoDB (AWS); tras el Milestone 0 se
> fijó **PostgreSQL remoto, sin AWS**, como restricción de gobernanza del proyecto. Ver
> [docs/product/project-constitution.md](docs/product/project-constitution.md).

# Documentación del proyecto

Este repositorio sigue una gobernanza de arquitectura documentada en `docs/` y `.claude/`:

- [Project Constitution](docs/product/project-constitution.md) — principios no negociables.
- [Architecture Decision Records](docs/adr/README.md) — decisiones técnicas (`ACCEPTED` / `PENDING`).
- [Risk Register](docs/risk-register.md)
- [.claude/current-state.md](.claude/current-state.md) — qué existe realmente hoy en el repo.


