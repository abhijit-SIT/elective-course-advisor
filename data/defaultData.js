// Default embedded datasets ensuring 100% offline & local file:// execution without CORS restrictions
const DEFAULT_ELECTIVES_CSV = `elective_id,elective_name,type,timetable_slot,prerequisites,difficulty,weekly_hours,career_tags,skill_tags
E01,Machine Learning,Technical,A,Mathematics;Python,Hard,5,AI/ML;Data Science,Python;Model Training;Evaluation
E02,Cloud Computing,Technical,B,Computer Networks;Operating Systems,Medium,4,Cloud;DevOps,AWS;Virtualization;Deployment
E03,Cyber Security,Technical,C,Computer Networks,Medium,4,Cyber Security;Security Analyst,Network Security;Cryptography;Risk Assessment
E04,Big Data Analytics,Technical,D,Python;Statistics,Hard,5,Data Science;Big Data,Hadoop;Spark;Data Processing
E05,Mobile App Development,Technical,E,Java,Medium,4,App Development;Software Engineering,Android;UI;APIs
E06,Web Development,Technical,F,None,Easy,3,Web Development;Software Engineering,HTML;CSS;JavaScript
E07,Database Management Systems,Technical,A,None,Medium,4,Backend;Data Engineering,SQL;Database Design;Normalization
E08,Data Structures and Algorithms,Technical,B,Python,Hard,5,Software Engineering;Competitive Programming,Algorithms;Problem Solving;Complexity Analysis
E09,Internet of Things,Technical,C,Computer Networks,Medium,4,IoT;Embedded Systems,Sensors;Microcontrollers;Connectivity
E10,DevOps Engineering,Technical,D,Operating Systems;Cloud Computing,Hard,5,DevOps;Cloud,CI/CD;Docker;Kubernetes
E11,Data Visualization,Technical,E,Statistics,Easy,3,Data Science;Business Analytics,Dashboards;Charts;Storytelling
E12,Software Testing,Technical,F,None,Easy,3,Quality Assurance;Software Engineering,Test Cases;Automation;Debugging
E13,Business Communication,Open,G,None,Easy,2,Management;Communication,Presentation;Writing;Teamwork
E14,Entrepreneurship,Open,H,None,Medium,3,Entrepreneurship;Management,Business Models;Planning;Innovation
E15,Financial Literacy,Open,G,None,Easy,2,Finance;Management,Budgeting;Investing Basics;Planning
E16,Design Thinking,Open,I,None,Easy,2,Product Design;Innovation,Empathy;Prototyping;Ideation
E17,Environmental Sustainability,Open,J,None,Easy,2,Sustainability;Social Impact,Climate;Sustainable Practices;Impact Assessment
E18,Digital Marketing,Open,H,None,Medium,3,Marketing;Entrepreneurship,SEO;Social Media;Analytics
E19,Psychology at Work,Open,I,None,Easy,2,Human Resources;Management,Motivation;Team Dynamics;Wellbeing
E20,Professional Ethics,Open,J,None,Easy,2,Governance;Professional Development,Ethics;Privacy;Responsibility`;

const DEFAULT_STUDENTS_CSV = `student_id,name,goal,cgpa,subjects_cleared,weak_subjects,workload_preference,required_pe,required_oe
STU001,Aarav Sharma,AI/ML;Data Science,9.15,Mathematics;Python;Statistics;Computer Networks,None,Heavy,2,1
STU002,Priya Patel,Cloud;DevOps,8.40,Computer Networks;Operating Systems;Python,Mathematics,Balanced,2,1
STU003,Rohan Verma,Cyber Security;Security Analyst,7.65,Computer Networks;Operating Systems,Python;Statistics,Balanced,2,1
STU004,Ananya Iyer,High GPA / Grade Maximization,6.80,Statistics;Java,Computer Networks;Mathematics,Light,2,1
STU005,Vikram Malhotra,AI/ML,8.20,Mathematics;Statistics,Python,Balanced,2,1
STU006,Sneha Kulkarni,Software Engineering,8.85,Python;Java;Computer Networks,None,Balanced,2,1
STU007,Kabir Mehta,Product Design;Innovation,7.10,Python,Operating Systems,Light,1,2
STU008,Tanya Sen,DevOps;Cloud,8.05,Operating Systems;Cloud Computing;Computer Networks,Mathematics,Balanced,2,1
STU009,Arjun Reddy,Competitive Programming,9.45,Python;Mathematics;Computer Networks;Operating Systems;Java,None,Heavy,2,1
STU010,Neha Gupta (Edge Case - Prerequisites Deficit),AI/ML,5.90,None,Mathematics;Python;Computer Networks,Light,3,1
STU011,Ishaan Joshi (Edge Case - Strict Slot Clash),AI/ML,8.50,Mathematics;Python;Statistics,None,Heavy,3,0
STU012,Meera Nambiar,Web Development;Quality Assurance,7.90,Java,Statistics,Balanced,2,1`;

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = [];
    let insideQuotes = false;
    let currentVal = '';
    
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"' || char === "'") {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentVal.trim());
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    values.push(currentVal.trim());
    
    const obj = {};
    headers.forEach((h, idx) => {
      let val = values[idx] !== undefined ? values[idx] : '';
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      obj[h] = val;
    });
    rows.push(obj);
  }
  return rows;
}
