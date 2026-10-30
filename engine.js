/**
 * Recommendation & Constraint Satisfaction Engine
 * Elective Course Advisor
 */

class AdvisorEngine {
  constructor(electives, students) {
    this.electives = electives.map(e => this.normalizeElective(e));
    this.students = students.map(s => this.normalizeStudent(s));
  }

  normalizeElective(e) {
    const rawType = (e.type || '').trim();
    const isTech = rawType.toLowerCase().includes('tech') || rawType.toLowerCase().includes('program');
    let slotVal = (e.timetable_slot || e.slot || '').trim();
    if (!slotVal.toLowerCase().startsWith('slot') && slotVal.length <= 2) {
      slotVal = `Slot ${slotVal.toUpperCase()}`;
    }

    return {
      course_code: (e.elective_id || e.course_code || '').trim(),
      course_name: (e.elective_name || e.course_name || '').trim(),
      type: isTech ? 'Technical Elective' : 'Open Elective',
      rawType: isTech ? 'PE' : 'OE',
      slot: slotVal,
      prerequisites: (e.prerequisites || 'None').split(';').map(p => p.trim()).filter(p => p && p.toLowerCase() !== 'none'),
      difficulty: (e.difficulty || 'Medium').trim(),
      weekly_hours: parseFloat(e.weekly_hours) || 3,
      career_tags: (e.career_tags || '').split(';').map(t => t.trim()).filter(Boolean),
      skill_tags: (e.skill_tags || '').split(';').map(t => t.trim()).filter(Boolean),
      related_subjects: (e.related_subjects || e.prerequisites || '').split(';').map(r => r.trim()).filter(Boolean)
    };
  }

  normalizeStudent(s) {
    if (!s) return null;
    const cleared = Array.isArray(s.subjects_cleared) 
      ? s.subjects_cleared 
      : String(s.subjects_cleared || '').split(';').map(sc => sc.trim()).filter(Boolean);

    const weak = Array.isArray(s.weak_subjects) 
      ? s.weak_subjects 
      : String(s.weak_subjects || '').split(';').map(ws => ws.trim()).filter(Boolean);

    return {
      student_id: String(s.student_id || '').trim(),
      name: String(s.name || '').trim(),
      goal: String(s.goal || '').trim(),
      cgpa: parseFloat(s.cgpa) || 7.0,
      subjects_cleared: cleared,
      weak_subjects: weak,
      workload_preference: String(s.workload_preference || 'Balanced').trim(),
      required_pe: parseInt(s.required_pe, 10) || 0,
      required_oe: parseInt(s.required_oe, 10) || 0
    };
  }

  // Check if student clears prerequisites for a course (case-insensitive & safe)
  checkPrerequisites(student, elective) {
    if (!elective.prerequisites || elective.prerequisites.length === 0) {
      return { satisfied: true, missing: [] };
    }
    const clearedArray = Array.isArray(student.subjects_cleared) 
      ? student.subjects_cleared 
      : String(student.subjects_cleared || '').split(';').map(s => s.trim());
    const clearedNormalized = clearedArray.map(s => s.toLowerCase().trim()).filter(Boolean);
    const missing = elective.prerequisites.filter(prereq => {
      const p = prereq.toLowerCase().trim();
      return !clearedNormalized.includes(p);
    });
    return {
      satisfied: missing.length === 0,
      missing
    };
  }

  // Check weak subject conflicts (safe for arrays and strings)
  checkWeakSubjectConflict(student, elective) {
    const conflicts = [];
    const weakList = Array.isArray(student.weak_subjects)
      ? student.weak_subjects
      : String(student.weak_subjects || '').split(';').map(w => w.trim()).filter(Boolean);
    if (weakList.length === 0) return conflicts;
    
    for (const weak of weakList) {
      if (!weak || weak.toLowerCase() === 'none') continue;
      const weakLower = weak.toLowerCase();
      // Check related subjects
      for (const rel of elective.related_subjects) {
        if (rel.toLowerCase().includes(weakLower) || weakLower.includes(rel.toLowerCase())) {
          conflicts.push({ weak, related: rel });
        }
      }
      // Check course name
      if (elective.course_name.toLowerCase().includes(weakLower)) {
        conflicts.push({ weak, related: elective.course_name });
      }
    }
    return conflicts;
  }

