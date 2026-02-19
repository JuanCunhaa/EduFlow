import type { QuizQuestion } from '@/components/seo/FreeQuiz';

/**
 * Sample questions per cert — hardcoded for SEO (no Firestore fetch).
 * 10 curated questions per cert, covering key domains.
 */

const CISSP_QUESTIONS: QuizQuestion[] = [
    {
        id: 'cissp-q1',
        stem: 'Which of the following BEST describes the principle of least privilege?',
        options: [
            'Grant all permissions by default and revoke as needed',
            'Provide the minimum access required to perform a job function',
            'Remove all access after 90 days of inactivity',
            'Require multi-factor authentication for all actions',
        ],
        correctIndex: 1,
        explanation: 'The principle of least privilege states that users should be granted only the minimum access necessary to perform their job duties. This reduces the attack surface and limits potential damage from compromised accounts.',
    },
    {
        id: 'cissp-q2',
        stem: "An organization's risk appetite is BEST defined by:",
        options: [
            'The Chief Information Security Officer (CISO)',
            'The IT Security team',
            'The Board of Directors or senior management',
            'External auditors',
        ],
        correctIndex: 2,
        explanation: 'Risk appetite — the level of risk an organization is willing to accept — is a strategic business decision that must be defined by senior management or the Board of Directors, not by technical staff.',
    },
    {
        id: 'cissp-q3',
        stem: 'Which security model enforces "no read up, no write down" to protect confidentiality?',
        options: [
            'Biba Model',
            'Clark-Wilson Model',
            'Bell-LaPadula Model',
            'Brewer-Nash Model',
        ],
        correctIndex: 2,
        explanation: 'The Bell-LaPadula model focuses on data confidentiality. Its two main rules are: Simple Security (no read up) — a subject cannot read data at a higher classification; and Star Property (no write down) — a subject cannot write data to a lower classification.',
    },
    {
        id: 'cissp-q4',
        stem: 'What is the PRIMARY purpose of a Business Impact Analysis (BIA)?',
        options: [
            'To identify all IT systems in the organization',
            'To determine the criticality of business functions and their recovery priorities',
            'To calculate the total cost of a security breach',
            'To establish a firewall configuration baseline',
        ],
        correctIndex: 1,
        explanation: 'A BIA identifies critical business functions, assesses the impact of their disruption, and establishes recovery priorities. It forms the foundation for business continuity and disaster recovery planning.',
    },
    {
        id: 'cissp-q5',
        stem: 'Which of the following is a characteristic of symmetric encryption?',
        options: [
            'Uses two different keys for encryption and decryption',
            'Slower than asymmetric encryption',
            'Uses the same key for both encryption and decryption',
            'Primarily used for digital signatures',
        ],
        correctIndex: 2,
        explanation: 'Symmetric encryption uses a single shared key for both encryption and decryption. It is generally faster than asymmetric encryption but presents the key distribution challenge.',
    },
    {
        id: 'cissp-q6',
        stem: 'In the OSI model, at which layer does a firewall typically operate?',
        options: [
            'Physical layer (Layer 1)',
            'Data Link layer (Layer 2)',
            'Network layer (Layer 3) and Transport layer (Layer 4)',
            'Application layer (Layer 7) only',
        ],
        correctIndex: 2,
        explanation: 'Traditional firewalls operate at the Network layer (Layer 3) for IP filtering and Transport layer (Layer 4) for port-based filtering. Next-generation firewalls also inspect at Layer 7 (Application).',
    },
    {
        id: 'cissp-q7',
        stem: 'What is the difference between a vulnerability assessment and a penetration test?',
        options: [
            'They are the same thing with different names',
            'A vulnerability assessment identifies weaknesses; a penetration test attempts to exploit them',
            'A penetration test is automated; a vulnerability assessment is manual',
            'A vulnerability assessment is more expensive than a penetration test',
        ],
        correctIndex: 1,
        explanation: 'A vulnerability assessment identifies and categorizes security weaknesses without exploitation. A penetration test goes further by actively attempting to exploit vulnerabilities to determine the real-world impact.',
    },
    {
        id: 'cissp-q8',
        stem: 'Which term describes the maximum acceptable time to restore a business process after a disruption?',
        options: [
            'Recovery Point Objective (RPO)',
            'Maximum Tolerable Downtime (MTD)',
            'Recovery Time Objective (RTO)',
            'Service Level Agreement (SLA)',
        ],
        correctIndex: 2,
        explanation: 'Recovery Time Objective (RTO) is the maximum acceptable time to restore a system or process after a disruption. RPO defines acceptable data loss, and MTD is the total time a process can be unavailable.',
    },
    {
        id: 'cissp-q9',
        stem: 'Which access control model uses labels and clearances to enforce information flow?',
        options: [
            'Discretionary Access Control (DAC)',
            'Role-Based Access Control (RBAC)',
            'Mandatory Access Control (MAC)',
            'Attribute-Based Access Control (ABAC)',
        ],
        correctIndex: 2,
        explanation: 'Mandatory Access Control (MAC) uses security labels (classifications) on objects and clearances on subjects. Access decisions are made by the system based on these labels, not by individual users.',
    },
    {
        id: 'cissp-q10',
        stem: 'What is the PRIMARY benefit of separation of duties?',
        options: [
            'It improves operational efficiency',
            'It reduces the need for background checks',
            'It prevents a single person from completing a critical task alone, reducing fraud risk',
            'It eliminates the need for audit trails',
        ],
        correctIndex: 2,
        explanation: 'Separation of duties divides critical tasks among multiple individuals so that no single person can complete a high-risk action alone. This is a key control for preventing fraud and errors.',
    },
];

