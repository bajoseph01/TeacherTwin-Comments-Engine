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
- Batch: 4W_English_Term1_2026
- Review threshold: below 55%
- Tone: highly encouraging, aspirational, direct about effort and habits, personal, observant, future-oriented
- Vocabulary: learner, year, afrikaans, grade, proud, work, study, positive, young, term, average, final, attitude, maintained, exam, excited, skills, extra, lady, throughout, confidence, good, habits, pleased, solid, efforts, journey, maintain, potential, support, assessments, class, continue, ethic, improved, increased, managed, methods, performance, responded
- Structure: Usually 3.4 sentences in one paragraph; opens with an overall performance or growth judgment; often includes evidence about attitude, maturity, effort, or aggregate movement; frequently adds a concrete improvement target or study habit; usually closes with encouragement, gratitude, or a next-year transition.
- Formatting: Uses South African/British English spelling and classroom phrasing. Comfortably references percentages, average bands, and stretch targets when motivating learners. Uses exclamation marks for emphasis and praise more than the lightweight persona builder assumes. Frequently uses direct address terms such as "young man", "young lady", or Afrikaans praise closers.

## Subject Context

- Context: Grade 4W Term 1 English
- Drafting rules:
  - Use only evidence visible in the provided marks/context.
  - Ignore omitted or blank assessment sections completely.
  - Lead with 1 to 2 genuine strengths from the strongest English sections, then connect them to the learner's term voice or writing evidence where it is safe to do so for 4W only.
  - Use one main next step only, based on the weakest meaningful English section or the writing-needs note from the 4W voice reference when it aligns with the marks.
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

1. Iyolatha Battie | class: 4W | Overall: 88.1%
   - summaryScores: language: 87.5% | oral: 75% | reading: 96.7% | writing: 86.7% | achievementLevel: 7
   - sectionEvidence: Language Test - Language conventions and formal English test work: 86% | Spelling - Weekly spelling accuracy across the term: 93.4% | Speaking - Prepared oral speaking task: 75% | Unprepared Reading - Unseen reading fluency and accuracy: 60% | Listening Comprehension - Listening, recall, and response: 90% | Comprehension - Reading comprehension and test comprehension: 100% | Read and View - Class reading and viewing tasks: 93.4% | Writing - Written English tasks: 86.7%
2. Sienna Blane | class: 4W | Overall: 84.5%
   - summaryScores: language: 95.2% | oral: 88.3% | reading: 86.7% | writing: 75% | achievementLevel: 7
   - sectionEvidence: Language Test - Language conventions and formal English test work: 94% | Spelling - Weekly spelling accuracy across the term: 100% | Speaking - Prepared oral speaking task: 90% | Unprepared Reading - Unseen reading fluency and accuracy: 73.3% | Listening Comprehension - Listening, recall, and response: 100% | Comprehension - Reading comprehension and test comprehension: 80% | Read and View - Class reading and viewing tasks: 93.3% | Writing - Written English tasks: 75%
3. Aripo Chinyamurindi | class: 4W | Overall: 81.3%
   - summaryScores: language: 92.5% | oral: 76.7% | reading: 87.3% | writing: 71.7% | achievementLevel: 7
   - sectionEvidence: Language Test - Language conventions and formal English test work: 94% | Spelling - Weekly spelling accuracy across the term: 86.6% | Speaking - Prepared oral speaking task: 80% | Unprepared Reading - Unseen reading fluency and accuracy: 66.7% | Listening Comprehension - Listening, recall, and response: 80% | Comprehension - Reading comprehension and test comprehension: 94.5% | Read and View - Class reading and viewing tasks: 80.1% | Writing - Written English tasks: 71.7%
4. Luke Deas | class: 4W | Overall: 86.9%
   - summaryScores: language: 92% | oral: 77.5% | reading: 92.2% | writing: 83.3%
   - sectionEvidence: Language Test - Language conventions and formal English test work: 90% | Spelling - Weekly spelling accuracy across the term: 100% | Speaking - Prepared oral speaking task: 75% | Unprepared Reading - Unseen reading fluency and accuracy: 60% | Listening Comprehension - Listening, recall, and response: 100% | Comprehension - Reading comprehension and test comprehension: 94.5% | Read and View - Class reading and viewing tasks: 89.9% | Writing - Written English tasks: 83.3%
