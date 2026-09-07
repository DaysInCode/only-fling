---
name: skill-improvement
description: >
  Controlled continuous-improvement workflow for identifying weaknesses
  in the engineering process, capturing lessons, improving skills,
  and preventing recurrence.
---

# Skill Improvement

This skill is invoked when:

- the user reports a defect in the agent's work
- the agent discovers that an existing workflow was insufficient
- a repeated failure occurs
- a new repository-specific convention is discovered
- an existing skill contains incorrect guidance

The objective is controlled improvement.

Do not modify skills merely because a task was difficult.

---

# Improvement workflow

    INCIDENT
       ↓
    UNDERSTAND
       ↓
    ROOT CAUSE
       ↓
    PROCESS FAILURE?
       ↓
    LESSON
       ↓
    SKILL CHANGE?
       ↓
    REGRESSION
       ↓
    VALIDATE
       ↓
    RECORD

---

# Step 1 — Capture the incident

Record:

- what happened
- expected behavior
- actual behavior
- affected code
- relevant task
- relevant skill
- test coverage

---

# Step 2 — Root cause

Determine whether the failure was caused by:

- incorrect implementation
- missing requirement
- inadequate test
- incorrect test
- missing skill knowledge
- incorrect skill instruction
- incorrect skill selection
- insufficient validation
- environment issue
- MCP/tool failure
- model reasoning failure

Do not automatically blame a skill.

---

# Step 3 — Determine whether the process should change

Ask:

"Could a better engineering rule or workflow reasonably have prevented
this problem?"

If no, do not modify the skill.

If yes, continue.

---

# Step 4 — Create a lesson

Create a concise lesson containing:

- problem
- root cause
- lesson
- recommended rule
- example
- applicable skill

---

# Step 5 — Modify the appropriate skill

Prefer the smallest possible skill change.

Do not duplicate the same rule across many skills.

Put general rules in the appropriate general skill.

Put technology-specific rules in technology-specific skills.

---

# Step 6 — Regression protection

Where practical, add:

- regression test
- example
- validation rule
- checklist item

A skill improvement without a way to detect recurrence is weaker.

---

# Step 7 — Validate

Review the proposed skill change.

Ensure that it:

- does not contradict another skill
- does not create unnecessary process
- does not make simple tasks unnecessarily complex
- is specific enough to be actionable

---

# Important safety rule

Never silently rewrite the core engineering workflow based on a single
ambiguous user complaint.

First determine the root cause.

Prefer incremental changes.

---

# User feedback

If the user explicitly says:

"The agent should always do X."

Treat this as a candidate engineering rule.

Determine whether X belongs in:

- dotnet10
- testing
- debugging
- architecture
- code-review
- dotnet-engineer
- another specialist skill

Then update the smallest appropriate skill.
