# Codex Batch Prompt

Use this batch to generate Mathematics report comments in the teacher voice below.

## Objective

Write one polished report comment per learner for B. Joseph.

## Constraints

1. Use only the evidence present in the persona, the optional subject context, and the learner marks provided below.
2. Do not invent achievements, concerns, or behavioural claims that are not supported by the marks/persona/context.
3. Keep each comment to one paragraph.
4. Keep teacher voice consistent across the batch.
5. Avoid robotic repetition across the batch; vary opener families, sentence count, sentence order, and closing style.
6. Do not lock the whole batch into one repeated shape such as strength -> overall judgment -> next step -> encouragement -> reflection.
7. If section-level evidence is present, name 1 to 2 genuine strengths from the strongest available sections and exactly 1 main development area from the weakest meaningful section.
8. Ignore blank or omitted assessment sections completely.
9. When the subject context flags Review 2 as a Grade 4 rounding skill, frame weaker Review 2 performance as a developmental foundation still being learned.
10. If a learner has any mark below 50% or any additional review-threshold area below 60%, include explicit parent-facing support language.
11. Return valid JSON only in this structure:

```json
[
  {
    "name": "Learner Name",
    "class": "5A",
    "generatedComment": "Single polished paragraph",
    "riskAreas": ["Overall (49%) - below pass mark"],
    "parentAlertRequired": true
  }
]
```

## Teacher Persona

- Teacher: B. Joseph
- Subject: Mathematics
- Batch: bj_4s_maths_term1_2026
- Review threshold: below 60%
- Tone: highly encouraging, aspirational, direct about effort and habits, personal, observant, future-oriented
- Vocabulary: learner, year, afrikaans, grade, proud, work, study, positive, young, term, average, final, attitude, maintained, exam, excited, skills, extra, lady, throughout, confidence, good, habits, pleased, solid, efforts, journey, maintain, potential, support, assessments, class, continue, ethic, improved, increased, managed, methods, performance, responded
- Structure: Usually 3.4 sentences in one paragraph; opens with an overall performance or growth judgment; often includes evidence about attitude, maturity, effort, or aggregate movement; frequently adds a concrete improvement target or study habit; usually closes with encouragement, gratitude, or a next-year transition.
- Formatting: Uses South African/British English spelling and classroom phrasing. Comfortably references percentages, average bands, and stretch targets when motivating learners. Uses exclamation marks for emphasis and praise more than the lightweight persona builder assumes. Frequently uses direct address terms such as "young man", "young lady", or Afrikaans praise closers.

## Subject Context

- Context: Grade 4 Term 1 Mathematics
- Drafting rules:
  - Use only evidence visible in the provided marks/context.
  - Ignore omitted or blank assessment sections completely.
  - Mention 1 to 2 genuine strengths drawn from the strongest available assessment sections.
  - Mention exactly 1 main development area drawn from the weakest meaningful available section.
  - Do not switch addressee inside the closing. If the encouragement line addresses the learner directly, any follow-up reflection sentence must stay in second person. If using third person, keep the whole closing in third person.
  - Avoid unsupported claims about: organisation, homework, participation, focus
- Assessment interpretation:
  - Review 1: Place value, ordering, comparing, and 4-digit number understanding.
  - Review 2: Rounding 4-digit numbers to 10, 100, and 1000. This is a key Grade 4 foundational skill and should be framed developmentally when weaker.
  - Investigation: Word sums and number patterns.
  - Term Test: Combined application of the term's concepts.
  - TimesTables1: Times tables fluency. Mention only when this section is present in the marks row.
  - TimesTables2: Times tables fluency. Mention only when this section is present in the marks row.
- Review 2 wording guidance:
  - is still getting to grips with rounding 4-digit numbers
  - would benefit from continued practice in rounding to 10, 100, and 1000
  - needs more confidence when rounding larger numbers accurately
- Assessment language thresholds:
  - >= 85: strong, very strong, secure, confident
  - 70 to 84.9: good, solid, steady understanding
  - 55 to 69.9: developing, growing in confidence, needs more consistency
  - < 55: still getting to grips with, needs focused practice, needs a stronger foundation