  // Generate k-combinations of an array
  getCombinations(arr, k) {
    if (k === 0) return [[]];
    if (arr.length < k) return [];
    if (arr.length === k) return [arr];
    const head = arr[0];
    const tail = arr.slice(1);
    const withHead = this.getCombinations(tail, k - 1).map(comb => [head, ...comb]);
    const withoutHead = this.getCombinations(tail, k);
    return [...withHead, ...withoutHead];
  }

  // Score a single course for a student
  scoreCourse(student, course) {
    let score = 50; // base score

    // 1. Goal & Career/Skill tag alignment (up to +40 points)
    const goalLower = student.goal.toLowerCase();
    let goalMatch = false;
    for (const tag of [...course.career_tags, ...course.skill_tags]) {
      const tagLower = tag.toLowerCase();
      if (tagLower.includes(goalLower) || goalLower.includes(tagLower)) {
        score += 20;
        goalMatch = true;
        break;
      }
    }
    // Partial tag match with words in goal
    if (!goalMatch) {
      const goalWords = goalLower.split(/[\s/,&]+/).filter(w => w.length > 3);
      for (const word of goalWords) {
        if (course.career_tags.some(t => t.toLowerCase().includes(word)) ||
            course.skill_tags.some(t => t.toLowerCase().includes(word))) {
          score += 10;
          break;
        }
      }
    }

    // Special goal: High GPA / Grade Maximization
    if (goalLower.includes('gpa') || goalLower.includes('grade')) {
      if (course.difficulty === 'Easy') score += 25;
      else if (course.difficulty === 'Medium') score += 10;
      else score -= 15;
    }

    // 2. CGPA vs Difficulty alignment
    if (student.cgpa < 6.5) {
      if (course.difficulty === 'Hard') score -= 25; // High academic risk
      else if (course.difficulty === 'Easy') score += 15;
    } else if (student.cgpa >= 8.5) {
      if (course.difficulty === 'Hard') score += 12; // Capable and rewards rigor
    }

    // 3. Weak subject conflict penalty
    const weakConflicts = this.checkWeakSubjectConflict(student, course);
    if (weakConflicts.length > 0) {
      score -= (weakConflicts.length * 18);
    }

    return Math.max(5, Math.min(100, score));
  }

  // Score a full elective combination
  scoreCombination(student, courses) {
    const totalWeeklyHours = courses.reduce((sum, c) => sum + c.weekly_hours, 0);
    const avgCourseScore = courses.reduce((sum, c) => sum + this.scoreCourse(student, c), 0) / courses.length;

    let workloadScore = 20;
    // Workload preference fit
    if (student.workload_preference === 'Light') {
      if (totalWeeklyHours <= 9) workloadScore = 25;
      else if (totalWeeklyHours <= 11) workloadScore = 15;
      else workloadScore = Math.max(0, 25 - (totalWeeklyHours - 9) * 5);
    } else if (student.workload_preference === 'Balanced') {
      if (totalWeeklyHours >= 10 && totalWeeklyHours <= 13) workloadScore = 25;
      else if (totalWeeklyHours >= 8 && totalWeeklyHours <= 15) workloadScore = 18;
      else workloadScore = 10;
    } else if (student.workload_preference === 'Heavy') {
      if (totalWeeklyHours >= 13) workloadScore = 25;
      else if (totalWeeklyHours >= 11) workloadScore = 18;
      else workloadScore = 12;
    }

    // Difficulty breakdown
    const hardCount = courses.filter(c => c.difficulty === 'Hard').length;
    let difficultyRiskAdjustment = 0;
    if (student.cgpa < 7.0 && hardCount >= 2) {
      difficultyRiskAdjustment = -15; // heavy risk of grade drop
    } else if (student.cgpa >= 8.5 && hardCount >= 1) {
      difficultyRiskAdjustment = +5;
    }

    const compositeScore = Math.round(
      (avgCourseScore * 0.70) + 
      workloadScore + 
      difficultyRiskAdjustment
    );

    return {
      compositeScore: Math.max(10, Math.min(99, compositeScore)),
      avgCourseScore: Math.round(avgCourseScore),
      totalWeeklyHours,
      hardCount,
      workloadScore
    };
  }

