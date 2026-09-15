---
name: anti-hallucination
description: Mandatory verification discipline for any claim about external APIs, SDKs, versions, pricing, limits, or legal requirements. Use whenever writing docs, ADRs, or code that touches Hyperframes, Gemini, a DB provider, an email provider, hosting, or legal/compliance content.
---

# Anti-Hallucination Policy

This overrides any instinct to "fill in" plausible-sounding details.

## Never invent

APIs, SDKs, methods, endpoints, parameters, versions, documentation content, capabilities,
pricing, limits, third-party features, legal/regulatory requirements, vendor requirements.

## Process when a claim depends on an external product/service

1. Check official/current documentation (WebSearch/WebFetch) rather than relying on training-data
   memory, which may be stale for fast-moving products (this project explicitly involves two:
   Hyperframes and Gemini, both evolving).
2. Verify the version/status (e.g., Preview vs GA) actually referenced.
3. Verify compatibility/breaking changes if upgrading something already in use.
4. Record the source (URL) next to the claim.
5. State any remaining uncertainty explicitly.

## When something can't be verified

Write `UNKNOWN` — do not convert it into an assertion, and do not silently pick the
most-likely-sounding answer.

## When multiple valid solutions exist

Present as:

```
OPTION A — ...
OPTION B — ...
OPTION C — ...
```

with pros/cons/recommendation, not a silent single choice — unless the decision has already been
made and recorded in an ADR with `Status: ACCEPTED`.

## Legal/compliance content specifically

Never present generated legal text (GDPR, terms, privacy policy) as compliant or as legal advice.
Flag as `PENDING legal review`. See [docs/security/privacy-gdpr.md](../../../docs/security/privacy-gdpr.md)
for the pattern this project uses.

## Contradiction handling

If you find existing project material contradicting a verified fact or a stated constraint (e.g.,
a doc mentioning AWS when the project forbids it), **stop and report it** rather than silently
"fixing" or silently going along with it.