- Anti-repetition controls:
  - Do not use exact opener: has had a very good Mathematics term
  - Do not use any opener family more than 3 times in one batch.
  - Do not repeat the exact same encouragement line in adjacent comments.
  - Rotate opener families such as:
    - [Name] demonstrates a strong understanding of ...
    - [Name] has made steady progress in ...
    - [Name] is growing in confidence with ...
    - [Name] has shown secure understanding in ...
    - [Name] is capable of good Mathematics work and has shown ...
    - [Name] is still getting to grips with ...
    - [Name] has built a solid understanding of ...
    - [Name] applies the term's concepts well in ...
  - Rotate closing families such as:
    - Keep up the good work, [Name]!
    - Keep up the great work, [Name]!
    - Keep working hard, [Name]!
    - Well done on your effort, [Name]!

## Batch Structure Diversity

- Goals:
  - Do not let the full batch settle into one repeated sentence rhythm.
  - Vary the position of strengths, development points, and the final close so the comments do not read like a template run.
  - Avoid letting the full batch settle into one repeated sentence rhythm.
  - Vary where strengths, development points, and the final close appear so the comments do not sound templated when read in sequence.
- Allowed comment shapes:
  - Strength-led: strongest assessed section first, then a next step, then a concise close.
  - Progress-led: progress or growing confidence first, then evidence, then a practical target.
  - Development-balanced: development area introduced early, then balanced with a credible strength and supportive close.
  - Consolidated: strength and overall judgment merged into one sentence, followed by a next step and a short ending.
  - High-attainment: strongest sections first, then one fine-tuning target without overstating concern.
  - Progress-led: progress or confidence first, then evidence, then a practical target.
  - Development-balanced: a weaker area is introduced early, then balanced with a clear strength and supportive ending.
  - Consolidated: strength and overall judgment are merged into one sentence before the next step.
  - High-attainment: strongest sections first, then one fine-tuning target without overplaying concern.
- Rotation rules:
  - Mix 3-, 4-, and 5-sentence comments across the batch when natural.
  - Do not give every learner a separate overall-result sentence.
  - Move the development point earlier in some comments and later in others.
  - Use teacher-reflection lines selectively rather than automatically in every comment.
- Closing variation:
  - Some comments may end with direct encouragement only.
  - Some comments may end with a teacher reflection only.
  - Some comments may combine encouragement and reflection, but not in every row.

## Learner Marks

1. Akeem Ally | class: 4S | Overall: 82%
   - summaryScores: achievementLevel: 7 | classwork: 81.5% | tests: 82.6%
   - sectionEvidence: Review 1 - Place Value, Ordering Numbers, Comparing Numbers up to 4 digits: 79.17% | Review 2 - Rounding Numbers up to 4 digits to 10, 100, 1000: 84% | Investigation - Word Sums / Number patterns: 80.95% | TimesTables1 - Times tables fluency: 100% | Term Test - Combination of all concepts: 76.25% | TimesTables2 - Times tables fluency: 95%
2. Jama Booi | class: 4S | Overall: 90.1%
   - summaryScores: achievementLevel: 7 | classwork: 84.7% | tests: 98.3%
   - sectionEvidence: Review 1 - Place Value, Ordering Numbers, Comparing Numbers up to 4 digits: 83.33% | Review 2 - Rounding Numbers up to 4 digits to 10, 100, 1000: 84% | Investigation - Word Sums / Number patterns: 85.71% | TimesTables1 - Times tables fluency: 100% | Term Test - Combination of all concepts: 97.5% | TimesTables2 - Times tables fluency: 100%
3. Micah Coutts | class: 4S | Overall: 92.1%
   - summaryScores: achievementLevel: 7 | classwork: 90.3% | tests: 94.8%
   - sectionEvidence: Review 1 - Place Value, Ordering Numbers, Comparing Numbers up to 4 digits: 87.5% | Review 2 - Rounding Numbers up to 4 digits to 10, 100, 1000: 92% | Investigation - Word Sums / Number patterns: 90.48% | TimesTables1 - Times tables fluency: 100% | Term Test - Combination of all concepts: 92.5% | TimesTables2 - Times tables fluency: 100%
