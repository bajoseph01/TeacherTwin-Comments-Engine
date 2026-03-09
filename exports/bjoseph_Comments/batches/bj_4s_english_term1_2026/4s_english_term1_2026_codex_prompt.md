# Codex Batch Prompt

Use this batch to generate English report comments in the teacher voice below.

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
10. If a learner has any mark below 50% or any additional review-threshold area below 55%, include explicit parent-facing support language.
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
- Subject: English
- Batch: 4S_English_Term1_2026
- Review threshold: below 55%
- Tone: highly encouraging, aspirational, direct about effort and habits, personal, observant, future-oriented
- Vocabulary: learner, year, afrikaans, grade, proud, work, study, positive, young, term, average, final, attitude, maintained, exam, excited, skills, extra, lady, throughout, confidence, good, habits, pleased, solid, efforts, journey, maintain, potential, support, assessments, class, continue, ethic, improved, increased, managed, methods, performance, responded
- Structure: Usually 3.4 sentences in one paragraph; opens with an overall performance or growth judgment; often includes evidence about attitude, maturity, effort, or aggregate movement; frequently adds a concrete improvement target or study habit; usually closes with encouragement, gratitude, or a next-year transition.
- Formatting: Uses South African/British English spelling and classroom phrasing. Comfortably references percentages, average bands, and stretch targets when motivating learners. Uses exclamation marks for emphasis and praise more than the lightweight persona builder assumes. Frequently uses direct address terms such as "young man", "young lady", or Afrikaans praise closers.

## Subject Context

- Context: Grade 4S Term 1 English
- Drafting rules:
  - Use only evidence visible in the provided marks/context.
  - Ignore omitted or blank assessment sections completely.
  - Lead with 1 to 2 genuine strengths from the strongest English sections, then connect them to the learner's term voice or writing evidence where it is safe to do so.
  - Use one main next step only, based on the weakest meaningful English section or the writing-needs note from the 4S voice reference when it aligns with the marks.
  - Avoid unsupported claims about: behaviour claims not shown in the marks or voice reference, private home details, comparisons to previous terms or future grades in a way that implies prior English reports
- Assessment interpretation:
  - Language Test: Use this for formal language-conventions performance, including grammar, punctuation, and written-language control. If this is weak, frame it as language accuracy or editing that still needs steady practice.
  - Spelling: Use this for spelling accuracy across the term. If this is stronger than the language test, you may note that basic word knowledge is stronger than full language accuracy.
  - Speaking: Use this for oral confidence and spoken expression.
  - Unprepared Reading: Use this for fluency, accuracy, and confidence when reading unseen text aloud.
  - Listening Comprehension: Use this for attentive listening and understanding spoken information.
  - Comprehension: Use this for understanding written texts and answering about meaning.
  - Read and View: Use this for class reading and viewing tasks that show engagement with texts.
  - Writing: Use this for written English tasks and written-expression quality.
- Assessment language thresholds:
  - 85-100: very strong, confident, secure
  - 70-84.9: good, steady, developing well
  - 60-69.9: fair, in progress, starting to settle
  - 0-59.9: needs more consistency, will benefit from support, still being developed
- Anti-repetition controls:
  - Do not use exact opener: has produced a pleasing English performance in this first term
  - Do not use exact opener: has had a good first term in English
  - Do not use any opener family more than 4 times in one batch.
  - Do not let neighbouring learners start with the same sentence skeleton or end with the same encouragement line.
  - Rotate opener families such as:
    - Name + strongest English section first
    - Name + writing voice / personal detail first, then academic evidence
    - Reading or oral confidence first, then writing next step
    - Balanced sentence that joins two strengths before the development point
  - Rotate closing families such as:
    - short teacher-confidence close
    - encouraging learner-facing close
    - measured term-one confidence close without future-grade comparison

## Batch Structure Diversity

- Goals:
  - Do not let the full batch settle into one repeated sentence rhythm.
  - Vary the position of strengths, development points, and the final close so the comments do not read like a template run.
  - Keep the batch chat-first, warm, and personalised without losing marks accuracy.
  - Use one safe personal sentence for most learners, but skip it when the match is weak or too private.
