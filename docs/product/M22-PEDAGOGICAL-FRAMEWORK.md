# M22 — Pedagogical framework for educational videos

What the video system is designed to do, why, and how sure we are. Every principle below names its evidence
and its strength. This is a design framework for a product, not a literature review; sources were checked on
2026-10-01 (links at the end). Where the evidence is weak or mixed, the framework says so and keeps the
design choice small and reversible.

Evidence strength used here:

- **Strong** — replicated experiments and/or meta-analyses in L2 learning or multimedia learning.
- **Moderate** — meta-analytic support with important moderators, or strong evidence from adjacent domains.
- **Practice** — established instructional practice with limited direct experimental evidence for this format.
- **Theory** — influential proposal, not settled empirically; used as a heuristic only.

## 1. Evidence reviewed and principles selected

| #   | Principle                                                                | Evidence                                                                                                                                                                                                                    | Strength                                             | Video design consequence                                                                                                                                                                                                    |
| --- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Retrieval beats re-exposure**                                          | Karpicke & Roediger 2008 (L2 word pairs: repeated retrieval ≈80% vs ≈35% recall a week later); Kang et al. 2013 (retrieval > "listen and repeat" for L2 words, immediate and 2-day tests, no loss of pronunciation quality) | Strong                                               | Every video has at least one **retrieval moment**: a cue (scene/picture), a silent pause, then the answer. "Listen and repeat" alone is not the default.                                                                    |
| 2   | **Pictures help only if overconfidence is countered**                    | Carpenter & Olson 2012: pictures did not beat translations until learners were warned and did retrieval; then pictures won                                                                                                  | Moderate                                             | Visual meaning is always **paired with retrieval** later in the same video; never a picture-only presentation.                                                                                                              |
| 3   | **Spacing**                                                              | Kim & Webb 2022 meta-analysis (48 experiments): spaced > massed for L2 vocabulary and grammar                                                                                                                               | Strong                                               | Within a video: introduce → use → **recall at the end** (expanding gaps). Across videos: the content model records target vocabulary ids so a future review feature can schedule them (no spaced-repetition engine in M22). |
| 4   | **Signaling / cueing**                                                   | Schneider et al. 2018 meta-analysis (103 studies): retention g≈0.53, transfer g≈0.33, lower cognitive load                                                                                                                  | Strong                                               | One highlighted thing at a time: the named object, the word card, the stressed syllable. No decorative arrows.                                                                                                              |
| 5   | **Segmenting**                                                           | Rey et al. 2019 meta-analysis: retention d≈0.32, transfer d≈0.36                                                                                                                                                            | Strong (small–medium)                                | Videos are built from **learning segments** (situation, target, form, conversation, retrieval, reuse, recap), each a scene with its own transition — not cuts every few seconds.                                            |
| 6   | **Temporal contiguity / coherence**                                      | Mayer's multimedia principles; overview in Noetel et al. 2022 (meta-meta-analysis)                                                                                                                                          | Strong                                               | Actions happen **while** they are spoken about; the timeline is built from the real audio durations. No background music, no unrelated motion.                                                                              |
| 7   | **Captions help L2 learners** (an L2-specific exception to "redundancy") | Montero Perez et al. 2013 meta-analysis: captions → large effects on L2 listening and vocabulary (g≈0.87 for vocabulary)                                                                                                    | Strong                                               | Captions on by default; transcript available but collapsed. On-screen text limited to the target phrase (and its meaning at the right moment).                                                                              |
| 8   | **Explicit, focused instruction works**                                  | Norris & Ortega 2000 meta-analysis: focused instruction → large gains; explicit > implicit                                                                                                                                  | Strong (lab-measure bias noted in later re-analyses) | After meaning is clear, a **short explicit "notice" segment** names the form (e.g. "one word, three uses"). Kept to 1–2 sentences.                                                                                          |
| 9   | **Feedback**                                                             | Lyster & Saito 2010 (classroom oral CF effective); Lee, Jang & Plonsky 2015 (pronunciation instruction larger with feedback)                                                                                                | Strong                                               | After each retrieval pause: the answer, said again, plus a short confirmation. A video cannot hear the learner, so feedback is **self-check** ("Did you say …?"), never fake praise.                                        |
| 10  | **Interaction and meaningful context**                                   | Mackey & Goo 2007 meta-analysis (interaction → large effects); communicative/task-based practice                                                                                                                            | Strong for interaction; Practice for video           | Target language is shown **inside a believable exchange** (a café, a street, a home), with the situation making the meaning clear. A video is not interaction — the exercises and future speaking features carry that.      |
| 11  | **Comprehensible input**                                                 | Krashen's Input Hypothesis                                                                                                                                                                                                  | Theory                                               | Used only as a heuristic: A1 scenes rely on visible situations, slow clear speech, and short lines.                                                                                                                         |
| 12  | **Noticing**                                                             | Schmidt 1990                                                                                                                                                                                                                | Theory (broadly influential)                         | Supports principle 8 and the signaling of forms.                                                                                                                                                                            |
| 13  | **Pronunciation instruction is effective**                               | Lee, Jang & Plonsky 2015 meta-analysis (d≈0.8–0.9); Saito & Plonsky 2019                                                                                                                                                    | Strong                                               | Pronunciation segments are part of lessons when the content has pronunciation notes, not an afterthought.                                                                                                                   |
| 14  | **Perception training transfers to production — modestly**               | Sakai & Moorman 2018 meta-analysis: perception d≈0.92, production d≈0.54                                                                                                                                                    | Moderate                                             | **Listen and discriminate first**, then a prompt to say it. No claim that watching improves speaking on its own.                                                                                                            |
| 15  | **Talker variability**                                                   | Thomson 2018 HVPT synthesis                                                                                                                                                                                                 | Strong (for perception training)                     | Contrasts are heard from **more than one voice** where the lesson has two characters; otherwise noted as a limitation (one synthetic voice per character).                                                                  |
| 16  | **Visual articulation helps when visible**                               | Hardison 2003; Hazan et al. 2005: audiovisual > audio-only training mainly for visually salient contrasts                                                                                                                   | Moderate                                             | A simplified mouth/tongue diagram only when the contrast is articulatory and the content describes it (e.g. sz vs ś). Labelled as a simplification; no clinical claims.                                                     |
| 17  | **Gestures**                                                             | Macedonia et al.: _performing_ iconic gestures improves L2 word memory; García-Gámez et al. 2024: performing > seeing                                                                                                       | Moderate                                             | Characters' gestures are **meaningful** (point, hand over, nod/shake), which aids comprehension. Watching a gesture is not assumed to aid memory by itself.                                                                 |
| 18  | **On-screen agents**                                                     | Castro-Alonso et al. 2021: agent presence helps a little; agent **gesturing and facial expression were not significant moderators**                                                                                         | Moderate                                             | Characters are present and act, but movement exists to carry meaning (principle 17), never as decoration.                                                                                                                   |
| 19  | **Short videos**                                                         | Guo, Kim & Rubin 2014 (engagement drops with length in MOOC data)                                                                                                                                                           | Moderate (engagement, not learning)                  | Word videos ~30–60 s; lesson videos ~2–4 min, split into segments.                                                                                                                                                          |