5. Peyton Edwards | class: 4W | Overall: 76.7%
   - summaryScores: language: 75.6% | oral: 72.5% | reading: 71.7% | writing: 83.3%
   - sectionEvidence: Language Test - Language conventions and formal English test work: 72% | Spelling - Weekly spelling accuracy across the term: 90% | Speaking - Prepared oral speaking task: 75% | Unprepared Reading - Unseen reading fluency and accuracy: 60% | Listening Comprehension - Listening, recall, and response: 80% | Comprehension - Reading comprehension and test comprehension: 80% | Read and View - Class reading and viewing tasks: 63.4% | Writing - Written English tasks: 83.3%
6. Skyla Gaffney | class: 4W | Overall: 85.9%
   - summaryScores: language: 91.3% | oral: 84.2% | reading: 95.6% | writing: 75% | achievementLevel: 7
   - sectionEvidence: Language Test - Language conventions and formal English test work: 90% | Spelling - Weekly spelling accuracy across the term: 96.7% | Speaking - Prepared oral speaking task: 85% | Unprepared Reading - Unseen reading fluency and accuracy: 66.7% | Listening Comprehension - Listening, recall, and response: 100% | Comprehension - Reading comprehension and test comprehension: 94.5% | Read and View - Class reading and viewing tasks: 96.7% | Writing - Written English tasks: 75%
7. Unako Jada | class: 4W | Overall: 78.2%
   - summaryScores: language: 71.3% | oral: 70% | reading: 81.1% | writing: 83.3% | achievementLevel: 6
   - sectionEvidence: Language Test - Language conventions and formal English test work: 70% | Spelling - Weekly spelling accuracy across the term: 76.7% | Speaking - Prepared oral speaking task: 70% | Unprepared Reading - Unseen reading fluency and accuracy: 60% | Listening Comprehension - Listening, recall, and response: 80% | Comprehension - Reading comprehension and test comprehension: 85.5% | Read and View - Class reading and viewing tasks: 76.7% | Writing - Written English tasks: 83.3%
8. Pratik Karthikeyan | class: 4W | Overall: 87.3%
   - summaryScores: language: 93.6% | oral: 77.5% | reading: 92.8% | writing: 83.3% | achievementLevel: 7
   - sectionEvidence: Language Test - Language conventions and formal English test work: 92% | Spelling - Weekly spelling accuracy across the term: 100% | Speaking - Prepared oral speaking task: 75% | Unprepared Reading - Unseen reading fluency and accuracy: 60% | Listening Comprehension - Listening, recall, and response: 100% | Comprehension - Reading comprehension and test comprehension: 85.5% | Read and View - Class reading and viewing tasks: 100% | Writing - Written English tasks: 83.3%
9. Selethu Khalishwayo | class: 4W | Overall: 57.7%
   - summaryScores: language: 46.6% | oral: 58.3% | reading: 68.1% | writing: 55% | achievementLevel: 4
   - sectionEvidence: Language Test - Language conventions and formal English test work: 50% | Spelling - Weekly spelling accuracy across the term: 33.2% | Speaking - Prepared oral speaking task: 65% | Unprepared Reading - Unseen reading fluency and accuracy: 53.3% | Listening Comprehension - Listening, recall, and response: 50% | Comprehension - Reading comprehension and test comprehension: 66% | Read and View - Class reading and viewing tasks: 70.2% | Writing - Written English tasks: 55%
10. Omphile Lefophana | class: 4W | Overall: 67.5%
   - summaryScores: language: 61.7% | oral: 67.5% | reading: 62.8% | writing: 75% | achievementLevel: 5
   - sectionEvidence: Language Test - Language conventions and formal English test work: 58% | Spelling - Weekly spelling accuracy across the term: 76.5% | Speaking - Prepared oral speaking task: 70% | Unprepared Reading - Unseen reading fluency and accuracy: 60% | Listening Comprehension - Listening, recall, and response: 70% | Comprehension - Reading comprehension and test comprehension: 65.5% | Read and View - Class reading and viewing tasks: 60.1% | Writing - Written English tasks: 75%
11. Uluthando Lehlehla | class: 4W | Overall: 76.6%
   - summaryScores: language: 72% | oral: 77.5% | reading: 85% | writing: 71.7% | achievementLevel: 6
   - sectionEvidence: Language Test - Language conventions and formal English test work: 70% | Spelling - Weekly spelling accuracy across the term: 80.1% | Speaking - Prepared oral speaking task: 80% | Unprepared Reading - Unseen reading fluency and accuracy: 60% | Listening Comprehension - Listening, recall, and response: 90% | Comprehension - Reading comprehension and test comprehension: 80% | Read and View - Class reading and viewing tasks: 90% | Writing - Written English tasks: 71.7%