- Allowed comment shapes:
  - Strength-led: strongest assessed section first, then a next step, then a concise close.
  - Progress-led: progress or growing confidence first, then evidence, then a practical target.
  - Development-balanced: development area introduced early, then balanced with a credible strength and supportive close.
  - Consolidated: strength and overall judgment merged into one sentence, followed by a next step and a short ending.
  - High-attainment: strongest sections first, then one fine-tuning target without overstating concern.
  - Academic-first then personal line then next step.
  - Personal line first when the writing voice evidence is especially strong, then academic evidence.
  - Reading/oral strength first, followed by writing-development advice.
  - Concise high-attainment shape with one fine-tuning target.
- Rotation rules:
  - Mix 3-, 4-, and 5-sentence comments across the batch when natural.
  - Do not give every learner a separate overall-result sentence.
  - Move the development point earlier in some comments and later in others.
  - Use teacher-reflection lines selectively rather than automatically in every comment.
  - Mix 3-, 4-, and 5-sentence comments across the class.
  - Move the next-step sentence earlier in some comments and later in others.
- Closing variation:
  - Some comments may end with direct encouragement only.
  - Some comments may end with a teacher reflection only.
  - Some comments may combine encouragement and reflection, but not in every row.
  - Some comments should end with simple encouragement only.
  - Some comments should end with teacher confidence or pride, but not in every row.

## Learner Marks

1. Akeem Ally | class: 4S | Overall: 88.2%
   - summaryScores: language: 93.6% | oral: 81.7% | reading: 89.6% | writing: 86.7% | achievementLevel: 7
   - sectionEvidence: Language Test - Language conventions and formal English test work: 92% | Spelling - Weekly spelling accuracy across the term: 100% | Speaking - Prepared oral speaking task: 85% | Unprepared Reading - Unseen reading fluency and accuracy: 66.7% | Listening Comprehension - Listening, recall, and response: 90% | Comprehension - Reading comprehension and test comprehension: 89% | Read and View - Class reading and viewing tasks: 90.1% | Writing - Written English tasks: 86.7%
2. Jama Booi | class: 4S | Overall: 86.1%
   - summaryScores: language: 90% | oral: 72.5% | reading: 89.8% | writing: 86.7% | achievementLevel: 7
   - sectionEvidence: Language Test - Language conventions and formal English test work: 90% | Spelling - Weekly spelling accuracy across the term: 89.9% | Speaking - Prepared oral speaking task: 70% | Unprepared Reading - Unseen reading fluency and accuracy: 60% | Listening Comprehension - Listening, recall, and response: 90% | Comprehension - Reading comprehension and test comprehension: 89.5% | Read and View - Class reading and viewing tasks: 90% | Writing - Written English tasks: 86.7%
3. Micah Coutts | class: 4S | Overall: 88.2%
   - summaryScores: language: 84% | oral: 85.8% | reading: 94% | writing: 86.7% | achievementLevel: 7
   - sectionEvidence: Language Test - Language conventions and formal English test work: 80% | Spelling - Weekly spelling accuracy across the term: 100% | Speaking - Prepared oral speaking task: 85% | Unprepared Reading - Unseen reading fluency and accuracy: 73.3% | Listening Comprehension - Listening, recall, and response: 100% | Comprehension - Reading comprehension and test comprehension: 93% | Read and View - Class reading and viewing tasks: 95% | Writing - Written English tasks: 86.7%
4. Caitlin de Beer | class: 4S | Overall: 82.1%
   - summaryScores: language: 74% | oral: 81.7% | reading: 95.6% | writing: 75% | achievementLevel: 7
   - sectionEvidence: Language Test - Language conventions and formal English test work: 70% | Spelling - Weekly spelling accuracy across the term: 90.1% | Speaking - Prepared oral speaking task: 80% | Unprepared Reading - Unseen reading fluency and accuracy: 66.7% | Listening Comprehension - Listening, recall, and response: 100% | Comprehension - Reading comprehension and test comprehension: 94.5% | Read and View - Class reading and viewing tasks: 96.6% | Writing - Written English tasks: 75%
