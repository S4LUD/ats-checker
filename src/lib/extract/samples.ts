import type { ResumeSourceMeta } from '../types'

export interface SampleResume {
  id: string
  name: string
  text: string
  meta: ResumeSourceMeta
}

const metaOf = (kind: ResumeSourceMeta['kind'], name: string, words: number): ResumeSourceMeta => ({
  kind,
  name,
  words,
  tableCount: null,
  imgCount: null,
  pageCount: null,
  twoColScore: null,
  interleaved: null,
})

export const SAMPLE_RESUME: { text: string; meta: ResumeSourceMeta } = {
  text: [
    'JORDAN LEE',
    'San Francisco, CA | (415) 555-0134 | jordan.lee@example.com | linkedin.com/in/jordanlee',
    '',
    'Professional Summary',
    'Software engineer with 5+ years of experience building web applications and data pipelines. Led a team that improved API reliability.',
    '',
    'Experience',
    'Senior Software Engineer, Acme Corp (2020 - Present)',
    '- Led design and delivery of a realtime analytics dashboard',
    '- Helped with monthly releases',
    '- Worked on migrating legacy services to microservices on AWS',
    '- Responsible for code reviews',
    'Software Engineer, DataWorks (2018 - 2020)',
    '- Built ETL jobs in Python processing 10M records per day',
    '- Improved query performance by 40% by optimizing SQL',
    '',
    'Skills',
    'Python, SQL, AWS, Docker, JavaScript, React, Microservices',
    '',
    'Education',
    'B.S. Computer Science, University of California (2018)',
  ].join('\n'),
  meta: metaOf('example', 'moderate sample', 130),
}

export const SAMPLE_RESUME_STRONG: SampleResume = {
  id: 'strong',
  name: 'Strong sample',
  text: [
    'JORDAN LEE',
    'San Francisco, CA | (415) 555-0134 | jordan.lee@example.com | linkedin.com/in/jordanlee',
    'Authorized to work in the US without sponsorship',
    '',
    'Professional Summary',
    'Senior software engineer with 7 years of experience designing scalable microservices and data pipelines. Proven track record in payments and API platforms with a focus on reliability, performance, and cross-team delivery.',
    '',
    'Experience',
    'Senior Software Engineer, Acme Corp (Mar 2020 - Present), San Francisco, CA',
    '- Lead a team of 4 building a realtime analytics dashboard serving 2M events/day on AWS, Docker, and Kubernetes',
    '- Architected microservices on AWS that cut p99 latency by 40% and process 10M transactions per day',
    '- Own SQL and NoSQL data layers (PostgreSQL, PostgreSQL with Redis cache), improving query performance by 3x',
    '- Run CI/CD pipelines with GitLab and Terraform; reduced deploy time from 40 to 8 minutes',
    '- Collaborate with product managers and stakeholders on roadmap, feature scoping, and delivery',
    '- Mentor 2 engineers and run code review standards across the payments squad',
    'Software Engineer, DataWorks (Jun 2018 - Feb 2020)',
    '- Built ETL jobs in Python processing 10M records per day into a data warehouse (Snowflake)',
    '- Designed REST APIs in Python (FastAPI) consumed by 30+ internal teams',
    '- Improved SQL query performance by 40% and introduced indexing standards',
    'Backend Intern, FinTech Co (Jun 2017 - Aug 2017)',
    '- Implemented payment webhooks in Python and JavaScript handling $1M in monthly volume',
    '',
    'Skills',
    'Python, JavaScript/TypeScript, React, SQL, PostgreSQL, NoSQL, AWS, Docker, Kubernetes, Terraform, Kafka, CI/CD, REST APIs, Microservices, System Design',
    '',
    'Education',
    'B.S. Computer Science, University of California (2018)',
  ].join('\n'),
  meta: metaOf('example', 'strong sample', 300),
}

export const SAMPLE_RESUME_WEAK: SampleResume = {
  id: 'weak',
  name: 'Weak sample',
  text: [
    'Jordan Lee',
    'I am a software developer with a passion for technology and building products. I have worked on several projects over the years and I enjoy problem solving.',
    'Work History',
    'Software Developer',
    'I was responsible for developing software and doing code reviews. My role involved working with the team and helping with releases. I also did some testing and debugging when needed.',
    'Junior Developer',
    'I worked on various tasks and assisted senior developers with their day-to-day activities. I handled customer requests and fixed bugs reported by users.',
    'Education',
    'BSc Computer Science',
  ].join('\n'),
  meta: metaOf('example', 'weak sample', 110),
}

export const SAMPLE_RESUMES: SampleResume[] = [
  SAMPLE_RESUME_STRONG,
  { id: 'moderate', name: 'Moderate sample', text: SAMPLE_RESUME.text, meta: SAMPLE_RESUME.meta },
  SAMPLE_RESUME_WEAK,
]

export const SAMPLE_JD = [
  'Senior Software Engineer - Payments',
  'Acme Corp is looking for a Senior Software Engineer to join our payments platform team.',
  '',
  'Responsibilities:',
  '- Design, build, and operate scalable microservices that process millions of transactions per day',
  '- Work with SQL and NoSQL databases to keep data consistent across systems',
  '- Deploy services on AWS, Docker, and Kubernetes',
  '- Coordinate with product managers on roadmap and delivery',
  '',
  'Requirements:',
  '- 5+ years of software engineering experience',
  '- Strong Python and JavaScript skills',
  '- Experience building REST APIs and working with React',
  '- Hands-on experience with AWS and Docker; Kubernetes is a plus',
  '- Solid understanding of microservices architecture and CI/CD pipelines',
  '- Excellent communication and stakeholder management skills',
  '',
  'Nice to have:',
  '- PostgreSQL, Kafka, Terraform, or incident response experience',
  '- Experience with payments or fintech',
  '',
  'We are distributed hiring across the US, remote-friendly. No visa sponsorship available.',
].join('\n')