4. Caitlin de Beer | class: 4S | Overall: 85.1%
   - summaryScores: achievementLevel: 7 | classwork: 80.3% | tests: 92.3%
   - sectionEvidence: Review 1 - Place Value, Ordering Numbers, Comparing Numbers up to 4 digits: 79.17% | Review 2 - Rounding Numbers up to 4 digits to 10, 100, 1000: 80% | Investigation - Word Sums / Number patterns: 80.95% | TimesTables1 - Times tables fluency: 95% | Term Test - Combination of all concepts: 90% | TimesTables2 - Times tables fluency: 100%
5. Vidya Govender | class: 4S | Overall: 70.4%
   - summaryScores: achievementLevel: 6 | classwork: 66.2% | tests: 76.8%
   - sectionEvidence: Review 1 - Place Value, Ordering Numbers, Comparing Numbers up to 4 digits: 62.5% | Review 2 - Rounding Numbers up to 4 digits to 10, 100, 1000: 68% | Investigation - Word Sums / Number patterns: 66.67% | TimesTables1 - Times tables fluency: 85% | Term Test - Combination of all concepts: 70% | TimesTables2 - Times tables fluency: 100%
6. Noah Jordan | class: 4S | Overall: 70.3%
   - summaryScores: achievementLevel: 6 | classwork: 65.6% | tests: 77.4%
   - sectionEvidence: Review 1 - Place Value, Ordering Numbers, Comparing Numbers up to 4 digits: 83.33% | Review 2 - Rounding Numbers up to 4 digits to 10, 100, 1000: 44% | Investigation - Word Sums / Number patterns: 71.43% | TimesTables1 - Times tables fluency: 80% | Term Test - Combination of all concepts: 76.25% | TimesTables2 - Times tables fluency: 80%
7. Ngcwalisa Kumbaca | class: 4S | Overall: 82.8%
   - summaryScores: achievementLevel: 7 | classwork: 81.1% | tests: 85.4%
   - sectionEvidence: Review 1 - Place Value, Ordering Numbers, Comparing Numbers up to 4 digits: 83.33% | Review 2 - Rounding Numbers up to 4 digits to 10, 100, 1000: 80% | Investigation - Word Sums / Number patterns: 80.95% | TimesTables1 - Times tables fluency: 95% | Term Test - Combination of all concepts: 81.25% | TimesTables2 - Times tables fluency: 95%
8. Carlo Lavezzari Prieto | class: 4S | Overall: 97.6%
   - summaryScores: achievementLevel: 7 | classwork: 100% | tests: 93.9%
   - sectionEvidence: Review 2 - Rounding Numbers up to 4 digits to 10, 100, 1000: 100% | Investigation - Word Sums / Number patterns: 100% | TimesTables1 - Times tables fluency: 100% | Term Test - Combination of all concepts: 91.25% | TimesTables2 - Times tables fluency: 100%
9. Thenji Mabandla | class: 4S | Overall: 55.4%
   - summaryScores: achievementLevel: 4 | classwork: 56% | tests: 54.5%
   - sectionEvidence: Review 1 - Place Value, Ordering Numbers, Comparing Numbers up to 4 digits: 41.67% | Review 2 - Rounding Numbers up to 4 digits to 10, 100, 1000: 16% | Investigation - Word Sums / Number patterns: 85.71% | TimesTables1 - Times tables fluency: 50% | Term Test - Combination of all concepts: 57.5% | TimesTables2 - Times tables fluency: 45%
   - riskHints: Overall (55.4%) - below review threshold (60%)
10. Mya Mac Ewan | class: 4S | Overall: 75.2%
   - summaryScores: achievementLevel: 6 | classwork: 67.6% | tests: 86.5%
   - sectionEvidence: Review 1 - Place Value, Ordering Numbers, Comparing Numbers up to 4 digits: 87.5% | Review 2 - Rounding Numbers up to 4 digits to 10, 100, 1000: 56% | Investigation - Word Sums / Number patterns: 66.67% | TimesTables1 - Times tables fluency: 90% | Term Test - Combination of all concepts: 85% | TimesTables2 - Times tables fluency: 90%