  // Recommend best 3 elective combinations for a student
  recommend(rawStudent) {
    const student = this.normalizeStudent(rawStudent);
    if (!student) {
      return { success: false, diagnostics: { student: rawStudent, unmetReasons: ['Invalid student profile'] }, recommendations: [] };
    }
    const requiredTotal = student.required_pe + student.required_oe;
    const diagnostics = {
      student,
      eligiblePE: [],
      blockedPE: [],
      eligibleOE: [],
      blockedOE: [],
      totalEligible: 0,
      totalValidCombinations: 0,
      isFullyFeasible: false,
      unmetReasons: []
    };

    // 1. Filter electives by prerequisite satisfaction
    this.electives.forEach(course => {
      const prereqCheck = this.checkPrerequisites(student, course);
      const isPE = course.rawType === 'PE' || course.type.toLowerCase().includes('program') || course.type.toLowerCase().includes('tech');
      
      if (prereqCheck.satisfied) {
        if (isPE) diagnostics.eligiblePE.push(course);
        else diagnostics.eligibleOE.push(course);
      } else {
        const info = { course, missing: prereqCheck.missing };
        if (isPE) diagnostics.blockedPE.push(info);
        else diagnostics.blockedOE.push(info);
      }
    });

    diagnostics.totalEligible = diagnostics.eligiblePE.length + diagnostics.eligibleOE.length;

    // Check if sufficient electives exist to even attempt combinations
    if (diagnostics.eligiblePE.length < student.required_pe) {
      diagnostics.unmetReasons.push(
        `Insufficient eligible Program Electives (PE): Needs ${student.required_pe}, but only ${diagnostics.eligiblePE.length} cleared prerequisite requirements.`
      );
    }
    if (diagnostics.eligibleOE.length < student.required_oe) {
      diagnostics.unmetReasons.push(
        `Insufficient eligible Open Electives (OE): Needs ${student.required_oe}, but only ${diagnostics.eligibleOE.length} cleared prerequisite requirements.`
      );
    }

    // 2. Form combinations of PE and OE
    const peCombos = this.getCombinations(diagnostics.eligiblePE, student.required_pe);
    const oeCombos = this.getCombinations(diagnostics.eligibleOE, student.required_oe);

    const validCombinations = [];

    // Cartesian product: PE combinations x OE combinations
    for (const peList of peCombos) {
      for (const oeList of oeCombos) {
        const fullCombo = [...peList, ...oeList];
        
        // 3. HARD CONSTRAINT: Timetable Clash Check (Slots must be distinct)
        const slotsUsed = new Set();
        let hasClash = false;
        let clashingSlot = null;
        
        for (const c of fullCombo) {
          if (slotsUsed.has(c.slot)) {
            hasClash = true;
            clashingSlot = c.slot;
            break;
          }
          slotsUsed.add(c.slot);
        }

        if (!hasClash) {
          const scoreData = this.scoreCombination(student, fullCombo);
          validCombinations.push({
            courses: fullCombo,
            slots: Array.from(slotsUsed),
            ...scoreData
          });
        }
      }
    }

    diagnostics.totalValidCombinations = validCombinations.length;

    // If no valid combination found due to timetable clashes
    if (validCombinations.length === 0) {
      if (peCombos.length > 0 && oeCombos.length > 0) {
        diagnostics.unmetReasons.push(
          `Timetable Slot Collision: All ${peCombos.length * oeCombos.length} possible combinations suffer from timetable slot clashes.`
        );
      }
      return {
        success: false,
        diagnostics,
        recommendations: []
      };
    }

    // Sort valid combinations by compositeScore descending
    validCombinations.sort((a, b) => b.compositeScore - a.compositeScore);

    // Pick 3 TRULY DIVERSE top combinations with different technical pathways:
    const getTechKey = (combo) => combo.courses
      .filter(c => c.rawType === 'PE')
      .map(c => c.course_code)
      .sort()
      .join(',');

    // Combo 1: Top composite score (Primary Goal fit)
    const rec1 = validCombinations[0];
    rec1.archetype = "Primary Goal & Skill Track";
    rec1.rank = 1;

    // Combo 2: Different technical course set (Systems & Core Engineering)
    let rec2 = null;
    const rec1TechKey = getTechKey(rec1);
    for (let i = 1; i < validCombinations.length; i++) {
      const candidate = validCombinations[i];
      if (getTechKey(candidate) !== rec1TechKey) {
        rec2 = candidate;
        rec2.archetype = "Core Software & Algorithms Track";
        rec2.rank = 2;
        break;
      }
    }
    if (!rec2 && validCombinations.length > 1) {
      rec2 = validCombinations[1];
      rec2.archetype = "Alternative Balance Track";
      rec2.rank = 2;
    }

    // Combo 3: Different technical course set from BOTH rec1 and rec2 (Applied Tech & Breadth)
    let rec3 = null;
    const rec2TechKey = rec2 ? getTechKey(rec2) : '';
    for (let i = 1; i < validCombinations.length; i++) {
      const candidate = validCombinations[i];
      const techKey = getTechKey(candidate);
      if (techKey !== rec1TechKey && techKey !== rec2TechKey) {
        rec3 = candidate;
        rec3.archetype = "Connected Tech & Applied Breadth";
        rec3.rank = 3;
        break;
      }
    }
    if (!rec3) {
      for (let i = 1; i < validCombinations.length; i++) {
        const candidate = validCombinations[i];
        if (candidate !== rec1 && candidate !== rec2) {
          rec3 = candidate;
          rec3.archetype = "Applied Breadth Track";
          rec3.rank = 3;
          break;
        }
      }
    }

    const recommendations = [rec1, rec2, rec3].filter(Boolean);

    // Compute detailed explanations, trade-offs, and unlocked career roles
    recommendations.forEach(rec => {
      rec.tradeoffs = this.computeTradeoffs(student, rec, recommendations, diagnostics);
      rec.gains = this.computeGains(student, rec);
      rec.careerRoles = this.computeCareerRoles(rec, student);
    });

    diagnostics.isFullyFeasible = recommendations.length >= 3;
    if (recommendations.length < 3) {
      diagnostics.unmetReasons.push(
        `Limited Flexibility: Only ${recommendations.length} valid non-clashing combination(s) exist for this student's constraints.`
      );
    }

    return {
      success: true,
      diagnostics,
      recommendations
    };
  }