12. Oliver | class: 4W | Overall: 64%
   - summaryScores: language: 46.4% | oral: 66.7% | reading: 74.9% | writing: 63.3% | achievementLevel: 5
   - sectionEvidence: Language Test - Language conventions and formal English test work: 48% | Spelling - Weekly spelling accuracy across the term: 39.9% | Speaking - Prepared oral speaking task: 70% | Unprepared Reading - Unseen reading fluency and accuracy: 66.7% | Listening Comprehension - Listening, recall, and response: 60% | Comprehension - Reading comprehension and test comprehension: 80% | Read and View - Class reading and viewing tasks: 69.8% | Writing - Written English tasks: 63.3%
13. Zingce Mbah | class: 4W | Overall: 75.4%
   - summaryScores: language: 51.9% | oral: 70% | reading: 80.5% | writing: 86.7% | achievementLevel: 6
   - sectionEvidence: Language Test - Language conventions and formal English test work: 44% | Spelling - Weekly spelling accuracy across the term: 83.3% | Speaking - Prepared oral speaking task: 70% | Unprepared Reading - Unseen reading fluency and accuracy: 60% | Listening Comprehension - Listening, recall, and response: 80% | Comprehension - Reading comprehension and test comprehension: 94.5% | Read and View - Class reading and viewing tasks: 66.5% | Writing - Written English tasks: 86.7%
14. Iyanna | class: 4W | Overall: 84%
   - summaryScores: language: 82% | oral: 79.2% | reading: 84.5% | writing: 86.7% | achievementLevel: 7
   - sectionEvidence: Language Test - Language conventions and formal English test work: 80% | Spelling - Weekly spelling accuracy across the term: 90.1% | Speaking - Prepared oral speaking task: 80% | Unprepared Reading - Unseen reading fluency and accuracy: 66.7% | Listening Comprehension - Listening, recall, and response: 90% | Comprehension - Reading comprehension and test comprehension: 85.5% | Read and View - Class reading and viewing tasks: 63.5% | Writing - Written English tasks: 86.7%
15. Hermione-M. Moorcroft | class: 4W | Overall: 85.5%
   - summaryScores: language: 77.2% | oral: 85.8% | reading: 89.5% | writing: 86.7% | achievementLevel: 7
   - sectionEvidence: Language Test - Language conventions and formal English test work: 74% | Spelling - Weekly spelling accuracy across the term: 90.1% | Speaking - Prepared oral speaking task: 90% | Unprepared Reading - Unseen reading fluency and accuracy: 73.3% | Listening Comprehension - Listening, recall, and response: 90% | Comprehension - Reading comprehension and test comprehension: 85.5% | Read and View - Class reading and viewing tasks: 93.4% | Writing - Written English tasks: 86.7%
16. Ibanathi Nhlabalsi | class: 4W | Overall: 87.9%
   - summaryScores: language: 87.2% | oral: 84.2% | reading: 95.6% | writing: 83.3% | achievementLevel: 7
   - sectionEvidence: Language Test - Language conventions and formal English test work: 84% | Spelling - Weekly spelling accuracy across the term: 100% | Speaking - Prepared oral speaking task: 85% | Unprepared Reading - Unseen reading fluency and accuracy: 66.7% | Listening Comprehension - Listening, recall, and response: 100% | Comprehension - Reading comprehension and test comprehension: 94.5% | Read and View - Class reading and viewing tasks: 96.7% | Writing - Written English tasks: 83.3%
17. Olama Olagunju | class: 4W | Overall: 74.7%
   - summaryScores: language: 45.5% | oral: 72.5% | reading: 85% | writing: 83.3% | achievementLevel: 6
   - sectionEvidence: Language Test - Language conventions and formal English test work: 36% | Spelling - Weekly spelling accuracy across the term: 83.5% | Speaking - Prepared oral speaking task: 70% | Unprepared Reading - Unseen reading fluency and accuracy: 60% | Listening Comprehension - Listening, recall, and response: 90% | Comprehension - Reading comprehension and test comprehension: 80% | Read and View - Class reading and viewing tasks: 90% | Writing - Written English tasks: 83.3%
