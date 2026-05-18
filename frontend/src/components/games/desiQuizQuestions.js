/** @typedef {{ id: number, difficulty: 'easy'|'medium'|'hard', q: string, options: string[], answer: number }} DesiQ */

/** @type {DesiQ[]} */
export const ALL_QUESTIONS = [
  // ─── EASY (10) ───
  {
    id: 1, difficulty: 'easy',
    q: 'Which movie features the dialogue "Pushpa... I hate tears"?',
    options: ['RRR', 'Pushpa', 'KGF', 'Salaar'],
    answer: 1,
  },
  {
    id: 2, difficulty: 'easy',
    q: 'Who directed Baahubali?',
    options: ['Rajamouli', 'Shankar', 'Trivikram', 'Sukumar'],
    answer: 0,
  },
  {
    id: 3, difficulty: 'easy',
    q: '"Jai Ho" is a song from which film?',
    options: ['Slumdog Millionaire', 'Dabangg', '3 Idiots', 'Bajrangi Bhaijaan'],
    answer: 0,
  },
  {
    id: 4, difficulty: 'easy',
    q: 'Which actor plays Ram in RRR?',
    options: ['Prabhas', 'Ram Charan', 'NTR', 'Allu Arjun'],
    answer: 1,
  },
  {
    id: 5, difficulty: 'easy',
    q: '"Lungi Dance" features which cricketer?',
    options: ['Sachin', 'Dhoni', 'Kohli', 'Sehwag'],
    answer: 1,
  },
  {
    id: 6, difficulty: 'easy',
    q: 'Baahubali was released in which year?',
    options: ['2013', '2014', '2015', '2016'],
    answer: 2,
  },
  {
    id: 7, difficulty: 'easy',
    q: 'KGF stands for?',
    options: ['Kolar Gold Fields', 'Karnataka Gold Factory', 'Kolar Gold Federation', 'Karnataka Gold Fields'],
    answer: 0,
  },
  {
    id: 8, difficulty: 'easy',
    q: 'Which movie has "Naatu Naatu" song?',
    options: ['Pushpa', 'RRR', 'KGF', 'Salaar'],
    answer: 1,
  },
  {
    id: 9, difficulty: 'easy',
    q: '3 Idiots is based on which novel?',
    options: ['Five Point Someone', 'Two States', 'The Immortals', 'Revolution 2020'],
    answer: 0,
  },
  {
    id: 10, difficulty: 'easy',
    q: 'Who played Bheem in RRR?',
    options: ['Ram Charan', 'Allu Arjun', 'NTR', 'Prabhas'],
    answer: 2,
  },

  // ─── MEDIUM (10) ───
  {
    id: 11, difficulty: 'medium',
    q: 'Pushpa: The Rise was directed by?',
    options: ['Rajamouli', 'Sukumar', 'Trivikram', 'Harish Shankar'],
    answer: 1,
  },
  {
    id: 12, difficulty: 'medium',
    q: 'Which film won Oscar for Best Original Song 2023?',
    options: ['KGF', 'Pushpa', 'RRR', 'Ponniyin Selvan'],
    answer: 2,
  },
  {
    id: 13, difficulty: 'medium',
    q: 'Kalki 2898 AD stars which actor as Kalki?',
    options: ['Prabhas', 'Ram Charan', 'Allu Arjun', 'NTR'],
    answer: 0,
  },
  {
    id: 14, difficulty: 'medium',
    q: '"Srivalli" song is from which film?',
    options: ['Pushpa', 'RRR', 'Salaar', 'HanuMan'],
    answer: 0,
  },
  {
    id: 15, difficulty: 'medium',
    q: 'Vikram (2022) was directed by?',
    options: ['Mani Ratnam', 'Lokesh Kanagaraj', 'Shankar', 'Pa Ranjith'],
    answer: 1,
  },
  {
    id: 16, difficulty: 'medium',
    q: 'Which hero plays Salaar?',
    options: ['Allu Arjun', 'Ram Charan', 'Prabhas', 'NTR'],
    answer: 2,
  },
  {
    id: 17, difficulty: 'medium',
    q: 'HanuMan (2024) is from which state\'s industry?',
    options: ['Tamil', 'Telugu', 'Kannada', 'Malayalam'],
    answer: 1,
  },
  {
    id: 18, difficulty: 'medium',
    q: 'Ponniyin Selvan was directed by?',
    options: ['Shankar', 'Mani Ratnam', 'Lokesh', 'Vetrimaaran'],
    answer: 1,
  },
  {
    id: 19, difficulty: 'medium',
    q: '"Kesariya" is from which Bollywood film?',
    options: ['Pathaan', 'Brahmastra', 'Tiger 3', 'War'],
    answer: 1,
  },
  {
    id: 20, difficulty: 'medium',
    q: 'Animal (2023) stars which Bollywood actor?',
    options: ['Ranveer Singh', 'Ranbir Kapoor', 'Hrithik Roshan', 'Shahid Kapoor'],
    answer: 1,
  },

  // ─── HARD (10) ───
  {
    id: 21, difficulty: 'hard',
    q: 'What is the box office collection of Baahubali 2?',
    options: ['1500 Cr', '1800 Cr', '2500 Cr', '1000 Cr'],
    answer: 2,
  },
  {
    id: 22, difficulty: 'hard',
    q: "Rajamouli's father writes dialogues. His name?",
    options: ['V Vijayendra Prasad', 'K Raghavendra Rao', 'Posani Krishna Murali', 'Trivikram'],
    answer: 0,
  },
  {
    id: 23, difficulty: 'hard',
    q: 'Which film first crossed 1000 Cr in Telugu?',
    options: ['RRR', 'KGF 2', 'Baahubali 2', 'Pushpa 2'],
    answer: 2,
  },
  {
    id: 24, difficulty: 'hard',
    q: "Allu Arjun's character name in Pushpa?",
    options: ['Pushpa Raj', 'Pushpa Kumar', 'Pushpa Reddy', 'Pushpa Naidu'],
    answer: 0,
  },
  {
    id: 25, difficulty: 'hard',
    q: "NTR's upcoming film directed by Prashanth Neel?",
    options: ['NTR 31', 'Devara 2', 'NTR Wars', 'Dragon'],
    answer: 0,
  },
  {
    id: 26, difficulty: 'hard',
    q: "Prabhas's real name?",
    options: [
      'Venkata Satyanarayana Prabhas Raju Uppalapati',
      'Prabhas Kumar Raju',
      'Darling Prabhas',
      'Rebel Star Prabhas',
    ],
    answer: 0,
  },
  {
    id: 27, difficulty: 'hard',
    q: 'Which film has AR Rahman NOT scored music for?',
    options: ['Roja', 'Lagaan', 'Baahubali', 'Dil Se'],
    answer: 2,
  },
  {
    id: 28, difficulty: 'hard',
    q: 'Lokesh Cinematic Universe includes?',
    options: ['Kaithi, Vikram, Leo', 'Vikram, Salaar, Leo', 'Master, Vikram, Leo', 'Kaithi, Master, Vikram'],
    answer: 0,
  },
  {
    id: 29, difficulty: 'hard',
    q: 'Kalki 2898 AD production cost approximately?',
    options: ['300 Cr', '500 Cr', '600 Cr', '1000 Cr'],
    answer: 2,
  },
  {
    id: 30, difficulty: 'hard',
    q: '"RC 16" features Ram Charan with which director?',
    options: ['Rajamouli', 'Shankar', 'Sukumar', 'Trivikram'],
    answer: 1,
  },
];

export const EASY_QUESTIONS = ALL_QUESTIONS.filter((q) => q.difficulty === 'easy');
export const MEDIUM_QUESTIONS = ALL_QUESTIONS.filter((q) => q.difficulty === 'medium');
export const HARD_QUESTIONS = ALL_QUESTIONS.filter((q) => q.difficulty === 'hard');