5. Vidya Govender | class: 4S | Overall: 85.9%
   - summaryScores: language: 91.3% | oral: 82.5% | reading: 83.1% | writing: 86.7% | achievementLevel: 7
   - sectionEvidence: Language Test - Language conventions and formal English test work: 90% | Spelling - Weekly spelling accuracy across the term: 96.7% | Speaking - Prepared oral speaking task: 85% | Unprepared Reading - Unseen reading fluency and accuracy: 60% | Listening Comprehension - Listening, recall, and response: 100% | Comprehension - Reading comprehension and test comprehension: 69.5% | Read and View - Class reading and viewing tasks: 96.6% | Writing - Written English tasks: 86.7%
6. Noah Jordan | class: 4S | Overall: 68.9%
   - summaryScores: language: 44.6% | oral: 72.5% | reading: 76% | writing: 75% | achievementLevel: 5
   - sectionEvidence: Language Test - Language conventions and formal English test work: 40% | Spelling - Weekly spelling accuracy across the term: 63.1% | Speaking - Prepared oral speaking task: 70% | Unprepared Reading - Unseen reading fluency and accuracy: 80% | Listening Comprehension - Listening, recall, and response: 90% | Comprehension - Reading comprehension and test comprehension: 62% | Read and View - Class reading and viewing tasks: 90% | Writing - Written English tasks: 75%
7. Ngcwalisa Kumbaca | class: 4S | Overall: 88.3%
   - summaryScores: language: 90.4% | oral: 81.7% | reading: 92% | writing: 86.7% | achievementLevel: 7
   - sectionEvidence: Language Test - Language conventions and formal English test work: 88% | Spelling - Weekly spelling accuracy across the term: 100% | Speaking - Prepared oral speaking task: 80% | Unprepared Reading - Unseen reading fluency and accuracy: 66.7% | Listening Comprehension - Listening, recall, and response: 100% | Comprehension - Reading comprehension and test comprehension: 84% | Read and View - Class reading and viewing tasks: 100% | Writing - Written English tasks: 86.7%
8. Carlo Lavezzari Prieto | class: 4S | Overall: 86.9%
   - summaryScores: language: 83.8% | oral: 81.7% | reading: 81.5% | writing: 95% | achievementLevel: 7
   - sectionEvidence: Language Test - Language conventions and formal English test work: 86% | Spelling - Weekly spelling accuracy across the term: 75.2% | Speaking - Prepared oral speaking task: 85% | Unprepared Reading - Unseen reading fluency and accuracy: 66.7% | Listening Comprehension - Listening, recall, and response: 90% | Comprehension - Reading comprehension and test comprehension: 78% | Read and View - Class reading and viewing tasks: 84.9% | Writing - Written English tasks: 95%
9. Thenji Mabandla | class: 4S | Overall: 82.7%
   - summaryScores: language: 84.2% | oral: 72.5% | reading: 82.4% | writing: 86.7% | achievementLevel: 7
   - sectionEvidence: Language Test - Language conventions and formal English test work: 88% | Spelling - Weekly spelling accuracy across the term: 76.9% | Speaking - Prepared oral speaking task: 70% | Unprepared Reading - Unseen reading fluency and accuracy: 60% | Listening Comprehension - Listening, recall, and response: 90% | Comprehension - Reading comprehension and test comprehension: 71.5% | Read and View - Class reading and viewing tasks: 93.3% | Writing - Written English tasks: 86.7%
10. Mya Mac Ewan | class: 4S | Overall: 80.2%
   - summaryScores: language: 87.7% | oral: 81.7% | reading: 66.8% | writing: 86.7% | achievementLevel: 7
   - sectionEvidence: Language Test - Language conventions and formal English test work: 88% | Spelling - Weekly spelling accuracy across the term: 86.6% | Speaking - Prepared oral speaking task: 80% | Unprepared Reading - Unseen reading fluency and accuracy: 66.7% | Listening Comprehension - Listening, recall, and response: 100% | Comprehension - Reading comprehension and test comprehension: 73.5% | Read and View - Class reading and viewing tasks: 100% | Writing - Written English tasks: 86.7%
11. Ayana Macingwane | class: 4S | Overall: 89.4%
   - summaryScores: language: 95.2% | oral: 83.3% | reading: 92% | writing: 86.7% | achievementLevel: 7
   - sectionEvidence: Language Test - Language conventions and formal English test work: 94% | Spelling - Weekly spelling accuracy across the term: 100% | Speaking - Prepared oral speaking task: 80% | Unprepared Reading - Unseen reading fluency and accuracy: 73.3% | Listening Comprehension - Listening, recall, and response: 100% | Comprehension - Reading comprehension and test comprehension: 84% | Read and View - Class reading and viewing tasks: 100% | Writing - Written English tasks: 86.7%