18. Kacey Perna | class: 4W | Overall: 77.7%
   - summaryScores: language: 75% | oral: 74.2% | reading: 88.3% | writing: 71.7% | achievementLevel: 6
   - sectionEvidence: Language Test - Language conventions and formal English test work:  | Spelling - Weekly spelling accuracy across the term: 86.8% | Speaking - Prepared oral speaking task: 70% | Unprepared Reading - Unseen reading fluency and accuracy: 66.7% | Listening Comprehension - Listening, recall, and response: 90% | Comprehension - Reading comprehension and test comprehension: 80% | Read and View - Class reading and viewing tasks: 96.6% | Writing - Written English tasks: 71.7%
19. Ashmika Ramsunder | class: 4W | Overall: 88.4%
   - summaryScores: language: 93.5% | oral: 81.7% | reading: 90.3% | writing: 86.7% | achievementLevel: 7
   - sectionEvidence: Language Test - Language conventions and formal English test work: 96% | Spelling - Weekly spelling accuracy across the term: 83.4% | Speaking - Prepared oral speaking task: 85% | Unprepared Reading - Unseen reading fluency and accuracy: 66.7% | Listening Comprehension - Listening, recall, and response: 90% | Comprehension - Reading comprehension and test comprehension: 85.5% | Read and View - Class reading and viewing tasks: 95.1% | Writing - Written English tasks: 86.7%
20. Amahle Tebe | class: 4W | Overall: 72.4%
   - summaryScores: language: 81.7% | oral: 72.5% | reading: 76.7% | writing: 63.3% | achievementLevel: 6
   - sectionEvidence: Language Test - Language conventions and formal English test work: 78% | Spelling - Weekly spelling accuracy across the term: 96.6% | Speaking - Prepared oral speaking task: 65% | Unprepared Reading - Unseen reading fluency and accuracy: 60% | Listening Comprehension - Listening, recall, and response: 100% | Comprehension - Reading comprehension and test comprehension: 60% | Read and View - Class reading and viewing tasks: 93.4% | Writing - Written English tasks: 63.3%
21. Culiwethu Tople | class: 4W | Overall: 75.2%
   - summaryScores: language: 73.1% | oral: 67.5% | reading: 71% | writing: 83.3% | achievementLevel: 6
   - sectionEvidence: Language Test - Language conventions and formal English test work: 78% | Spelling - Weekly spelling accuracy across the term: 53.4% | Speaking - Prepared oral speaking task: 75% | Unprepared Reading - Unseen reading fluency and accuracy: 60% | Listening Comprehension - Listening, recall, and response: 60% | Comprehension - Reading comprehension and test comprehension: 75.5% | Read and View - Class reading and viewing tasks: 66.5% | Writing - Written English tasks: 83.3%
22. Paige Vosloo | class: 4W | Overall: 75.9%
   - summaryScores: language: 63.8% | oral: 79.2% | reading: 73.4% | writing: 83.3% | achievementLevel: 6
   - sectionEvidence: Language Test - Language conventions and formal English test work: 64% | Spelling - Weekly spelling accuracy across the term: 63.2% | Speaking - Prepared oral speaking task: 85% | Unprepared Reading - Unseen reading fluency and accuracy: 66.7% | Listening Comprehension - Listening, recall, and response: 80% | Comprehension - Reading comprehension and test comprehension: 80% | Read and View - Class reading and viewing tasks: 86.7% | Writing - Written English tasks: 83.3%
23. Ibraheem Zaman | class: 4W | Overall: 65.9%
   - summaryScores: language: 45.1% | oral: 60% | reading: 85.6% | writing: 63.3% | achievementLevel: 5
   - sectionEvidence: Language Test - Language conventions and formal English test work: 44% | Spelling - Weekly spelling accuracy across the term: 49.6% | Speaking - Prepared oral speaking task: 55% | Unprepared Reading - Unseen reading fluency and accuracy: 60% | Listening Comprehension - Listening, recall, and response: 70% | Comprehension - Reading comprehension and test comprehension: 74.5% | Read and View - Class reading and viewing tasks: 96.7% | Writing - Written English tasks: 63.3%
24. Wona Zantsi | class: 4W | Overall: 85.4%
   - summaryScores: language: 88.1% | oral: 75% | reading: 91.1% | writing: 83.3% | achievementLevel: 7
   - sectionEvidence: Language Test - Language conventions and formal English test work: 86% | Spelling - Weekly spelling accuracy across the term: 96.7% | Speaking - Prepared oral speaking task: 70% | Unprepared Reading - Unseen reading fluency and accuracy: 60% | Listening Comprehension - Listening, recall, and response: 100% | Comprehension - Reading comprehension and test comprehension: 85.5% | Read and View - Class reading and viewing tasks: 96.7% | Writing - Written English tasks: 83.3%