11. Ayana Macingwane | class: 4S | Overall: 96.8%
   - summaryScores: achievementLevel: 7 | classwork: 99.2% | tests: 93.1%
   - sectionEvidence: Review 1 - Place Value, Ordering Numbers, Comparing Numbers up to 4 digits: 95.83% | Review 2 - Rounding Numbers up to 4 digits to 10, 100, 1000: 100% | Investigation - Word Sums / Number patterns: 100% | TimesTables1 - Times tables fluency: 95% | Term Test - Combination of all concepts: 91.25% | TimesTables2 - Times tables fluency: 100%
12. Shiba Masoga | class: 4S | Overall: 81.2%
   - summaryScores: achievementLevel: 7 | classwork: 76% | tests: 89%
   - sectionEvidence: Review 1 - Place Value, Ordering Numbers, Comparing Numbers up to 4 digits: 87.5% | Review 2 - Rounding Numbers up to 4 digits to 10, 100, 1000: 68% | Investigation - Word Sums / Number patterns: 76.19% | TimesTables1 - Times tables fluency: 85% | Term Test - Combination of all concepts: 87.5% | TimesTables2 - Times tables fluency: 100%
13. Likuye Mdludlu | class: 4S | Overall: 77.3%
   - summaryScores: achievementLevel: 6 | classwork: 85.2% | tests: 65.5%
   - sectionEvidence: Review 1 - Place Value, Ordering Numbers, Comparing Numbers up to 4 digits: 91.67% | Review 2 - Rounding Numbers up to 4 digits to 10, 100, 1000: 80% | Investigation - Word Sums / Number patterns: 85.71% | TimesTables1 - Times tables fluency: 95% | Term Test - Combination of all concepts: 55% | TimesTables2 - Times tables fluency: 85%
14. Niyole Mhlauli | class: 4S | Overall: 92.3%
   - summaryScores: achievementLevel: 7 | classwork: 94.4% | tests: 89.3%
   - sectionEvidence: Review 1 - Place Value, Ordering Numbers, Comparing Numbers up to 4 digits: 95.83% | Review 2 - Rounding Numbers up to 4 digits to 10, 100, 1000: 92% | Investigation - Word Sums / Number patterns: 95.24% | TimesTables1 - Times tables fluency: 80% | Term Test - Combination of all concepts: 90% | TimesTables2 - Times tables fluency: 95%
15. Yanda Mlalandle | class: 4S | Overall: 83.5%
   - summaryScores: achievementLevel: 7 | classwork: 86.4% | tests: 79.3%
   - sectionEvidence: Review 1 - Place Value, Ordering Numbers, Comparing Numbers up to 4 digits: 91.67% | Review 2 - Rounding Numbers up to 4 digits to 10, 100, 1000: 84% | Investigation - Word Sums / Number patterns: 85.71% | TimesTables1 - Times tables fluency: 95% | Term Test - Combination of all concepts: 72.5% | TimesTables2 - Times tables fluency: 95%
16. Madison Muller | class: 4S | Overall: 88.3%
   - summaryScores: achievementLevel: 7 | classwork: 91.2% | tests: 84%
   - sectionEvidence: Review 1 - Place Value, Ordering Numbers, Comparing Numbers up to 4 digits: 91.67% | Review 2 - Rounding Numbers up to 4 digits to 10, 100, 1000: 92% | Investigation - Word Sums / Number patterns: 90.48% | TimesTables1 - Times tables fluency: 85% | Term Test - Combination of all concepts: 82.5% | TimesTables2 - Times tables fluency: 90%