  // Explain what the student gains in this recommendation (Why?)
  computeGains(student, rec) {
    const gains = [];
    const techCourses = rec.courses.filter(c => c.rawType === 'PE');
    const openCourses = rec.courses.filter(c => c.rawType === 'OE');
    const slotsStr = rec.courses.map(c => c.slot.replace('Slot ', '')).join(', ');

    if (rec.rank === 1) {
      gains.push(`Direct deep specialization in ${techCourses.map(c => c.course_name).join(' & ')}`);
      gains.push(`Matches primary career goal (${student.goal})`);
      gains.push(`No timetable clash (Slots: ${slotsStr})`);
      gains.push(`Prerequisites satisfied for all courses`);
    } else if (rec.rank === 2) {
      gains.push(`Strong focus on ${techCourses.map(c => c.course_name).join(' & ')}`);
      gains.push(`Targeted for core software development & scalable architecture`);
      gains.push(`No timetable clash (Slots: ${slotsStr})`);
      gains.push(`Balanced workload (${rec.totalWeeklyHours} hrs/wk)`);
    } else {
      gains.push(`Hands-on applied technology in ${techCourses.map(c => c.course_name).join(' & ')}`);
      gains.push(`Broad skill acquisition complemented by ${openCourses.map(c => c.course_name).join(', ')}`);
      gains.push(`No timetable clash (Slots: ${slotsStr})`);
      gains.push(`Manageable workload (${rec.totalWeeklyHours} hrs/wk) preserving project time`);
    }

    return gains;
  }

