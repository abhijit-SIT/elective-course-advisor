# Elective Course Advisor

> **TCS Technology Day Challenge Solution**  
> A lightweight, highly intelligent, zero-backend browser application that recommends optimal elective course combinations for students based on prerequisites, schedule clash constraints, career goals, workload preferences, and grade safety.

---

## 📌 Problem Overview

Every semester, students choose electives with little guidance, relying on informal recommendations from peers and seniors. Poor elective choices lead to:
1. Registration dropouts due to unmet prerequisites.
2. Timetable slot collisions forcing last-minute compromise choices.
3. Overwhelming workloads resulting in GPA drops.
4. Mismatches between course outcomes and future career/higher-study ambitions.

This application computes the **top 3 valid elective combinations**, guarantees **zero timetable slot clashes**, checks **prerequisites**, clearly explains **what the student gives up (trade-offs)**, highlights **unmet needs**, and is **benchmarked against every student profile in the dataset**.

---

## 📂 Project Structure

```
elective-course-advisor/
├── index.html              # Main application UI (HTML5, Accessible, Responsive)
├── styles.css              # Modern glassmorphism dark theme, slot visualizer & animations
├── engine.js               # Recommendation & Constraint Satisfaction Engine
├── app.js                  # Application state, UI rendering, event bus, CSV parser
├── data/
│   ├── electives.csv       # Electives dataset (Course details, slots, prereqs, tags)
│   ├── students.csv        # Students dataset (CGPA, goals, cleared/weak subjects, quotas)
│   └── defaultData.js      # Embedded fallback datasets ensuring 100% offline file:// execution
└── README.md               # Documentation, assumptions, and algorithm specifications
```

---

## 🧠 Data Schema & Assumptions

### 1. Electives Dataset (`data/electives.csv`)
* `course_code`: Unique course identifier (e.g., `CS301`, `OE401`).
* `course_name`: Descriptive course title.
* `type`: Course category (`Program Elective` [PE] or `Open Elective` [OE]).
* `slot`: Timetable schedule slot (`Slot A`, `Slot B`, `Slot C`, `Slot D`, `Slot E`).
* `prerequisites`: Semicolon-separated course codes that must be cleared (e.g., `CS201;MA102`) or `None`.
* `difficulty`: Academic rigor rating (`Easy`, `Medium`, `Hard`).
* `weekly_hours`: Estimated weekly commitment (lectures + labs + study hours, 2–6 hrs).
* `career_tags`: Career tracks aligned with this course (e.g., `AI / Machine Learning`, `Cloud & DevOps`).
* `skill_tags`: Concrete technologies and frameworks acquired (e.g., `PyTorch`, `Docker`, `Kubernetes`).
* `related_subjects`: Foundational subjects required for success (used to flag weak subject conflicts).

### 2. Students Dataset (`data/students.csv`)
* `student_id`: Unique identifier (e.g., `STU001`).
* `name`: Student full name.
* `goal`: Career or academic ambition (e.g., `AI / Machine Learning`, `Software Engineering`, `High GPA / Grade Maximization`).
* `cgpa`: Cumulative Grade Point Average out of 10.0.
* `subjects_cleared`: Semicolon-separated codes of subjects successfully completed.
* `weak_subjects`: Semicolon-separated subject areas where the student experiences difficulty.
* `workload_preference`: Weekly pacing preference (`Light`: <10 hrs, `Balanced`: 10–13 hrs, `Heavy`: 14+ hrs).
* `required_pe`: Number of Program Electives required by degree rules.
* `required_oe`: Number of Open Electives required by degree rules.

### Core Assumptions
1. **Slot Exclusivity (Hard Rule)**: A student can attend at most one course per timetable slot. Any combination where two or more courses share the same slot is strictly invalid.
2. **Prerequisite Gating (Hard Rule)**: A student cannot enroll in any elective whose prerequisites are not present in `subjects_cleared`.
3. **Exact Quota Compliance (Hard Rule)**: The system must recommend sets containing exactly the requested number of Program Electives (`required_pe`) and Open Electives (`required_oe`).
4. **Weak Subject Tolerance**: Weak subject overlaps are permitted if necessary, but penalized in score and prominently flagged with specific warnings and study advice.
5. **Trade-off Transparence**: If high-affinity courses are omitted due to slot clashes with other chosen electives, the application explicitly reports the sacrifice.

---

## ⚙️ Recommendation & Scoring Engine

Each candidate valid combination is evaluated on a multi-factor composite scale (0–100%):

$$\text{Composite Score} = (0.70 \times \text{Average Course Score}) + \text{Workload Alignment Score} + \text{Difficulty Adjustment}$$

- **Goal Alignment (+20 to +40 pts)**: Matches between student's career goal and course `career_tags` or `skill_tags`.
- **Workload Pacing (+0 to +25 pts)**: Evaluates total hours against the student's declared preference (`Light`, `Balanced`, or `Heavy`).
- **Academic Risk Adjustment (-15 to +12 pts)**:
  - If student CGPA < 7.0 and multiple `Hard` courses are selected, a penalty is applied to safeguard grades.
  - If student CGPA $\ge$ 8.5, challenging electives are rewarded for depth.
- **Weak Subject Penalty (-18 pts per conflict)**: Applied if course dependencies intersect with student's stated weaknesses.

### Top 3 Diverse Combinations
1. **Rank 1 — Top Goal & Skill Fit**: The globally highest scoring valid combination maximizing career alignment.
2. **Rank 2 — Balanced & Academic Safety**: A distinct combination prioritizing manageable workloads and minimal grading risk.
3. **Rank 3 — Alternative Specialization**: A distinct third option exploring complementary skills or cross-disciplinary breadth.

---

## 🚀 How to Run

Because this application uses standard browser technologies with embedded fallback datasets:
1. **Directly open `index.html`** in any modern web browser (Google Chrome, Safari, Firefox, Edge, Brave).
2. Alternatively, run with any local static HTTP server:
   ```bash
   npx serve .
   # or
   python3 -m http.server 8000
   ```
3. **Zero paid keys, zero accounts, zero login, zero external database.**

---

## 🧪 Universal Batch Validation Suite

Clicking the **"Batch Test All Students"** tab in the top navigation automatically executes the constraint satisfaction engine against every student in the dataset:
- Evaluates feasibility, prerequisite compliance, and slot availability.
- Flags edge cases (e.g. prerequisite deficits or timetable collision deadlocks).
- Clicking any student row in the batch table immediately inspects that student's customized recommendations and trade-offs.