12. Shiba Masoga | class: 4S | Overall: 78.3%
   - summaryScores: language: 81.7% | oral: 70% | reading: 70.7% | writing: 86.7% | achievementLevel: 6
   - sectionEvidence: Language Test - Language conventions and formal English test work: 78% | Spelling - Weekly spelling accuracy across the term: 96.7% | Speaking - Prepared oral speaking task: 75% | Unprepared Reading - Unseen reading fluency and accuracy: 60% | Listening Comprehension - Listening, recall, and response: 70% | Comprehension - Reading comprehension and test comprehension: 68% | Read and View - Class reading and viewing tasks: 73.4% | Writing - Written English tasks: 86.7%
13. Likuye Mdludlu | class: 4S | Overall: 78%
   - summaryScores: language: 59.8% | oral: 72.5% | reading: 82.8% | writing: 86.7% | achievementLevel: 6
   - sectionEvidence: Language Test - Language conventions and formal English test work: 58% | Spelling - Weekly spelling accuracy across the term: 66.8% | Speaking - Prepared oral speaking task: 75% | Unprepared Reading - Unseen reading fluency and accuracy: 60% | Listening Comprehension - Listening, recall, and response: 80% | Comprehension - Reading comprehension and test comprehension: 82% | Read and View - Class reading and viewing tasks: 83.5% | Writing - Written English tasks: 86.7%
14. Niyole Mhlauli | class: 4S | Overall: 86.8%
   - summaryScores: language: 84.9% | oral: 76.7% | reading: 93.1% | writing: 86.7% | achievementLevel: 7
   - sectionEvidence: Language Test - Language conventions and formal English test work: 82% | Spelling - Weekly spelling accuracy across the term: 96.7% | Speaking - Prepared oral speaking task: 75% | Unprepared Reading - Unseen reading fluency and accuracy: 66.7% | Listening Comprehension - Listening, recall, and response: 90% | Comprehension - Reading comprehension and test comprehension: 96% | Read and View - Class reading and viewing tasks: 90.1% | Writing - Written English tasks: 86.7%
15. Yanda Mlalandle | class: 4S | Overall: 88.3%
   - summaryScores: language: 88.1% | oral: 79.2% | reading: 94.9% | writing: 86.7% | achievementLevel: 7
   - sectionEvidence: Language Test - Language conventions and formal English test work: 88% | Spelling - Weekly spelling accuracy across the term: 96.6% | Speaking - Prepared oral speaking task: 80% | Unprepared Reading - Unseen reading fluency and accuracy: 66.7% | Listening Comprehension - Listening, recall, and response: 90% | Comprehension - Reading comprehension and test comprehension: 96.5% | Read and View - Class reading and viewing tasks: 93.3% | Writing - Written English tasks: 86.7%
16. Madison Muller | class: 4S | Overall: 84.1%
   - summaryScores: language: 88.4% | oral: 86.7% | reading: 90.3% | writing: 75% | achievementLevel: 7
   - sectionEvidence: Language Test - Language conventions and formal English test work: 88% | Spelling - Weekly spelling accuracy across the term: 90.1% | Speaking - Prepared oral speaking task: 90% | Unprepared Reading - Unseen reading fluency and accuracy: 66.7% | Listening Comprehension - Listening, recall, and response: 100% | Comprehension - Reading comprehension and test comprehension: 84% | Read and View - Class reading and viewing tasks: 96.6% | Writing - Written English tasks: 75%
17. Zimi Ndongeni | class: 4S | Overall: 72.3%
   - summaryScores: language: 65.3% | oral: 70% | reading: 74.8% | writing: 75% | achievementLevel: 6
   - sectionEvidence: Language Test - Language conventions and formal English test work: 60% | Spelling - Weekly spelling accuracy across the term: 86.7% | Speaking - Prepared oral speaking task: 65% | Unprepared Reading - Unseen reading fluency and accuracy: 60% | Listening Comprehension - Listening, recall, and response: 90% | Comprehension - Reading comprehension and test comprehension: 59.5% | Read and View - Class reading and viewing tasks: 90% | Writing - Written English tasks: 75%
