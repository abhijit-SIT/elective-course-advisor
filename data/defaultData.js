// Default embedded datasets to ensure 100% offline & local file:// execution without CORS restrictions
const DEFAULT_ELECTIVES_CSV = `course_code,course_name,type,slot,prerequisites,difficulty,weekly_hours,career_tags,skill_tags,related_subjects
CS301,Deep Learning & Neural Networks,Program Elective,Slot A,CS201;MA102,Hard,5,AI / Machine Learning;Data Science & Analytics,PyTorch;Neural Networks;TensorFlow,Mathematics;Python;Machine Learning
CS302,Cloud Infrastructure & DevOps,Program Elective,Slot B,CS202,Medium,4,Cloud & DevOps;Software Engineering,Docker;Kubernetes;AWS;CI/CD,Operating Systems;Computer Networks
CS303,Advanced Algorithms & Optimization,Program Elective,Slot A,CS201,Hard,5,Software Engineering;Competitive Programming,Dynamic Programming;Graph Theory;Optimization,Data Structures;Algorithms
CS304,Natural Language Processing,Program Elective,Slot C,CS201;MA102,Medium,4,AI / Machine Learning;Data Science & Analytics,Transformers;LLMs;Text Mining;NLP,Python;Mathematics;Probability
CS305,Cybersecurity & Penetration Testing,Program Elective,Slot B,CS202,Hard,5,Cybersecurity Specialist;Software Engineering,Network Security;Ethical Hacking;Cryptography,Computer Networks;Operating Systems
CS306,Database Systems & Big Data,Program Elective,Slot D,CS101,Medium,4,Data Science & Analytics;Cloud & DevOps,SQL;Distributed Systems;Spark;NoSQL,Database Management;Data Structures
CS307,Full-Stack Web Architectures,Program Elective,Slot C,CS101,Easy,3,Software Engineering;Product & Tech Management,React;Node.js;GraphQL;REST APIs,Web Development;Programming
CS308,Reinforcement Learning & Robotics,Program Elective,Slot E,CS201;MA102,Hard,6,AI / Machine Learning;Robotics,Control Theory;Markov Decision Processes;Q-Learning,Mathematics;Linear Algebra;Python
CS309,Mobile App Development (Flutter),Program Elective,Slot D,CS101,Easy,3,Software Engineering;Product & Tech Management,Dart;Flutter;Mobile UX;State Management,Programming;Object Oriented Programming
CS310,Distributed Systems & Blockchain,Program Elective,Slot E,CS202,Hard,5,Software Engineering;Cybersecurity Specialist,Consensus;Smart Contracts;P2P Networks,Computer Networks;Operating Systems
OE401,Technology Product Management,Open Elective,Slot B,None,Easy,3,Product & Tech Management;High GPA / Grade Maximization,Agile;Sprint Planning;User Research;Roadmapping,Management;Communication
OE402,Financial Engineering & Algorithmic Trading,Open Elective,Slot A,MA101,Hard,5,Data Science & Analytics;High GPA / Grade Maximization,Quantitative Finance;Time Series;Derivatives,Mathematics;Statistics;Economics
OE403,Applied Human-Computer Interaction & UX,Open Elective,Slot D,None,Easy,3,Product & Tech Management;Software Engineering,Figma;Usability Testing;Wireframing;Design Systems,Design;Psychology
OE404,Environmental Science & Green Tech,Open Elective,Slot C,None,Easy,2,Sustainability;High GPA / Grade Maximization,Carbon Accounting;Renewable Tech;ESG Reporting,Environmental Studies
OE405,Quantum Computing Fundamentals,Open Elective,Slot E,MA102,Hard,5,AI / Machine Learning;Research & Academia,Qubits;Quantum Gates;Qiskit,Physics;Linear Algebra;Mathematics
OE406,Organizational Psychology & Leadership,Open Elective,Slot B,None,Easy,2,Product & Tech Management;High GPA / Grade Maximization,Negotiation;Team Dynamics;Leadership,Psychology;Management
OE407,Bioinformatics & Computational Biology,Open Elective,Slot D,CS101;MA101,Medium,4,Data Science & Analytics;Healthcare Tech,Genomics;Sequence Alignment;Biostatistics,Biology;Statistics;Python
OE408,Intellectual Property Rights & Cyber Law,Open Elective,Slot C,None,Easy,3,Cybersecurity Specialist;Product & Tech Management,Patent Law;Data Privacy;GDPR;Compliance,Law;Ethics`;

const DEFAULT_STUDENTS_CSV = `student_id,name,goal,cgpa,subjects_cleared,weak_subjects,workload_preference,required_pe,required_oe
STU001,Aarav Sharma,AI / Machine Learning,9.15,CS101;CS201;CS202;MA101;MA102,None,Heavy,2,1
STU002,Priya Patel,Software Engineering,8.40,CS101;CS201;CS202;MA101,Mathematics,Balanced,2,1
STU003,Rohan Verma,Cybersecurity Specialist,7.65,CS101;CS202,Data Structures;Algorithms,Balanced,2,1
STU004,Ananya Iyer,High GPA / Grade Maximization,6.80,CS101;MA101,Mathematics;Operating Systems,Light,2,1
STU005,Vikram Malhotra,AI / Machine Learning,8.20,CS101;CS201,MA102;Mathematics,Balanced,2,1
STU006,Sneha Kulkarni,Data Science & Analytics,8.85,CS101;CS201;MA101;MA102,Computer Networks,Balanced,2,1
STU007,Kabir Mehta,Product & Tech Management,7.10,CS101,Linear Algebra;Algorithms,Light,1,2
STU008,Tanya Sen,Cloud & DevOps,8.05,CS101;CS202,Mathematics,Balanced,2,1
STU009,Arjun Reddy,Competitive Programming & Algorithms,9.45,CS101;CS201;CS202;MA101;MA102,Psychology,Heavy,2,1
STU010,Neha Gupta (Edge Case - Prerequisites Deficit),AI / Machine Learning,5.90,CS101,Mathematics;Linear Algebra;Operating Systems,Light,3,1
STU011,Ishaan Joshi (Edge Case - Strict Slot Clash),AI / Machine Learning,8.50,CS101;CS201;MA101;MA102,None,Heavy,3,0
STU012,Meera Nambiar,Software Engineering,7.90,CS101;CS201,Operating Systems,Balanced,2,1`;

function parseCSV(text) {
  const lines = text.trim().split(/\\r?\\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Standard CSV parser handling quotes
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
      // Strip surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      obj[h] = val;
    });
    rows.push(obj);
  }
  return rows;
}