### Where evidence is uncertain (and what we do about it)

- **Synthetic voices for pronunciation models**: TTS quality for Polish was not measured; native-speaker
  review is PENDING. The videos say "synthesized voice" and the phonetics content still says to listen to
  native speakers.
- **Retrieval inside a passive video**: the cited studies required learners to actually attempt retrieval. A
  pause invites it but cannot enforce it; the prompt asks learners to say the answer aloud, and the exercises
  after the video provide enforced retrieval.
- **Gesture and character animation**: evidence favors _performed_ gestures; ours are watched. Kept for
  meaning, not claimed to improve memory.
- **Perception → production**: transfer is real but modest; videos model and prompt production, and say that
  speaking practice matters.

## 2. The learning sequence

Default for a lesson (adapted per lesson, never forced):

```
SITUATION ─► MEANING ─► TARGET ─► FORM ─► CONVERSATION ─► NOTICE ─► RETRIEVE ─► FEEDBACK ─► REUSE ─► RECALL
 (see it)   (understand) (hear it)  (notice)   (in use)     (name it)  (remember)  (check)   (new context) (spaced)
```

Default for a word:

```
CONTEXT ─► OBJECT/ACTION ─► WORD + SOUND ─► MEANING ─► EXAMPLE ─► 2nd CONTEXT ─► RETRIEVE ─► FEEDBACK ─► RECAP
```

Retrieval is used at high-value points only: once per word video, two to four times per lesson video, plus
a final recall. Pause length scales with level (A1: ~3.5 s; B1+: ~2.5 s).

## 3. Translation into video design rules

1. **Meaning first.** Show the situation and the object/action before naming it. The English meaning appears
   after the learner has seen it, as a small label, not as a paragraph.
2. **Real places.** Café, street, home, shop, station: drawn as simple, readable illustrations with the props
   the situation needs. No emoji, no floating heads, no generic icons as characters.