18. Ukho Ndyulo | class: 4S | Overall: 84.1%
   - summaryScores: language: 87.2% | oral: 72.5% | reading: 85.1% | writing: 86.7% | achievementLevel: 7
   - sectionEvidence: Language Test - Language conventions and formal English test work: 84% | Spelling - Weekly spelling accuracy across the term: 100% | Speaking - Prepared oral speaking task: 70% | Unprepared Reading - Unseen reading fluency and accuracy: 60% | Listening Comprehension - Listening, recall, and response: 90% | Comprehension - Reading comprehension and test comprehension: 77% | Read and View - Class reading and viewing tasks: 93.2% | Writing - Written English tasks: 86.7%
19. Ngcwele Sikukula | class: 4S | Overall: 84.4%
   - summaryScores: language: 80.1% | oral: 76.7% | reading: 88.7% | writing: 86.7%
   - sectionEvidence: Language Test - Language conventions and formal English test work: 76% | Spelling - Weekly spelling accuracy across the term: 96.7% | Speaking - Prepared oral speaking task: 75% | Unprepared Reading - Unseen reading fluency and accuracy: 66.7% | Listening Comprehension - Listening, recall, and response: 90% | Comprehension - Reading comprehension and test comprehension: 84% | Read and View - Class reading and viewing tasks: 93.4% | Writing - Written English tasks: 86.7%
20. Olo Siyongwana | class: 4S | Overall: 71.2%
   - summaryScores: language: 60.5% | oral: 76.7% | reading: 74.9% | writing: 71.7%
   - sectionEvidence: Language Test - Language conventions and formal English test work: 64% | Spelling - Weekly spelling accuracy across the term: 46.7% | Speaking - Prepared oral speaking task: 80% | Unprepared Reading - Unseen reading fluency and accuracy: 66.7% | Listening Comprehension - Listening, recall, and response: 80% | Comprehension - Reading comprehension and test comprehension: 89.5% | Read and View - Class reading and viewing tasks: 80.2% | Writing - Written English tasks: 71.7%
21. Nola-Maria Smith | class: 4S | Overall: 79.9%
   - summaryScores: language: 77.5% | oral: 81.7% | reading: 86% | writing: 75% | achievementLevel: 7
   - sectionEvidence: Language Test - Language conventions and formal English test work: 76% | Spelling - Weekly spelling accuracy across the term: 83.5% | Speaking - Prepared oral speaking task: 85% | Unprepared Reading - Unseen reading fluency and accuracy: 66.7% | Listening Comprehension - Listening, recall, and response: 90% | Comprehension - Reading comprehension and test comprehension: 78.5% | Read and View - Class reading and viewing tasks: 93.4% | Writing - Written English tasks: 75%
22. Buqaqawuli Somtsewu | class: 4S | Overall: 68.2%
   - summaryScores: language: 61.1% | oral: 73.3% | reading: 66.4% | writing: 71.7% | achievementLevel: 5
   - sectionEvidence: Language Test - Language conventions and formal English test work: 58% | Spelling - Weekly spelling accuracy across the term: 73.4% | Speaking - Prepared oral speaking task: 70% | Unprepared Reading - Unseen reading fluency and accuracy: 73.3% | Listening Comprehension - Listening, recall, and response: 80% | Comprehension - Reading comprehension and test comprehension: 49.5% | Read and View - Class reading and viewing tasks: 83.3% | Writing - Written English tasks: 71.7%
23. Ntando Zengethwa | class: 4S | Overall: 82%
   - summaryScores: language: 62.8% | oral: 80.8% | reading: 89.9% | writing: 86.7% | achievementLevel: 7
   - sectionEvidence: Language Test - Language conventions and formal English test work: 56% | Spelling - Weekly spelling accuracy across the term: 89.9% | Speaking - Prepared oral speaking task: 80% | Unprepared Reading - Unseen reading fluency and accuracy: 73.3% | Listening Comprehension - Listening, recall, and response: 90% | Comprehension - Reading comprehension and test comprehension: 93% | Read and View - Class reading and viewing tasks: 86.7% | Writing - Written English tasks: 86.7%

