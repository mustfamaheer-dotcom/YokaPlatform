const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType
} = require('docx');

function createSectionHeading(title) {
  return new Paragraph({
    spacing: { before: 200, after: 100 },
    border: {
      bottom: {
        color: "1E3A8A",
        space: 4,
        style: BorderStyle.SINGLE,
        size: 12,
      },
    },
    children: [
      new TextRun({
        text: title.toUpperCase(),
        bold: true,
        font: "Calibri",
        size: 22, // 11pt
        color: "1E3A8A",
      }),
    ],
  });
}

function createBullet(title, description) {
  return new Paragraph({
    bullet: {
      level: 0,
    },
    spacing: { before: 40, after: 40, line: 260 },
    children: [
      new TextRun({
        text: title ? title + ": " : "",
        bold: !!title,
        font: "Calibri",
        size: 20, // 10pt
        color: "111827",
      }),
      new TextRun({
        text: description,
        font: "Calibri",
        size: 20, // 10pt
        color: "374151",
      }),
    ],
  });
}

function createJobHeader(role, company, location, dateRange) {
  return new Paragraph({
    spacing: { before: 120, after: 40 },
    children: [
      new TextRun({
        text: role,
        bold: true,
        font: "Calibri",
        size: 21,
        color: "111827",
      }),
      new TextRun({
        text: ` | ${company}`,
        bold: true,
        font: "Calibri",
        size: 21,
        color: "1E3A8A",
      }),
      new TextRun({
        text: `   (${location})`,
        italics: true,
        font: "Calibri",
        size: 19,
        color: "4B5563",
      }),
      new TextRun({
        text: `\t${dateRange}`,
        bold: true,
        font: "Calibri",
        size: 19,
        color: "374151",
      }),
    ],
  });
}