3. **Characters act.** They enter, point, hand things over, nod, shake their heads, look at each other.
   Mouths move only while that character speaks.
4. **One focus per moment.** The spoken target phrase appears once, near the speaker, with its meaning
   underneath — nothing else competes.
5. **Contiguity.** Every visual event is scheduled from the narration timeline (real clip durations).
6. **Retrieval moment.** The scene freezes on the cue, a prompt ("What does he say?"), a visible countdown in
   silence, then the answer is spoken and shown, then a self-check line.
7. **Recycling.** Target phrases return: introduced in the situation, named in the notice segment, retrieved,
   reused in a second context, recalled at the end.
8. **Honest language.** Only phrases that exist in the course content are spoken in the target language;
   scene plans are validated against the content at build time.
9. **No branding** inside videos; only the CEFR level.
10. **Accessibility.** Captions by default, transcript, readable type (≥ 28 px at 720p for spoken text),
    contrast per the site palette.

## 4. Different content types

| Type                                         | Emphasis                                                                                                                                    | Typical segments                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Vocabulary (concrete)                        | Object/action ↔ word ↔ sound; second context; retrieval with the picture as cue                                                             | context, word, meaning, example, second context, retrieval, recap |
| Vocabulary (social: greetings, polite words) | The _situation_ is the meaning (time of day, formality)                                                                                     | situation, phrase, contrast with another situation, retrieval     |
| Grammar                                      | Form shown in use, then named briefly; contrast pairs where the content provides them                                                       | situation, examples, notice (form highlighted), retrieval         |
| Pronunciation                                | Perception before production; syllables and stress from the content's respelling; articulatory contrast when described in phonetics content | listen, contrast, identify (retrieval), say it, word in context   |
| Conversation                                 | A believable exchange; turn-taking; gestures carry meaning                                                                                  | situation, conversation, notice, retrieval of a turn, replay      |

## 5. CEFR adaptation

| Level | Speech                                                   | Visual scaffolding                       | Retrieval                        | Explanation                                            |
| ----- | -------------------------------------------------------- | ---------------------------------------- | -------------------------------- | ------------------------------------------------------ |
| A1    | slow, clear, short lines, each target phrase heard twice | strong: objects and actions show meaning | cue = picture/scene; 3.5 s pause | one or two short sentences in the instruction language |
| A2    | clear, slightly longer exchanges                         | strong, fewer labels                     | cue = scene + partial phrase     | short                                                  |
| B1    | natural pace                                             | moderate; inference from context         | complete the turn                | concise, after use                                     |
| B2    | natural speed                                            | less; nuance in context                  | choose the appropriate response  | brief notice of nuance                                 |
| C1–C2 | authentic                                                | minimal; register, pragmatics            | interpret intent/register        | discourse-level notes                                  |

Polish now has text content for every level (A1–C2) but videos only for A1; the level parameters exist in the script model
(`pauseSeconds`, repetition count) so higher levels change behaviour, not just length.

## 6. Quality checklist (applied before publishing)

Objective (one, level-appropriate) · comprehension supported visually · target language clearly heard ·
attention directed (one focus) · vocabulary contextualized and reused · grammar shown in use, explained
briefly · pronunciation: perception, production prompt, stress where relevant · at least one retrieval
moment with self-check feedback · scene makes semantic sense · dialogue sounds natural and uses only course
language · characters act; no emoji · voice consistent per character within the lesson · screen not overloaded
· captions + transcript · CEFR level only (no branding).

## 7. Sources

