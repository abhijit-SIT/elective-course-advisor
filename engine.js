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
    return {
      student_id: (s.student_id || '').trim(),
      name: (s.name || '').trim(),
      goal: (s.goal || '').trim(),
      cgpa: parseFloat(s.cgpa) || 7.0,
      subjects_cleared: (s.subjects_cleared || '').split(';').map(sc => sc.trim()).filter(Boolean),
      weak_subjects: (s.weak_subjects || '').split(';').map(ws => ws.trim()).filter(Boolean),
      workload_preference: (s.workload_preference || 'Balanced').trim(),
      required_pe: parseInt(s.required_pe, 10) || 0,
      required_oe: parseInt(s.required_oe, 10) || 0
    };
  }

  // Check if student clears prerequisites for a course (case-insensitive)
  checkPrerequisites(student, elective) {
    if (!elective.prerequisites || elective.prerequisites.length === 0) {
      return { satisfied: true, missing: [] };
    }
    const clearedNormalized = (student.subjects_cleared || []).map(s => s.toLowerCase().trim());
    const missing = elective.prerequisites.filter(prereq => {
      const p = prereq.toLowerCase().trim();
      return !clearedNormalized.includes(p);
    });
    return {
      satisfied: missing.length === 0,
      missing
    };
  }

  // Check weak subject conflicts
  checkWeakSubjectConflict(student, elective) {
    const conflicts = [];
    if (!student.weak_subjects || student.weak_subjects.length === 0) return conflicts;
    
    for (const weak of student.weak_subjects) {
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
  recommend(student) {
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

    // Pick 3 diverse top combinations:
    // Combo 1: Absolute highest scoring (Max Goal/Skill match)
    const rec1 = validCombinations[0];
    rec1.archetype = "Top Goal & Skill Fit";
    rec1.rank = 1;

    // Combo 2: Best Workload / Grade-Safe option (lowest risk / least hours within upper quartile)
    let rec2 = null;
    for (let i = 1; i < validCombinations.length; i++) {
      const candidate = validCombinations[i];
      // Check if it has at least 1 course different from rec1
      const isDistinct = candidate.courses.some(c => !rec1.courses.some(rc => rc.course_code === c.course_code));
      if (isDistinct) {
        rec2 = candidate;
        rec2.archetype = "Balanced & Academic Safety";
        rec2.rank = 2;
        break;
      }
    }
    if (!rec2 && validCombinations.length > 1) {
      rec2 = validCombinations[1];
      rec2.archetype = "Alternative Balance";
      rec2.rank = 2;
    }

    // Combo 3: Alternative Specialization / High-Value Breadth
    let rec3 = null;
    for (let i = 2; i < validCombinations.length; i++) {
      const candidate = validCombinations[i];
      const differentFromBoth = 
        candidate.courses.some(c => !rec1.courses.some(rc => rc.course_code === c.course_code)) &&
        (!rec2 || candidate.courses.some(c => !rec2.courses.some(rc => rc.course_code === c.course_code)));
      if (differentFromBoth) {
        rec3 = candidate;
        rec3.archetype = "Alternative Specialization";
        rec3.rank = 3;
        break;
      }
    }
    if (!rec3 && validCombinations.length > 2) {
      rec3 = validCombinations[2];
      rec3.archetype = "Alternative Option";
      rec3.rank = 3;
    }

    const recommendations = [rec1, rec2, rec3].filter(Boolean);

    // Compute detailed explanations and "What the student gives up" (Trade-offs)
    recommendations.forEach(rec => {
      rec.tradeoffs = this.computeTradeoffs(student, rec, recommendations, diagnostics);
      rec.gains = this.computeGains(student, rec);
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

  // Explain what the student gains in this recommendation
  computeGains(student, rec) {
    const gains = [];
    const goalLower = student.goal.toLowerCase();

    // Check tags matching goal
    const matchingCourses = rec.courses.filter(c => 
      c.career_tags.some(t => t.toLowerCase().includes(goalLower)) ||
      c.skill_tags.some(t => t.toLowerCase().includes(goalLower))
    );

    if (matchingCourses.length > 0) {
      gains.push(`Direct alignment with career goal "${student.goal}" via ${matchingCourses.map(c => c.course_code).join(', ')}.`);
    }

    // Workload commentary
    if (student.workload_preference === 'Light' && rec.totalWeeklyHours <= 9) {
      gains.push(`Maintains low weekly commitment of ${rec.totalWeeklyHours} hrs/week, preserving time for self-study and GPA boosting.`);
    } else if (rec.totalWeeklyHours <= 12) {
      gains.push(`Balanced weekly schedule totaling ${rec.totalWeeklyHours} hrs/week.`);
    } else {
      gains.push(`Intensive deep-dive track (${rec.totalWeeklyHours} hrs/week) maximizing hands-on skill acquisition.`);
    }

    // Zero weak subject conflicts
    const weakConflicts = rec.courses.flatMap(c => this.checkWeakSubjectConflict(student, c));
    if (weakConflicts.length === 0) {
      gains.push(`Safe course selection completely steering clear of student's weak subjects (${student.weak_subjects.join(', ') || 'None'}).`);
    }

    return gains;
  }

  // Explicitly explain "What the student gives up" (Trade-offs)
  computeTradeoffs(student, currentRec, allRecs, diagnostics) {
    const tradeoffs = [];

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