17. Zimi Ndongeni | class: 4S | Overall: 79.3%
   - summaryScores: achievementLevel: 6 | classwork: 79.9% | tests: 78.4%
   - sectionEvidence: Review 1 - Place Value, Ordering Numbers, Comparing Numbers up to 4 digits: 83.33% | Review 2 - Rounding Numbers up to 4 digits to 10, 100, 1000: 76% | Investigation - Word Sums / Number patterns: 80.95% | TimesTables1 - Times tables fluency: 80% | Term Test - Combination of all concepts: 78.75% | TimesTables2 - Times tables fluency: 75%
18. Ukho Ndyulo | class: 4S | Overall: 66.7%
   - summaryScores: achievementLevel: 5 | classwork: 60.8% | tests: 75.6%
   - sectionEvidence: Review 1 - Place Value, Ordering Numbers, Comparing Numbers up to 4 digits: 83.33% | Review 2 - Rounding Numbers up to 4 digits to 10, 100, 1000: 44% | Investigation - Word Sums / Number patterns: 61.9% | TimesTables1 - Times tables fluency: 100% | Term Test - Combination of all concepts: 66.25% | TimesTables2 - Times tables fluency: 95%
19. Ngcwele Sikukula | class: 4S | Overall: 74%
   - summaryScores: achievementLevel: 6 | classwork: 75.5% | tests: 71.6%
   - sectionEvidence: Review 1 - Place Value, Ordering Numbers, Comparing Numbers up to 4 digits: 79.17% | Review 2 - Rounding Numbers up to 4 digits to 10, 100, 1000: 72% | Investigation - Word Sums / Number patterns: 76.19% | Term Test - Combination of all concepts: 68.75% | TimesTables2 - Times tables fluency: 85%
20. Olo Siyongwana | class: 4S | Overall: 58.4%
   - summaryScores: achievementLevel: 4 | classwork: 56.3% | tests: 61.5%
   - sectionEvidence: Review 1 - Place Value, Ordering Numbers, Comparing Numbers up to 4 digits: 66.67% | Review 2 - Rounding Numbers up to 4 digits to 10, 100, 1000: 48% | Investigation - Word Sums / Number patterns: 57.14% | TimesTables1 - Times tables fluency: 90% | Term Test - Combination of all concepts: 52.5% | TimesTables2 - Times tables fluency: 75%
   - riskHints: Overall (58.4%) - below review threshold (60%)
21. Nola-Maria Smith | class: 4S | Overall: 88.4%
   - summaryScores: achievementLevel: 7 | classwork: 91.5% | tests: 83.8%
   - sectionEvidence: Review 1 - Place Value, Ordering Numbers, Comparing Numbers up to 4 digits: 87.5% | Review 2 - Rounding Numbers up to 4 digits to 10, 100, 1000: 96% | Investigation - Word Sums / Number patterns: 90.48% | TimesTables1 - Times tables fluency: 90% | Term Test - Combination of all concepts: 80% | TimesTables2 - Times tables fluency: 95%
22. Buqaqawuli Somtsewu | class: 4S | Overall: 59%
   - summaryScores: achievementLevel: 4 | classwork: 55.1% | tests: 64.8%
   - sectionEvidence: Review 1 - Place Value, Ordering Numbers, Comparing Numbers up to 4 digits: 66.67% | Review 2 - Rounding Numbers up to 4 digits to 10, 100, 1000: 36% | Investigation - Word Sums / Number patterns: 61.9% | TimesTables1 - Times tables fluency: 85% | Term Test - Combination of all concepts: 55% | TimesTables2 - Times tables fluency: 90%
   - riskHints: Overall (59%) - below review threshold (60%)
23. Ntando Zengethwa | class: 4S | Overall: 66.5%
   - summaryScores: achievementLevel: 5 | classwork: 65.8% | tests: 67.4%
   - sectionEvidence: Review 1 - Place Value, Ordering Numbers, Comparing Numbers up to 4 digits: 66.67% | Review 2 - Rounding Numbers up to 4 digits to 10, 100, 1000: 56% | Investigation - Word Sums / Number patterns: 71.43% | TimesTables1 - Times tables fluency: 70% | Term Test - Combination of all concepts: 66.25% | TimesTables2 - Times tables fluency: 70%