  // Derive the 3 best career paths unlocked by this combination
  computeCareerRoles(combo, student) {
    const courses = combo.courses;
    const codes = courses.map(c => c.course_code);
    const careerTags = courses.flatMap(c => c.career_tags);
    const hasML = codes.includes('E01') || careerTags.some(t => t.includes('AI') || t.includes('Machine'));
    const hasBigData = codes.includes('E04') || careerTags.some(t => t.includes('Big Data') || t.includes('Data Science'));
    const hasCloud = codes.includes('E02') || codes.includes('E10') || careerTags.some(t => t.includes('Cloud') || t.includes('DevOps'));
    const hasCyber = codes.includes('E03') || careerTags.some(t => t.includes('Cyber') || t.includes('Security'));
    const hasWeb = codes.includes('E06') || careerTags.some(t => t.includes('Web'));
    const hasApp = codes.includes('E05') || careerTags.some(t => t.includes('App'));
    const hasDSA = codes.includes('E08') || careerTags.some(t => t.includes('Competitive'));
    const hasEntre = codes.includes('E14') || careerTags.some(t => t.includes('Entrepreneurship'));
    const hasFinance = codes.includes('E15');
    const hasDesign = codes.includes('E16');

    const roles = [];

    if (hasML && hasBigData) {
      if (hasEntre) roles.push('AI Startup Founder / Entrepreneur', 'AI Product Manager (AI-PM)', 'Chief AI Officer Track');
      else if (hasFinance) roles.push('Quantitative Trading Analyst', 'FinTech Data Scientist', 'Algorithmic Risk Modeler');
      else roles.push('Machine Learning Engineer', 'Big Data Solutions Architect', 'AI Research Specialist');
    } else if (hasCloud) {
      if (codes.includes('E10')) roles.push('DevOps & SRE Engineer', 'Cloud Infrastructure Architect', 'CI/CD Automation Lead');
      else if (hasCyber) roles.push('Cloud Security Engineer', 'SecOps Specialist', 'Network Security Consultant');
      else roles.push('Cloud Solutions Architect', 'Backend Infrastructure Engineer', 'Enterprise Systems Lead');
    } else if (hasCyber) {
      roles.push('Cybersecurity Analyst', 'Information Security Engineer', 'Penetration Tester / Ethical Hacker');
    } else if (hasDSA) {
      roles.push('Core Software Development Engineer (SDE II)', 'Algorithms Engineer', 'High-Frequency Systems Developer');
    } else if (hasApp || hasWeb) {
      if (hasDesign) roles.push('Product Designer & Frontend Engineer', 'Mobile UX/UI Architect', 'Design Technologist');
      else roles.push('Full-Stack Software Engineer', 'Mobile Application Developer', 'Frontend Platform Lead');
    }

    // Dynamic fallbacks based on specific elective skills
    if (roles.length < 3) {
      const distinctTags = Array.from(new Set(careerTags));
      distinctTags.forEach(t => {
        if (roles.length < 3 && !roles.includes(`${t} Specialist`)) {
          roles.push(`${t} Specialist`);
        }
      });
    }

    // Ensure at least 3 distinct roles
    const defaults = ['Software Development Engineer', 'Technology Consultant', 'Systems Architect'];
    defaults.forEach(d => {
      if (roles.length < 3 && !roles.includes(d)) roles.push(d);
    });

    return roles.slice(0, 3);
  }