- Karpicke, J. D., & Roediger, H. L. (2008). The critical importance of retrieval for learning. _Science, 319_.
  [PDF](http://psychnet.wustl.edu/memory/wp-content/uploads/2018/04/Karpicke-Roediger-2008_Sci.pdf)
- Kang, S. H. K., Gollan, T. H., & Pashler, H. (2013). Don't just repeat after me: Retrieval practice is better
  than imitation for foreign vocabulary learning. _Psychonomic Bulletin & Review_.
  [link](https://link.springer.com/article/10.3758/s13423-013-0450-z)
- Carpenter, S. K., & Olson, K. M. (2012). Are pictures good for learning new vocabulary in a foreign
  language? Only if you think they are not. _JEP: LMC_.
  [link](https://www.semanticscholar.org/paper/Are-pictures-good-for-learning-new-vocabulary-in-a-Carpenter-Olson/7f95e4a280af4ca4e71376a12cdfe957bef4ae2a)
- Kim, S. K., & Webb, S. (2022). The effects of spaced practice on second language learning: A meta-analysis.
  _Language Learning_. [link](https://www.researchgate.net/publication/358406370_The_Effects_of_Spaced_Practice_on_Second_Language_Learning_A_Meta-Analysis)
- Schneider, S., Beege, M., Nebel, S., & Rey, G. D. (2018). A meta-analysis of how signaling affects learning
  with media. _Educational Research Review, 23_. [link](https://www.learntechlib.org/p/204443/)
- Rey, G. D., et al. (2019). A meta-analysis of the segmenting effect. _Educational Psychology Review_.
  [link](https://link.springer.com/article/10.1007/s10648-018-9456-4)
- Noetel, M., et al. (2022). Multimedia design for learning: An overview of reviews with meta-meta-analysis.
  _Review of Educational Research_. [link](https://journals.sagepub.com/doi/abs/10.3102/00346543211052329)
- Montero Perez, M., Van den Noortgate, W., & Desmet, P. (2013). Captioned video for L2 listening and
  vocabulary learning: A meta-analysis. _System, 41_(3).
  [link](https://www.sciencedirect.com/science/article/abs/pii/S0346251X13001012)
- Norris, J. M., & Ortega, L. (2000). Effectiveness of L2 instruction: A research synthesis and quantitative
  meta-analysis. _Language Learning_. [link](https://eric.ed.gov/?id=EJ611436)
- Lyster, R., & Saito, K. (2010). Oral feedback in classroom SLA: A meta-analysis. _SSLA_.
  [link](https://www.cambridge.org/core/journals/studies-in-second-language-acquisition/article/abs/oral-feedback-in-classroom-sla/4999EE1C8379B2BF026B148EAF373CA1)
- Mackey, A., & Goo, J. (2007). Interaction research in SLA: A meta-analysis and research synthesis.
  [link](https://research.lancaster-university.uk/en/publications/interaction-research-in-sla-a-meta-analysis-and-research-synthesi/)
- Lee, J., Jang, J., & Plonsky, L. (2015). The effectiveness of second language pronunciation instruction: A
  meta-analysis. _Applied Linguistics, 36_(3). [link](https://experts.nau.edu/en/publications/the-effectiveness-of-second-language-pronunciation-instruction-a-/)
- Saito, K., & Plonsky, L. (2019). Effects of second language pronunciation teaching revisited. _Language
  Learning_. [link](https://onlinelibrary.wiley.com/doi/abs/10.1111/lang.12345)
- Sakai, M., & Moorman, C. (2018). Can perception training improve the production of second language
  phonemes? _Applied Psycholinguistics_. [link](https://www.researchgate.net/publication/320715653_Can_perception_training_improve_the_production_of_second_language_phonemes_A_meta-analytic_review_of_25_years_of_perception_training_research)
- Thomson, R. I. (2018). High variability [pronunciation] training (HVPT). _Journal of Second Language
  Pronunciation, 4_(2). [link](https://www.jbe-platform.com/content/journals/10.1075/jslp.17038.tho)
- Hazan, V., Sennema, A., Iba, M., & Faulkner, A. (2005). Effect of audiovisual perceptual training on the
  perception and production of consonants by Japanese learners of English. _Speech Communication, 47_.
  [link](https://www.sciencedirect.com/science/article/abs/pii/S0167639305000701)
- Macedonia, M., et al. — gestures and foreign-language vocabulary.
  [link](https://www.researchgate.net/publication/227828166_Body_in_Mind_How_Gestures_Empower_Foreign_Language_Learning);
  García-Gámez, A. B., et al. (2024). Seeing or acting? _Language Teaching Research_.
  [link](https://journals.sagepub.com/doi/abs/10.1177/13621688211024364)
- Castro-Alonso, J. C., Wong, R. M., Adesope, O. O., & Paas, F. (2021). Effectiveness of multimedia pedagogical
  agents predicted by diverse theories: A meta-analysis. _Educational Psychology Review, 33_.
  [PDF](https://pure.eur.nl/files/57710012/Castro_Alonso2021_Article_EffectivenessOfMultimediaPedag.pdf)
- Guo, P. J., Kim, J., & Rubin, R. (2014). How video production affects student engagement: An empirical study
  of MOOC videos. _L@S '14_. [link](https://pure.kaist.ac.kr/en/publications/how-video-production-affects-student-engagement-an-empirical-stud/)
- Theory: Krashen (Input Hypothesis), Schmidt (1990, Noticing), Swain (Output), Mayer (Cognitive Theory of
  Multimedia Learning), Sweller (Cognitive Load Theory) — cited as frameworks, not as settled findings.