function createCV() {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Calibri",
            size: 20,
            color: "374151",
          },
          paragraph: {
            spacing: { line: 260 },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,    // 0.5 in
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children: [
          // Name Header
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 60 },
            children: [
              new TextRun({
                text: "ABDELRAHMAN ESSAM ABDELSHAKOR",
                bold: true,
                font: "Calibri",
                size: 38, // 19pt
                color: "1E3A8A",
              }),
            ],
          }),

          // Professional Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 80 },
            children: [
              new TextRun({
                text: "Data Scientist & Data Analyst | Backend Data Engineer",
                bold: true,
                font: "Calibri",
                size: 23, // 11.5pt
                color: "334155",
              }),
            ],
          }),

          // Contact Details Line
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 140 },
            border: {
              bottom: {
                color: "CBD5E1",
                space: 4,
                style: BorderStyle.SINGLE,
                size: 8,
              },
            },
            children: [
              new TextRun({ text: "Cairo, Al Salam City, Egypt", font: "Calibri", size: 19, color: "4B5563" }),
              new TextRun({ text: "  •  ", font: "Calibri", size: 19, color: "9CA3AF" }),
              new TextRun({ text: "(+20) 01095132273", font: "Calibri", size: 19, color: "4B5563" }),
              new TextRun({ text: "  •  ", font: "Calibri", size: 19, color: "9CA3AF" }),
              new TextRun({ text: "abdelrahman.essam.abdekshakor@gmail.com", font: "Calibri", size: 19, color: "1E3A8A" }),
              new TextRun({ text: "  •  ", font: "Calibri", size: 19, color: "9CA3AF" }),
              new TextRun({ text: "linkedin.com/in/abdelrahman-essam-", font: "Calibri", size: 19, color: "1E3A8A" }),
            ],
          }),

          // Executive Summary / Objective
          createSectionHeading("Professional Summary"),
          new Paragraph({
            spacing: { before: 60, after: 100 },
            children: [
              new TextRun({
                text: "Analytical and results-driven Data Scientist & Data Analyst with a solid engineering foundation in designing production-grade relational database architectures, automated data pipelines, and analytical business intelligence systems. Experienced in processing high-volume multi-branch transactions, architecting ACID-compliant relational models (35+ tables), and extracting business insights via Python, SQL, and Power BI. Skilled in machine learning model development, statistical inference, feature engineering, and deploying data-driven solutions to optimize operational efficiency and business growth.",
                font: "Calibri",
                size: 20,
                color: "374151",
              }),
            ],
          }),

          // Technical Skills
          createSectionHeading("Technical & Data Science Skills"),
          createBullet(
            "Data Science & Machine Learning",
            "Supervised & Unsupervised Learning (Linear/Logistic Regression, Decision Trees, Random Forest, Clustering, XGBoost), Scikit-Learn, Predictive Modeling, Feature Engineering, Exploratory Data Analysis (EDA), Statistical Modeling, Hypothesis Testing, A/B Testing, Model Evaluation (Precision, Recall, ROC-AUC, RMSE)."
          ),
          createBullet(
            "Data Analytics & Business Intelligence",
            "Power BI (DAX, Power Query, Dynamic Dashboards), Advanced Microsoft Excel (Pivot Tables, Lookups, Modeling), Pandas, NumPy, Plotly, Matplotlib, Seaborn, KPI Reporting, Cohort & Retention Analysis, Customer Segmentation (RFM), Data Cleansing & Anomaly Detection."
          ),
          createBullet(
            "Databases & Data Engineering",
            "PostgreSQL, MySQL 8, SQL (Complex Queries, Subqueries, CTEs, Window Functions, Indexing, Triggers, Views), Knex.js Query Builder, Schema Design & Database Migrations, Transaction Management (ACID, Row-Level Locking with SELECT FOR UPDATE), Redis (In-Memory Caching & LRU Eviction)."
          ),
          createBullet(
            "Software & Development Tools",
            "Python, Node.js, Express.js, RESTful API Design, Git, GitHub Actions (CI/CD Pipelines), Zod (Data Validation), PM2, Linux/Ubuntu VPS Environment, JWT Authentication, React 18, Vite."
          ),
          createBullet(
            "Core Competencies",
            "Problem Solving, Critical Analytical Thinking, Data Integrity Assurance, Business Acumen, Technical Documentation, Cross-Functional Team Collaboration."
          ),

          // Technical Experience & Major Projects
          createSectionHeading("Professional Experience & Key Projects"),

          // Project 1: Yoka Store Platform
          createJobHeader(
            "Data Architect & Backend Data Engineer",
            "Yoka Store Platform (Enterprise SWM & E-Commerce)",
            "Cairo, Egypt",
            "2026"
          ),
          new Paragraph({
            spacing: { before: 20, after: 60 },
            children: [
              new TextRun({
                text: "Enterprise Multi-Branch Store & Warehouse Management (SWM) + E-Commerce Platform featuring real-time inventory synchronization, procurement ledger accounting, and multi-tender split payments.",
                italics: true,
                font: "Calibri",
                size: 19,
                color: "4B5563",
              }),
            ],
          }),
          createBullet(
            "Relational Database Architecture",
            "Designed and deployed 35+ fully normalized, indexed relational database tables using Knex.js migrations across PostgreSQL (development) and MySQL 8 (production), modeling branches, product catalogs, supplier accounts, and inventory item ledgers."
          ),
          createBullet(
            "Data Integrity & Atomic Transactions",
            "Engineered transactional data pipelines with Knex.js and raw SQL employing row-level locks (`SELECT ... FOR UPDATE`), guaranteeing ACID compliance and preventing negative inventory balances during concurrent orders and supplier returns."
          ),
          createBullet(
            "Financial & Reconciliation Engineering",
            "Implemented an enterprise split-payment calculation engine (Cash, InstaPay / Bank Transfer, E-Wallets) and automated ledger updates, tracking supplier opening balances, debit/credit statements, and multi-tender refunds."
          ),
          createBullet(
            "Automated Catalog Algorithms & Validation",
            "Constructed automated SKU generation (`PRD-XXXXXX`) and EAN-13 barcode creation pipelines with composite product naming rules; implemented rigorous schema validation using Zod to block corrupted inputs."
          ),
          createBullet(
            "Asynchronous Audit Logging & Caching",
            "Built a high-performance fire-and-forget operational audit logging service (`logActivity`) and Redis memory-caching layer with LRU eviction to stream mutation records and optimize high-frequency queries."
          ),
          createBullet(
            "Tools & Technologies",
            "PostgreSQL, MySQL 8, Knex.js, Node.js, Express.js, Redis, Zod, React 18, Vite, GitHub Actions, Linux VPS."
          ),

          // Project 2: Olist E-Commerce Project
          createJobHeader(
            "Data Analyst & Machine Learning Project",
            "Olist E-Commerce Analytics",
            "Portfolio Project",
            "2026"
          ),
          new Paragraph({
            spacing: { before: 20, after: 60 },
            children: [
              new TextRun({
                text: "Comprehensive exploratory data analysis and predictive insight generation on 100k+ Brazilian e-commerce orders.",
                italics: true,
                font: "Calibri",
                size: 19,
                color: "4B5563",
              }),
            ],
          }),
          createBullet(
            "Data Cleaning & Feature Engineering",
            "Processed 100,000+ transaction records using Python (Pandas, NumPy); resolved missing values, standardized timestamps, removed outliers, and engineered features for order lead times and customer purchase frequencies."
          ),
          createBullet(
            "Business Intelligence & Dashboarding",
            "Built interactive Power BI dashboards visualizing multi-state sales performance, logistics delivery delays, customer retention rates, and revenue trends across diverse product categories."
          ),
          createBullet(
            "Customer Segmentation & Analytics",
            "Applied RFM (Recency, Frequency, Monetary) segmentation and exploratory clustering to identify high-value customer personas and actionable marketing opportunities."
          ),
          createBullet(
            "Tools & Technologies",
            "Python, Pandas, NumPy, Plotly, Power BI, Advanced SQL, Excel. Project: https://tinyurl.com/2u8x4yz6"
          ),

          // Education
          createSectionHeading("Education"),
          createJobHeader(
            "Bachelor of Science in Information and Communication Technology (ICT)",
            "New Cairo Technological University",
            "Cairo, Egypt",
            "Aug 2026 – Present"
          ),
          new Paragraph({
            spacing: { before: 20, after: 40 },
            children: [
              new TextRun({
                text: "• Rigorous coursework in Database Systems, Data Structures, Algorithms, Computer Networks, and Information Systems.",
                font: "Calibri",
                size: 19,
                color: "4B5563",
              }),
            ],
          }),
          createJobHeader(
            "Pearson BTEC Level 3 Extended Diploma in Programming",
            "Elsewedy Technical Academy (STA)",
            "Cairo, Egypt",
            "Aug 2022 – Jun 2025"
          ),
          new Paragraph({
            spacing: { before: 20, after: 60 },
            children: [
              new TextRun({
                text: "• Graduated with Triple Distinction (D*D*D) — Highest academic honors in Computer Programming and Software Systems.",
                font: "Calibri",
                size: 19,
                color: "4B5563",
              }),
            ],
          }),

          // Diplomas & Certifications
          createSectionHeading("Diplomas & Certifications"),
          createJobHeader(
            "Instant AI Diploma — Data Analysis & Artificial Intelligence Track",
            "Instant AI",
            "Online",
            "Jan 2026 – Present"
          ),
          createBullet(
            "Data Analysis Track (Completed)",
            "Comprehensive training in Python for Data Analysis, Advanced SQL queries, Power BI data modeling, and end-to-end analytical reporting."
          ),
          createBullet(
            "Artificial Intelligence Track (In Progress)",
            "In-depth focus on Machine Learning algorithms, Scikit-Learn, Deep Learning foundations, neural network architectures, and predictive modeling."
          ),

          // Languages
          createSectionHeading("Languages"),
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({ text: "• Arabic: ", bold: true, font: "Calibri", size: 20, color: "111827" }),
              new TextRun({ text: "Native   ", font: "Calibri", size: 20, color: "374151" }),
              new TextRun({ text: "• English: ", bold: true, font: "Calibri", size: 20, color: "111827" }),
              new TextRun({ text: "Working Proficiency (A2-B1 Technical)", font: "Calibri", size: 20, color: "374151" }),
            ],
          }),
        ],
      },
    ],
  });

  return doc;
}

async function run() {
  const doc = createCV();
  const buffer = await Packer.toBuffer(doc);
  
  const targetDocx = path.resolve(__dirname, '..', 'CV.docx');
  const targetDocs = path.resolve(__dirname, '..', 'CV.docs');

  fs.writeFileSync(targetDocx, buffer);
  fs.writeFileSync(targetDocs, buffer);

  console.log(`Saved CV successfully to:`);
  console.log(` - ${targetDocx}`);
  console.log(` - ${targetDocs}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