const CC_QUESTIONS: QuizQuestion[] = [
    {
        id: 'cc-q1',
        stem: 'The CIA triad stands for:',
        options: ['Confidentiality, Integrity, Availability', 'Control, Identity, Authentication', 'Compliance, Investigation, Assessment', 'Certified, Integrated, Authorized'],
        correctIndex: 0,
        explanation: 'The CIA triad (Confidentiality, Integrity, Availability) is the foundational model for information security, guiding policies and controls to protect information assets.',
    },
    {
        id: 'cc-q2',
        stem: 'Which type of access control allows the data owner to determine who has access?',
        options: ['Mandatory Access Control', 'Role-Based Access Control', 'Discretionary Access Control', 'Rule-Based Access Control'],
        correctIndex: 2,
        explanation: 'Discretionary Access Control (DAC) allows the owner of a resource to decide who can access it and what permissions they have.',
    },
    {
        id: 'cc-q3',
        stem: 'What is the primary purpose of a firewall?',
        options: ['To encrypt data in transit', 'To filter network traffic based on defined rules', 'To scan for malware on endpoints', 'To manage user passwords'],
        correctIndex: 1,
        explanation: 'A firewall monitors and filters incoming and outgoing network traffic based on security rules, acting as a barrier between trusted and untrusted networks.',
    },
    {
        id: 'cc-q4',
        stem: 'Which of the following is an example of multi-factor authentication?',
        options: ['Username and password', 'Password and security question', 'Smart card and PIN', 'Two different passwords'],
        correctIndex: 2,
        explanation: 'Multi-factor authentication requires two or more different types of authentication factors: something you know (PIN), something you have (smart card), or something you are (biometrics).',
    },
    {
        id: 'cc-q5',
        stem: 'Social engineering attacks primarily target:',
        options: ['Server vulnerabilities', 'Network protocols', 'Human psychology and behavior', 'Encryption algorithms'],
        correctIndex: 2,
        explanation: 'Social engineering exploits human psychology — trust, fear, urgency — to trick people into revealing sensitive information or performing actions that compromise security.',
    },
];

/** Get sample quiz questions for a given cert slug. */
export function getQuizQuestions(certSlug: string): QuizQuestion[] {
    switch (certSlug) {
        case 'cissp': return CISSP_QUESTIONS;
        case 'cc': return CC_QUESTIONS;
        // Fallback — return CISSP questions for certs without curated questions yet
        default: return CISSP_QUESTIONS.slice(0, 5);
    }
}