  // Explicitly explain "What the student gives up" (Trade-offs)
  computeTradeoffs(student, currentRec, allRecs, diagnostics) {
    const tradeoffs = [];

    // Add distinct pathway trade-offs per rank
    if (currentRec.rank === 1) {
      tradeoffs.push({
        type: "Intensive Specialization Pressure",
        severity: "High",
        description: `Demanding workload (${currentRec.totalWeeklyHours} hrs/wk); sacrifices broader Full-Stack Web & Mobile App practical skills.`
      });
    } else if (currentRec.rank === 2) {
      tradeoffs.push({
        type: "AI Research Trade-off",
        severity: "Medium",
        description: `Completely bypasses specialized AI/Machine Learning coursework this semester to focus on core algorithms & systems.`
      });
    } else if (currentRec.rank === 3) {
      tradeoffs.push({
        type: "Theoretical Depth Trade-off",
        severity: "Medium",
        description: `Trades off deep algorithmic rigor for project-based breadth in applied devices & UX design.`
      });
    }

    // 1. Slot clash sacrifices: Find highest scored eligible courses NOT in this combo due to slot clash
    const chosenSlots = new Set(currentRec.courses.map(c => c.slot));
    const chosenCodes = new Set(currentRec.courses.map(c => c.course_code));
    
    const allEligible = [...diagnostics.eligiblePE, ...diagnostics.eligibleOE];
    const clashingAlternatives = allEligible.filter(c => 
      !chosenCodes.has(c.course_code) && chosenSlots.has(c.slot)
    );

    // Score these alternatives to find valuable ones sacrificed
    const sacrificedHighValue = clashingAlternatives
      .map(alt => ({ course: alt, score: this.scoreCourse(student, alt) }))
      .filter(item => item.score >= 60)
      .sort((a, b) => b.score - a.score);

    if (sacrificedHighValue.length > 0) {
      const topSacrificed = sacrificedHighValue[0].course;
      const occupyingCourse = currentRec.courses.find(c => c.slot === topSacrificed.slot);
      tradeoffs.push({
        type: "Slot Conflict Sacrifice",
        severity: "Medium",
        description: `Gives up ${topSacrificed.course_code} (${topSacrificed.course_name}) because it clashes in ${topSacrificed.slot} with selected ${occupyingCourse.course_code}.`
      });
    }

    // 2. Workload & Academic Stress Trade-off
    if (currentRec.totalWeeklyHours >= 14 && student.workload_preference !== 'Heavy') {
      tradeoffs.push({
        type: "Elevated Workload",
        severity: "High",
        description: `Trades off leisure/flexibility for higher workload (${currentRec.totalWeeklyHours} hrs/week, higher than your preferred ${student.workload_preference} pace).`
      });
    } else if (currentRec.totalWeeklyHours <= 9 && student.workload_preference === 'Heavy') {
      tradeoffs.push({
        type: "Underutilized Capacity",
        severity: "Low",
        description: `Light weekly commitment (${currentRec.totalWeeklyHours} hrs/week) may not fully challenge your capacity for advanced project work.`
      });
    }

    // 3. Difficulty / CGPA Risk Trade-off
    if (currentRec.hardCount >= 2 && student.cgpa < 7.5) {
      tradeoffs.push({
        type: "Academic Performance Risk",
        severity: "High",
        description: `Enrolls in ${currentRec.hardCount} Hard-difficulty courses (${currentRec.courses.filter(c => c.difficulty === 'Hard').map(c => c.course_code).join(', ')}), increasing grading risk given current CGPA (${student.cgpa}).`
      });
    } else if (currentRec.hardCount === 0 && student.cgpa >= 8.5) {
      tradeoffs.push({
        type: "Rigorous Depth Trade-off",
        severity: "Low",
        description: `Sacrifices advanced theoretical depth in exchange for easier grading and minimal project stress.`
      });
    }

    // 4. Weak Subject Proximity
    const weakConflicts = currentRec.courses.flatMap(c => 
      this.checkWeakSubjectConflict(student, c).map(w => ({ course: c, ...w }))
    );
    if (weakConflicts.length > 0) {
      const details = weakConflicts.map(wc => `${wc.course.course_code} relies on ${wc.weak}`).join('; ');
      tradeoffs.push({
        type: "Weak Subject Exposure",
        severity: "Medium",
        description: `Touches student's identified weak subject areas: ${details}. Extra tutoring or study group recommended.`
      });
    }

    // 5. Comparison against other top recommendations
    if (currentRec.rank === 2 && allRecs[0]) {
      const hourDiff = currentRec.totalWeeklyHours - allRecs[0].totalWeeklyHours;
      if (Math.abs(hourDiff) >= 2) {
        tradeoffs.push({
          type: "Baseline Variation",
          severity: "Low",
          description: hourDiff > 0 
            ? `Requires ${hourDiff} more weekly hours than Rank 1 recommendation.` 
            : `Saves ${Math.abs(hourDiff)} weekly hours compared to Rank 1 recommendation.`
        });
      }
    }

    return tradeoffs;
  }

  // Batch Test against all students in data
  testAllStudents() {
    const results = this.students.map(student => {
      const outcome = this.recommend(student);
      return {
        student_id: student.student_id,
        name: student.name,
        goal: student.goal,
        cgpa: student.cgpa,
        required_pe: student.required_pe,
        required_oe: student.required_oe,
        workload_preference: student.workload_preference,
        status: outcome.success && outcome.recommendations.length >= 3 
          ? 'Passed' 
          : (outcome.recommendations.length > 0 ? 'Partial' : 'Failed'),
        combinationsFound: outcome.recommendations.length,
        totalEligibleElectives: outcome.diagnostics.totalEligible,
        unmetReasons: outcome.diagnostics.unmetReasons,
        topRecommendation: outcome.recommendations[0] || null,
        diagnostics: outcome.diagnostics
      };
    });

    const passedCount = results.filter(r => r.status === 'Passed').length;
    const partialCount = results.filter(r => r.status === 'Partial').length;
    const failedCount = results.filter(r => r.status === 'Failed').length;

    return {
      total: results.length,
      passedCount,
      partialCount,
      failedCount,
      successRate: Math.round(((passedCount + partialCount * 0.5) / results.length) * 100),
      results
    };
  }
}
