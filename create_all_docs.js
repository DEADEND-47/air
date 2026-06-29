'use strict';
/**
 * AIKI Platform — Requirements Documents Generator
 * Creates: PRD, FRD, DRD, TRD, NFR (.docx)
 */
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageBreak
} = require('docx');
const fs = require('fs');

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const C = {
  blue:'1F4E79', lBlue:'DEEAF1', accent:'2E75B6', lAccent:'BDD7EE',
  gray:'F2F2F2', mGray:'D6DCE4', dGray:'404040', white:'FFFFFF',
  green:'375623', lGreen:'E2EFDA', orange:'C55A11', lOrange:'FCE4D6',
};
const W = 9360;
const bd = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: bd, bottom: bd, left: bd, right: bd };
const cm = { top: 100, bottom: 100, left: 120, right: 120 };

// ─────────────────────────────────────────────────────────────
// NUMBERING CONFIG
// ─────────────────────────────────────────────────────────────
const numbering = {
  config: [
    { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u2022',
        alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    { reference: 'subbullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u25E6',
        alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 360 } } } }] },
    { reference: 'numbers', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.',
        alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
  ]
};

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const docStyles = {
  default: { document: { run: { font: 'Arial', size: 22 } } },
  paragraphStyles: [
    { id:'Heading1', name:'Heading 1', basedOn:'Normal', next:'Normal', quickFormat:true,
      run:{ size:32, bold:true, font:'Arial', color:C.blue },
      paragraph:{ spacing:{ before:400, after:200 }, outlineLevel:0 } },
    { id:'Heading2', name:'Heading 2', basedOn:'Normal', next:'Normal', quickFormat:true,
      run:{ size:26, bold:true, font:'Arial', color:C.accent },
      paragraph:{ spacing:{ before:280, after:140 }, outlineLevel:1 } },
    { id:'Heading3', name:'Heading 3', basedOn:'Normal', next:'Normal', quickFormat:true,
      run:{ size:22, bold:true, font:'Arial', color:C.dGray },
      paragraph:{ spacing:{ before:180, after:100 }, outlineLevel:2 } },
  ]
};

// ─────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────
const h1 = t => new Paragraph({ heading: HeadingLevel.HEADING_1,
  children: [new TextRun({ text:t, font:'Arial', size:32, bold:true, color:C.blue })] });
const h2 = t => new Paragraph({ heading: HeadingLevel.HEADING_2,
  children: [new TextRun({ text:t, font:'Arial', size:26, bold:true, color:C.accent })] });
const h3 = t => new Paragraph({ heading: HeadingLevel.HEADING_3,
  children: [new TextRun({ text:t, font:'Arial', size:22, bold:true, color:C.dGray })] });

const p = (text, o={}) => new Paragraph({
  alignment: o.center ? AlignmentType.CENTER : AlignmentType.LEFT,
  spacing: { after: o.after !== undefined ? o.after : 160, before: o.before||0 },
  indent: o.indent ? { left: o.indent } : undefined,
  children: [new TextRun({ text, font:'Arial', size:o.size||22, bold:!!o.bold, italic:!!o.italic, color:o.color||undefined })]
});

const bl  = t => new Paragraph({ numbering:{ reference:'bullets', level:0 }, spacing:{ after:80 }, children:[new TextRun({ text:t, font:'Arial', size:22 })] });
const nb  = t => new Paragraph({ numbering:{ reference:'numbers', level:0 }, spacing:{ after:80 }, children:[new TextRun({ text:t, font:'Arial', size:22 })] });
const sp  = (n=160) => new Paragraph({ spacing:{ after:n }, children:[new TextRun('')] });
const pb  = () => new Paragraph({ children:[new PageBreak()] });
const div = () => new Paragraph({ border:{ bottom:{ style:BorderStyle.SINGLE, size:4, color:C.accent, space:1 } }, spacing:{ before:120, after:200 }, children:[new TextRun('')] });

const hc = (text, w) => new TableCell({ borders, margins:cm, width:{ size:w, type:WidthType.DXA },
  shading:{ fill:C.blue, type:ShadingType.CLEAR },
  children:[new Paragraph({ children:[new TextRun({ text, font:'Arial', size:20, bold:true, color:C.white })] })] });
const dc = (text, w, fill) => new TableCell({ borders, margins:cm, width:{ size:w, type:WidthType.DXA },
  shading: fill ? { fill, type:ShadingType.CLEAR } : undefined,
  children:[new Paragraph({ children:[new TextRun({ text:String(text), font:'Arial', size:20 })] })] });
const bc = (text, w, fill) => new TableCell({ borders, margins:cm, width:{ size:w, type:WidthType.DXA },
  shading: fill ? { fill, type:ShadingType.CLEAR } : undefined,
  children:[new Paragraph({ children:[new TextRun({ text:String(text), font:'Arial', size:20, bold:true })] })] });
const mlc = (lines, w, fill) => new TableCell({ borders, margins:cm, width:{ size:w, type:WidthType.DXA },
  shading: fill ? { fill, type:ShadingType.CLEAR } : undefined,
  children: lines.map(l => new Paragraph({ spacing:{ after:40 }, children:[new TextRun({ text:l, font:'Arial', size:20 })] })) });

const tr  = cells => new TableRow({ children:cells });
const tbl = (cols, rows) => new Table({ width:{ size:W, type:WidthType.DXA }, columnWidths:cols, rows });

function buildDoc(children) {
  return new Document({ styles:docStyles, numbering, sections:[{
    properties:{ page:{ size:{ width:12240, height:15840 }, margin:{ top:1440, right:1440, bottom:1440, left:1440 } } },
    children
  }] });
}

async function saveDoc(doc, filename) {
  const buf = await Packer.toBuffer(doc);
  const out = `/mnt/user-data/outputs/${filename}`;
  fs.writeFileSync(out, buf);
  console.log('  \u2713 Created:', filename, `(${(buf.length/1024).toFixed(0)} KB)`);
}

function cover(docType, title, subtitle) {
  return [
    sp(2400),
    p(docType, { size:40, bold:true, color:C.blue, center:true, after:120 }),
    p(title,   { size:28, bold:true, color:C.accent, center:true, after:100 }),
    p(subtitle,{ size:22, italic:true, color:C.dGray, center:true, after:480 }),
    tbl([2400, 6960], [
      tr([bc('Document Type', 2400, C.lBlue), dc(docType, 6960)]),
      tr([bc('Version',       2400, C.lBlue), dc('1.0  —  Draft for Review', 6960)]),
      tr([bc('Date',          2400, C.lBlue), dc('June 2025', 6960)]),
      tr([bc('Project',       2400, C.lBlue), dc('AI Industrial Knowledge Intelligence (AIKI) Platform', 6960)]),
      tr([bc('Confidentiality',2400,C.lBlue), dc('CONFIDENTIAL  —  Internal Use Only', 6960)]),
    ]),
    pb(),
  ];
}

// ╔══════════════════════════════════════════════════════════╗
// ║  DOCUMENT 1: PRD                                        ║
// ╚══════════════════════════════════════════════════════════╝
async function createPRD() {
  const children = [
    ...cover(
      'PRD — Product Requirements Document',
      'AI Industrial Knowledge Intelligence',
      'Unified Asset & Operations Brain Platform'
    ),

    h1('Document Control'),
    tbl([1500,1500,2200,2000,2160],[
      tr([hc('Version',1500),hc('Date',1500),hc('Author',2200),hc('Reviewer',2000),hc('Changes',2160)]),
      tr([dc('1.0',1500),dc('Jun 2025',1500),dc('Product & Engineering Team',2200),dc('CTO / Head of Operations',2000),dc('Initial draft',2160)]),
    ]),
    div(),

    h1('1. Executive Summary'),
    p('The AI Industrial Knowledge Intelligence (AIKI) platform addresses a critical operational challenge facing large asset-intensive organisations in India: the fragmentation of industrial knowledge across disconnected systems, siloed departments, and the imminent loss of tacit expertise as experienced engineers retire. AIKI transforms scattered, heterogeneous documents into a unified, queryable knowledge fabric accessible to every worker, on any device, at the point of need.'),
    p('A 2024 McKinsey global survey found that professionals in asset-intensive industries spend an average of 35% of their working hours searching for information, clarifying instructions, or recreating documents that already exist. A NASSCOM-EY study of Indian manufacturing and energy companies found that the average large plant operates across 7 to 12 disconnected document systems. BIS Research estimates that knowledge fragmentation contributes to 18-22% of unplanned downtime events in Indian heavy industry. An estimated 25% of India\'s experienced industrial engineers and operators will retire within the next decade.'),
    p('AIKI delivers five integrated capabilities: a universal document ingestion and knowledge graph engine, an AI-powered expert knowledge copilot, a maintenance intelligence and RCA agent, a regulatory compliance intelligence system, and a lessons-learned and failure pattern engine — together closing the information gap that costs Indian heavy industry billions of rupees annually.'),
    div(),

    h1('2. Problem Context'),
    p('Knowledge fragmentation in industrial operations manifests across five compounding dynamics:'),
    bl('Document Sprawl: The average large Indian plant operates 7-12 disconnected document systems. P&IDs reside in one system, maintenance work orders in another, operating procedures in a third, inspection records in a fourth, and regulatory submissions scattered across email archives.'),
    bl('Search Overhead: Professionals spend 35% of working hours (McKinsey, 2024) searching for information or recreating documents that already exist. For a 500-person plant workforce, this represents 175 FTE-equivalent hours of lost productivity per day.'),
    bl('Downtime Cost: Knowledge fragmentation contributes to 18-22% of unplanned downtime events (BIS Research). Maintenance teams routinely make decisions without complete equipment history or failure pattern context.'),
    bl('Knowledge Cliff: 25% of India\'s experienced industrial engineers and operators will retire within the next decade. This tacit knowledge, built over decades of operational experience, is predominantly undocumented and cannot be recovered once lost.'),
    bl('Regulatory Risk: Compliance with overlapping regulations (Factory Act, OISD, PESO, CPCB, BIS) requires cross-referencing hundreds of standards against operational procedures, equipment states, and inspection records. Manual compliance management is error-prone and audit-intensive.'),
    div(),

    h1('3. Product Vision'),
    p('"Make every piece of industrial knowledge findable, actionable, and continuously updated — for every worker, at the point of need — so that no maintenance decision is made without context, no compliance gap goes undetected, and no hard-won operational lesson is ever lost."', { italic:true, indent:720, color:C.blue }),
    sp(80),
    p('AIKI will serve as the single source of truth for operational knowledge in asset-intensive organisations, functioning as an always-on expert colleague that has ingested every document, remembers every failure, understands every regulation, and can explain any procedure in plain language on any device in under 30 seconds.'),
    div(),

    h1('4. Success Metrics & KPIs'),
    tbl([800,2600,2400,1560,1800],[
      tr([hc('ID',800),hc('Strategic Goal',2600),hc('KPI',2400),hc('Target',1560),hc('Baseline',1800)]),
      tr([bc('G-01',800),dc('Reduce information search time',2600),dc('Time-to-answer for operational queries',2400),dc('< 30 seconds',1560),dc('~45 min average',1800)]),
      tr([bc('G-02',800),dc('Capture retiring expert knowledge',2600),dc('% expert procedures documented in AIKI',2400),dc('> 90% coverage',1560),dc('~30% documented',1800)]),
      tr([bc('G-03',800),dc('Reduce unplanned downtime',2600),dc('% downtime events linked to info-gap root cause',2400),dc('15-20% reduction',1560),dc('18-22% attributable',1800)]),
      tr([bc('G-04',800),dc('Improve compliance posture',2600),dc('% applicable regulations mapped with evidence',2400),dc('100% mapped',1560),dc('< 40% mapped today',1800)]),
      tr([bc('G-05',800),dc('Enable cross-functional discovery',2600),dc('Reduction in inter-department info requests',2400),dc('40% reduction',1560),dc('35% cross-functional',1800)]),
      tr([bc('G-06',800),dc('Mobile first-contact resolution',2600),dc('% field queries resolved without escalation',2400),dc('> 75% FCR',1560),dc('< 30% FCR today',1800)]),
    ]),
    div(),

    h1('5. User Personas'),
    p('Five primary user personas drive AIKI\'s design and feature prioritisation.'),

    h2('5.1  Rajesh Sharma — Senior Maintenance Engineer'),
    tbl([2200,7160],[
      tr([bc('Attribute',2200,C.lBlue),bc('Details',7160,C.lBlue)]),
      tr([bc('Background',2200),dc('45 yrs old, 18 years\' experience in plant maintenance at a large refinery. Leads a team of 12 technicians. Manages ~2,400 work orders per year.',7160)]),
      tr([bc('Responsibilities',2200),dc('Equipment reliability, RCA leadership, planned maintenance scheduling, shutdown planning, spare-parts strategy.',7160)]),
      tr([bc('Systems Used',2200),dc('SAP PM, SharePoint (documents), Excel (personal tracking), email for procedure requests.',7160)]),
      tr([bc('Pain Points',2200),mlc([
        '- Spends 2-3 hours per day searching old work orders, P&IDs, and maintenance records across 4 systems.',
        '- No single view of equipment failure history — must correlate manually.',
        '- RCA reports take 3-5 days to compile due to information retrieval overhead.',
        '- Knowledge is siloed: successor cannot access his mental model of equipment quirks.',
      ],7160)]),
      tr([bc('AIKI Goals',2200),mlc([
        '- Find complete equipment history in under 1 minute.',
        '- Auto-populated RCA templates from historical data.',
        '- Early warnings based on failure signatures he recognises from experience.',
      ],7160)]),
      tr([bc('Tech Comfort',2200),dc('Medium — proficient in SAP PM; prefers desktop; uncomfortable with new interfaces.',7160)]),
    ]),
    sp(),

    h2('5.2  Suresh Kumar — Field Operations Technician (Mobile User)'),
    tbl([2200,7160],[
      tr([bc('Attribute',2200,C.lBlue),bc('Details',7160,C.lBlue)]),
      tr([bc('Background',2200),dc('28 yrs old, 5 years\' experience. Manages daily inspection rounds and minor maintenance across 3 process units in a chemical plant.',7160)]),
      tr([bc('Responsibilities',2200),dc('Equipment inspections, lubrication rounds, minor repairs, permit-to-work execution, incident reporting.',7160)]),
      tr([bc('Systems Used',2200),dc('Mobile phone (personal), paper checklists, walkie-talkie. Rarely accesses a desktop computer.',7160)]),
      tr([bc('Pain Points',2200),mlc([
        '- No mobile access to SOPs or equipment procedures — must call engineer or return to control room.',
        '- Paper checklists are outdated and inconsistent with current procedures.',
        '- Uncertain about correct isolation points when procedures are unavailable in the field.',
        '- Incident reports are paper-based and often incomplete.',
      ],7160)]),
      tr([bc('AIKI Goals',2200),mlc([
        '- Instant access to current procedures on mobile.',
        '- Step-by-step guidance with equipment photos while in the field.',
        '- Scan equipment tag to see history and open work orders.',
      ],7160)]),
      tr([bc('Tech Comfort',2200),dc('High (mobile native). Comfortable with WhatsApp, apps, mobile browsing. Not comfortable with desktop enterprise software.',7160)]),
    ]),
    sp(),

    h2('5.3  Priya Menon — HSE & Regulatory Compliance Officer'),
    tbl([2200,7160],[
      tr([bc('Attribute',2200,C.lBlue),bc('Details',7160,C.lBlue)]),
      tr([bc('Background',2200),dc('38 yrs old, 10 years\' experience in HSE compliance at manufacturing and energy companies. Manages regulatory submissions and audit responses.',7160)]),
      tr([bc('Responsibilities',2200),dc('OISD / PESO / Factory Act compliance, audit preparation, incident investigation, environmental reporting.',7160)]),
      tr([bc('Pain Points',2200),mlc([
        '- Audit preparation takes 2-3 weeks of manual document compilation.',
        '- Cannot automatically cross-reference 300+ regulatory clauses against current procedures.',
        '- Compliance gaps discovered during audits rather than detected proactively.',
        '- No alert system when equipment state diverges from a compliance requirement.',
      ],7160)]),
      tr([bc('AIKI Goals',2200),mlc([
        '- Automated regulatory gap detection with evidence links.',
        '- One-click audit evidence package generation.',
        '- Proactive alerts when procedures fall out of compliance.',
      ],7160)]),
      tr([bc('Tech Comfort',2200),dc('Medium-High. Proficient with Excel and SharePoint. Willing to adopt new tools if demonstrably time-saving.',7160)]),
    ]),
    sp(),

    h2('5.4  Vikram Nair — Plant Operations Manager'),
    tbl([2200,7160],[
      tr([bc('Attribute',2200,C.lBlue),bc('Details',7160,C.lBlue)]),
      tr([bc('Background',2200),dc('52 yrs old, 25 years\' experience. Responsible for overall plant performance, safety, and operational KPIs at a 1,200-person petrochemical facility.',7160)]),
      tr([bc('Responsibilities',2200),dc('Plant performance, maintenance strategy approval, shutdown planning, regulatory liaison, resource allocation.',7160)]),
      tr([bc('Pain Points',2200),mlc([
        '- Information arrives via 12+ reporting channels — no consolidated operational view.',
        '- Cannot assess cross-departmental knowledge gaps without extensive manual compilation.',
        '- Key knowledge is locked in senior engineers\' heads — high succession risk.',
        '- Unplanned shutdown root causes often unclear weeks after the event.',
      ],7160)]),
      tr([bc('AIKI Goals',2200),mlc([
        '- Single operational intelligence dashboard.',
        '- Knowledge coverage scores by department and equipment class.',
        '- Predictive risk alerts based on maintenance patterns.',
      ],7160)]),
      tr([bc('Tech Comfort',2200),dc('Low-Medium. Prefers concise dashboards and summaries. Delegates detailed queries to team.',7160)]),
    ]),
    sp(),

    h2('5.5  Anita Singh — Document Controller / Knowledge Manager'),
    tbl([2200,7160],[
      tr([bc('Attribute',2200,C.lBlue),bc('Details',7160,C.lBlue)]),
      tr([bc('Background',2200),dc('33 yrs old, 7 years\' experience in document control at EPC and O&M companies. Manages 40,000+ controlled documents.',7160)]),
      tr([bc('Pain Points',2200),mlc([
        '- Manual document classification is time-consuming and inconsistent across document controllers.',
        '- Version control issues: field teams access superseded procedures.',
        '- No automatic linkage between related documents (procedure <-> drawing <-> equipment).',
        '- Legacy backfile ingestion is a multi-year manual project.',
      ],7160)]),
      tr([bc('AIKI Goals',2200),mlc([
        '- Auto-classification and tagging of new documents on upload.',
        '- Automatic cross-linking of related documents via entity extraction.',
        '- Backfile ingestion with confidence-scored extractions for review.',
      ],7160)]),
      tr([bc('Tech Comfort',2200),dc('High. Comfortable with DMS, metadata schemas, controlled vocabulary. Able to validate entity extraction quality.',7160)]),
    ]),
    div(),

    h1('6. Product Scope — In Scope (Phase 1)'),
    nb('Universal ingestion of heterogeneous document formats: PDF (text and scanned), DOCX, XLS/XLSX, TIFF/JPEG images, email archives (MSG/EML/PST), and XML.'),
    nb('OCR and intelligent text extraction for scanned documents, handwritten forms, and low-quality digitised records.'),
    nb('Computer vision-based parsing of P&ID diagrams for instrument tags, equipment tags, line numbers, and topology.'),
    nb('Automated entity extraction: equipment tags, process parameters, locations, personnel names, dates, regulatory references, and procedure identifiers.'),
    nb('Knowledge graph construction and continuous maintenance: equipment-document-procedure-regulation linkages.'),
    nb('RAG-powered conversational AI copilot with source citations, confidence scores, and direct document links.'),
    nb('Mobile-first Progressive Web Application (PWA) supporting field technician use with offline caching of critical procedures.'),
    nb('Maintenance intelligence engine: work order history analysis, failure mode frequency analysis, and reliability trending.'),
    nb('Predictive maintenance recommendations and optimised maintenance schedule generation.'),
    nb('Structured Root Cause Analysis (RCA) workflow with automated data population from historical records.'),
    nb('Regulatory compliance mapping: Factory Act 1948, OISD standards, PESO regulations, CPCB norms, BIS standards.'),
    nb('Compliance gap detection and one-click audit evidence package generation.'),
    nb('Lessons-learned analysis: incident, near-miss, and NCR pattern detection and proactive risk alerting.'),
    nb('Real-time alerts when equipment conditions match historical failure signatures.'),
    nb('Role-based access control (RBAC): plant-level, department-level, and document-class-level permissions.'),
    nb('Integration APIs for CMMS systems (SAP Plant Maintenance, IBM Maximo) — read-only.'),
    nb('Integration with document management systems (SharePoint, OpenText Documentum).'),
    nb('Multi-plant architecture supporting up to 10 plants with logical data segregation.'),
    div(),

    h1('7. Non-Goals — Out of Scope for Phase 1'),
    bl('Real-time SCADA / DCS / IoT data integration and process historian ingestion (Phase 2).'),
    bl('Replacement of CMMS transaction systems (SAP PM / IBM Maximo) — AIKI reads from, not writes to, CMMS.'),
    bl('CAD / 3D model viewing, manipulation, or BIM integration.'),
    bl('HR, financial, commercial, or supply chain document management.'),
    bl('Customer-facing or supplier-facing external portals.'),
    bl('Automated creation or closure of work orders in CMMS (triggering and alerting only).'),
    bl('Full ERP integration — specifically SAP MM, FI, or CO module data.'),
    bl('Native iOS / Android mobile application in Phase 1 (PWA only; native apps in Phase 2 if metrics justify).'),
    bl('Multi-language support beyond English (Hindi and regional languages planned for Phase 2).'),
    div(),

    h1('8. Constraints & Assumptions'),
    h2('8.1 Technical Constraints'),
    bl('All production data must reside within Indian cloud infrastructure (AWS ap-south-1 or Azure Central India) under the IT Act and DPDPA 2023.'),
    bl('No PII or commercially sensitive document content may be transmitted to public LLM API endpoints without data masking or tokenisation.'),
    bl('The system must integrate with the existing identity provider (Azure AD or LDAP) — no new identity stores.'),
    bl('API response times constrained by upstream CMMS SLAs (SAP PM maximum: 5 seconds; Maximo: 3 seconds).'),
    bl('Mobile clients must function in degraded connectivity (>=2G / 250 Kbps) with offline caching for the 50 most recently accessed procedures.'),
    h2('8.2 Assumptions'),
    bl('The organisation has at least one DMS or document repository with accessible APIs or bulk-export capability.'),
    bl('A minimum corpus of 5,000 existing documents in digital format will be available for the initial ingestion sprint.'),
    bl('IT teams will provide LDAP / Azure AD credentials, network access, and firewall rules for integration connectivity.'),
    bl('SMEs from operations, maintenance, compliance, and document control will be available for ontology design workshops (3 workshops of 2 hours each in Month 1).'),
    bl('The pilot plant operations team commits a minimum of 15 FTE-hours per month to feedback and validation during the first 6 months post-launch.'),
    div(),

    h1('9. Dependencies'),
    tbl([1500,1400,1500,2460,2700],[
      tr([hc('Dependency',1500),hc('Type',1400),hc('Provider',1500),hc('Description',2460),hc('Risk if Unavailable',2700)]),
      tr([dc('Azure AD / LDAP',1500),dc('External — IT',1400),dc('Internal IT',1500),dc('User authentication and RBAC',2460),dc('Critical — System unusable',2700)]),
      tr([dc('SAP PM API',1500),dc('External — IT',1400),dc('Internal IT / SAP',1500),dc('Work order and equipment master data',2460),dc('High — Maintenance intelligence degraded',2700)]),
      tr([dc('SharePoint API',1500),dc('External — IT',1400),dc('Microsoft / IT',1500),dc('Primary document repository access',2460),dc('High — Ingestion pipeline blocked',2700)]),
      tr([dc('LLM API (Claude / GPT-4o)',1500),dc('External — Vendor',1400),dc('Anthropic / OpenAI',1500),dc('RAG copilot and NLP extraction',2460),dc('Critical — AI features unavailable',2700)]),
      tr([dc('Azure Document Intelligence',1500),dc('External — Vendor',1400),dc('Microsoft',1500),dc('OCR for scanned documents',2460),dc('Medium — Fallback to Tesseract',2700)]),
      tr([dc('Vector DB (Pinecone)',1500),dc('External — Vendor',1400),dc('Pinecone.io',1500),dc('Semantic similarity search for RAG',2460),dc('High — RAG search unavailable',2700)]),
      tr([dc('Neo4j (Knowledge Graph)',1500),dc('External — Vendor',1400),dc('Neo4j Inc.',1500),dc('Knowledge graph storage and traversal',2460),dc('High — Entity linking broken',2700)]),
    ]),
    div(),

    h1('10. Risk Register'),
    tbl([600,2500,1200,1000,4060],[
      tr([hc('ID',600),hc('Risk',2500),hc('Probability',1200),hc('Impact',1000),hc('Mitigation',4060)]),
      tr([bc('R-01',600),dc('Low OCR accuracy for handwritten or legacy scanned documents',2500),dc('High',1200),dc('High',1000),dc('Human-in-the-loop review queue for extractions below 80% confidence. Correction feedback loop to retrain NER model quarterly.',4060)]),
      tr([bc('R-02',600),dc('Data quality inconsistency across source document systems',2500),dc('High',1200),dc('High',1000),dc('Mandatory data quality assessment sprint before ingestion. Document-owner validation workflow for low-quality sources.',4060)]),
      tr([bc('R-03',600),dc('SME unavailability for knowledge graph ontology design',2500),dc('Medium',1200),dc('High',1000),dc('Engage industrial ontology consultants. Start from ISO 15926 (Plant Lifecycle) and DEXPI standard as base frameworks.',4060)]),
      tr([bc('R-04',600),dc('LLM hallucination in compliance or safety-critical responses',2500),dc('Medium',1200),dc('Critical',1000),dc('Strict RAG with citation enforcement — all responses grounded in retrieved documents. Confidence threshold gates. Periodic benchmark evaluation by domain SMEs.',4060)]),
      tr([bc('R-05',600),dc('Low adoption among experienced engineers resistant to AI tools',2500),dc('High',1200),dc('Medium',1000),dc('Champion programme with 5 internal power users. Demonstrate time-saving in Week 1 pilot. Keep UI minimal and outcome-focused.',4060)]),
      tr([bc('R-06',600),dc('Integration failure with legacy CMMS systems lacking API access',2500),dc('Low',1200),dc('High',1000),dc('Develop CSV / Excel export-based ingestion fallback. Schedule CMMS API enablement as joint IT programme in Phase 1 planning.',4060)]),
    ]),
    sp(800),
    p('— END OF DOCUMENT —', { center:true, italic:true, color:C.dGray }),
  ];
  return saveDoc(buildDoc(children), 'AIKI_PRD_v1.0.docx');
}

// ╔══════════════════════════════════════════════════════════╗
// ║  DOCUMENT 2: FRD                                        ║
// ╚══════════════════════════════════════════════════════════╝
async function createFRD() {

  function ftbl(rows) {
    return tbl([700,2200,4060,900,1500],[
      tr([hc('FR-ID',700),hc('Feature Name',2200),hc('Description',4060),hc('Priority',900),hc('Module',1500)]),
      ...rows.map(([id,name,desc,pri,mod]) =>
        tr([bc(id,700),dc(name,2200),dc(desc,4060),dc(pri,900,pri==='Must Have'?C.lGreen:pri==='Should Have'?C.lOrange:C.gray),dc(mod,1500)])
      )
    ]);
  }

  function story(id, role, want, so, ac) {
    return [
      h3('User Story ' + id),
      tbl([1600,7760],[
        tr([bc('Story',1600,C.lAccent), dc(`As a ${role}, I want to ${want} so that ${so}.`,7760)]),
      ]),
      sp(80),
      p('Acceptance Criteria:', { bold:true, after:60 }),
      ...ac.map(c => bl(c)),
      sp(100),
    ];
  }

  const children = [
    ...cover(
      'FRD — Functional Requirements Document',
      'AI Industrial Knowledge Intelligence',
      'Feature Specifications, User Stories & Acceptance Criteria'
    ),

    h1('1. Overview'),
    p('This Functional Requirements Document defines the complete functional specification for the AIKI platform across five modules. For each module, functional requirements are presented in a prioritised feature table (using MoSCoW: Must Have, Should Have, Could Have) followed by user stories and associated acceptance criteria.'),
    div(),

    // MODULE 1
    h1('2. Module 1 — Universal Document Ingestion & Knowledge Graph Agent'),
    p('This module is the data foundation for all other AIKI capabilities. It ingests, processes, and enriches heterogeneous industrial documents; extracts entities and relationships; and builds a continuously updated knowledge graph connecting equipment, procedures, regulations, and personnel across all document types and departments.'),
    sp(100),
    ftbl([
      ['FR-1.01','Multi-format Document Ingestion','Ingest and process PDF (text & scanned), DOCX, XLS/XLSX, TIFF/JPEG, MSG/EML email archives, and XML files from connected repositories and manual uploads.','Must Have','M1'],
      ['FR-1.02','OCR Processing','Apply intelligent OCR (Azure Document Intelligence + Tesseract fallback) achieving >95% character accuracy on good-quality scans and >85% on legacy documents.','Must Have','M1'],
      ['FR-1.03','P&ID Computer Vision Parsing','Apply CV models to extract instrument tags, equipment tags, line numbers, process boundaries, and inter-equipment connections from P&ID drawings.','Must Have','M1'],
      ['FR-1.04','Named Entity Recognition (NER)','Extract: equipment tags, process parameters, locations, personnel names, dates, revision numbers, regulatory references, and spare part numbers.','Must Have','M1'],
      ['FR-1.05','Knowledge Graph Construction','Build and maintain a Neo4j graph linking Equipment <-> Documents, Procedures <-> Equipment, Regulations <-> Procedures, Incidents <-> Equipment, Work Orders <-> Failure Modes.','Must Have','M1'],
      ['FR-1.06','Auto-classification & Tagging','Classify incoming documents by type (SOP, P&ID, Work Order, Inspection Report, OEM Manual, Incident Report, Regulation, NCR) using a fine-tuned classification model.','Must Have','M1'],
      ['FR-1.07','Continuous Incremental Update','Detect new and updated documents via change event subscriptions or polling. Process updates within 15 minutes of document creation or modification.','Must Have','M1'],
      ['FR-1.08','Extraction Confidence Scoring','Assign confidence scores (0-100%) to all extracted entities. Flag low-confidence extractions (< configurable threshold, default 80%) for human review.','Should Have','M1'],
      ['FR-1.09','Human-in-the-Loop Review Queue','Provide a review interface for Document Controllers to validate, correct, or reject low-confidence extractions. Corrections feed back into extraction models.','Should Have','M1'],
      ['FR-1.10','Knowledge Graph Visualisation','Interactive graph browser allowing users to explore entity relationships, traverse connections, and filter by entity type.','Could Have','M1'],
    ]),
    sp(100),

    ...story('US-1.1', 'Document Controller (Anita)',
      'upload a document and have it automatically classified, tagged, and linked to related equipment and procedures',
      'I do not have to manually classify or tag documents, saving hours of registration work per week',
      [
        'System accepts PDF, DOCX, XLS/XLSX, TIFF/JPEG, MSG, and XML. Other formats are rejected with a clear error message.',
        'Document type is classified automatically with a confidence score displayed.',
        'Equipment tags mentioned in the document are extracted and linked in the knowledge graph within 5 minutes of upload.',
        'Documents with any entity extraction confidence below 80% appear in the review queue.',
        'User receives an in-app notification when ingestion and linking are complete.',
      ]
    ),

    ...story('US-1.2', 'Maintenance Engineer (Rajesh)',
      'search for "Pump P-101" and immediately see all linked documents, work orders, and procedures across systems',
      'I do not have to search across 4 separate systems to build a complete picture of an equipment item',
      [
        'Equipment tag search returns a unified Equipment Profile page within 2 seconds.',
        'Profile aggregates: linked P&IDs, work order history (last 5 years), applicable SOPs, OEM manual sections, and open inspection records.',
        'Each linked document shows title, type, revision date, system of origin, and a direct link.',
        'Profile includes a failure frequency trend chart (corrective work orders per year).',
        'User can filter by document type, date range, and work order status.',
      ]
    ),

    ...story('US-1.3', 'Plant Manager (Vikram)',
      'view a knowledge coverage dashboard showing which equipment classes and departments have sufficient documented procedures',
      'I can identify knowledge gaps proactively before they result in incidents or audit findings',
      [
        'Dashboard displays coverage scores by equipment class: % of tagged equipment with linked SOPs, P&IDs, and inspection records.',
        'Department-level view shows document completeness relative to equipment inventory.',
        'Equipment items with zero linked procedures are flagged as critical gaps.',
        'Dashboard refreshes daily; trend data shows coverage improvement over time.',
        'Export to PDF and Excel available for management reporting.',
      ]
    ),

    pb(),

    // MODULE 2
    h1('3. Module 2 — Expert Knowledge Copilot'),
    p('The Expert Knowledge Copilot provides a conversational AI interface powered by Retrieval-Augmented Generation (RAG) over the AIKI knowledge base. It answers operational, maintenance, and engineering queries in natural language, citing specific source documents, providing confidence scores, and routing to human experts when required.'),
    sp(100),
    ftbl([
      ['FR-2.01','Conversational Query Interface','Chat-style interface supporting natural language questions in English. Answers grounded in retrieved AIKI documents with source citations.','Must Have','M2'],
      ['FR-2.02','RAG-Grounded Responses','All responses use Retrieval-Augmented Generation. Each response cites source documents: title, section, page number, revision.','Must Have','M2'],
      ['FR-2.03','Confidence Scoring','Display a response confidence level (High / Medium / Low) based on retrieval scores and generation certainty. Low-confidence triggers "Escalate to Expert" recommendation.','Must Have','M2'],
      ['FR-2.04','Mobile-First PWA','Responsive PWA optimised for mobile use. Voice-to-text query input on mobile. Works on 2G/3G with offline cached responses.','Must Have','M2'],
      ['FR-2.05','Equipment-Context Queries','Accept equipment tag numbers as query context (e.g., "What is the startup procedure for P-101?") to retrieve equipment-specific documents before formulating the answer.','Must Have','M2'],
      ['FR-2.06','Conversational Follow-up','Multi-turn conversation with context retention across 10 turns. Users can refine or expand the previous answer with follow-up questions.','Should Have','M2'],
      ['FR-2.07','Expert Escalation & Routing','When confidence is below threshold or query involves safety-critical decisions, route to named SMEs with query context and provisional answer.','Should Have','M2'],
      ['FR-2.08','Query History & Bookmarks','Per-user query history and bookmark functionality. Aggregated anonymous query logs identify knowledge gaps.','Could Have','M2'],
    ]),
    sp(100),

    ...story('US-2.1', 'Field Technician (Suresh)',
      'ask "What is the isolation procedure for control valve FV-205?" from my mobile phone in the field and receive a clear step-by-step answer with the source document reference',
      'I can safely execute the isolation without returning to the control room or calling an engineer',
      [
        'Query response is delivered within 10 seconds on a 3G connection.',
        'Response includes numbered steps extracted from the source SOP.',
        'Source document title, revision number, and section are cited below the answer.',
        'Confidence level is displayed. If Low, a "Confirm with supervisor before proceeding" disclaimer is shown.',
        'If the procedure does not exist in AIKI, the response explicitly states "Procedure not found — please contact the control room" rather than generating a fabricated answer.',
      ]
    ),

    ...story('US-2.2', 'Maintenance Engineer (Rajesh)',
      'ask about the most common failure modes for Centrifugal Pump P-101 and what corrective actions have been effective historically',
      'I can make a faster, better-informed maintenance decision without manually reviewing 5 years of work orders',
      [
        'Response identifies top 3 failure modes by frequency with work order count and last occurrence date.',
        'For each failure mode, the most effective corrective action (by work order outcome) is cited.',
        'OEM recommended actions from the ingested manual are cross-referenced with historical actual actions.',
        'All data points include the specific work order ID or OEM manual section as the source citation.',
        'Response is generated within 15 seconds.',
      ]
    ),

    ...story('US-2.3', 'Compliance Officer (Priya)',
      'ask what OISD-STD-116 requires regarding pressure vessel inspection frequency and whether current procedures are compliant',
      'I can identify compliance gaps without manually cross-referencing regulation text against our procedures',
      [
        'Response quotes the specific OISD-STD-116 clause and its requirements.',
        'Response compares this against the currently active inspection procedure found in AIKI.',
        'Any gap is explicitly flagged as "GAP IDENTIFIED" with the specific discrepancy described.',
        'Source documents cited for both the regulation text and the internal procedure.',
        'Response recommends action: "Update procedure [ref] to align with OISD-STD-116 Clause X.Y."',
      ]
    ),

    pb(),

    // MODULE 3
    h1('4. Module 3 — Maintenance Intelligence & RCA Agent'),
    p('The Maintenance Intelligence module synthesises work order history, equipment failure records, OEM manuals, inspection findings, and operating conditions to generate predictive maintenance recommendations, support Root Cause Analysis investigations, and produce optimised maintenance schedules.'),
    sp(100),
    ftbl([
      ['FR-3.01','Work Order History Analysis','Analyse work order history (from SAP PM / Maximo) to identify failure mode frequency, MTBF, MTTR, and recurring equipment issues.','Must Have','M3'],
      ['FR-3.02','RCA Workflow Template','Structured RCA templates (5-Why, Fishbone, Fault Tree) pre-populated with equipment history, previous similar failures, and OEM guidance — reducing RCA time from days to hours.','Must Have','M3'],
      ['FR-3.03','Failure Signature Alerting','Detect when current work order patterns match known failure signatures in the historical record. Generate proactive alerts to the maintenance team.','Must Have','M3'],
      ['FR-3.04','Predictive Maintenance Recommendations','Based on failure frequency, MTBF, OEM intervals, and equipment age, generate condition-based maintenance recommendations with priority scoring.','Should Have','M3'],
      ['FR-3.05','Maintenance Schedule Optimisation','Generate optimised planned maintenance schedules that minimise total downtime by grouping same-location activities and aligning with production windows.','Should Have','M3'],
      ['FR-3.06','Cross-Equipment Failure Correlation','Identify correlated failures across equipment (e.g., when HX-302 fails, P-105 fails within 72 hours in 78% of cases).','Could Have','M3'],
    ]),
    sp(100),

    ...story('US-3.1', 'Maintenance Engineer (Rajesh)',
      'initiate an RCA investigation for an equipment failure and receive a pre-populated RCA template with failure history, previous similar RCAs, and OEM failure guidance already assembled',
      'I can complete a high-quality RCA in hours rather than days by eliminating information retrieval overhead',
      [
        'RCA is initiated by entering an equipment tag and a brief failure description.',
        'System retrieves last 5 years of work orders for the equipment within 30 seconds.',
        'Template pre-fills: failure mode frequency, timeline of last 10 events, OEM known failure modes and causes.',
        'Previous RCAs for the same equipment or same failure mode on similar equipment are linked as references.',
        'Completed RCA is stored in AIKI, linked to the equipment, and informs future failure signature detection.',
      ]
    ),

    ...story('US-3.2', 'Plant Operations Manager (Vikram)',
      'receive a proactive alert that Compressor C-201\'s current failure pattern matches the signature that preceded its major failure in 2021',
      'My maintenance team can intervene before the failure occurs, preventing a costly unplanned shutdown',
      [
        'Alert is generated when rolling 30-day work order pattern matches a defined failure signature with >75% similarity.',
        'Alert includes: equipment tag, failure signature matched, match confidence percentage, and recommended preventive action.',
        'Alert is delivered via in-app notification and email to the responsible maintenance engineer and plant manager.',
        'Linked historical evidence (work orders from the referenced event) is accessible directly from the alert.',
        'Alert can be acknowledged, escalated, or dismissed (with mandatory reason code) by the maintenance lead.',
      ]
    ),

    pb(),

    // MODULE 4
    h1('5. Module 4 — Quality & Regulatory Compliance Intelligence'),
    p('The Compliance Intelligence module maps the applicable regulatory and quality framework against the organisation\'s current procedures, equipment states, and inspection records. It detects compliance gaps proactively, generates audit evidence packages, and flags quality deviations before escalation.'),
    sp(100),
    ftbl([
      ['FR-4.01','Regulatory Corpus Ingestion','Ingest and structure the text of Factory Act 1948, all 200+ OISD standards, PESO regulations, CPCB environmental norms, and BIS standards. Maintain linkages to clauses and sub-clauses.','Must Have','M4'],
      ['FR-4.02','Procedure-Regulation Mapping','Automatically map internal procedures (SOPs, work instructions, inspection procedures) to the specific regulatory clauses they satisfy.','Must Have','M4'],
      ['FR-4.03','Compliance Gap Detection','Compare regulatory requirements against current procedures, equipment records, and inspection evidence. Identify gaps, expired certificates, overdue inspections, and non-conforming practices.','Must Have','M4'],
      ['FR-4.04','Audit Evidence Package Generation','Auto-compile audit evidence packages: mapped procedures, inspection records, certificates, training records, and gap summary as a structured PDF with table of contents.','Must Have','M4'],
      ['FR-4.05','Compliance Change Alerts','Monitor for regulatory updates. Alert procedure owners when a procedure may require revision due to a regulatory change.','Should Have','M4'],
      ['FR-4.06','Quality Non-Conformance Tracking','Ingest quality NCRs and CAPA records. Link to equipment, procedures, and regulations. Track open/overdue corrective actions.','Should Have','M4'],
    ]),
    sp(100),

    ...story('US-4.1', 'Compliance Officer (Priya)',
      'run a compliance gap check against Factory Act 1948 Schedule requirements and receive a structured gap report with evidence links',
      'I can prepare for a statutory inspection in hours rather than weeks',
      [
        'Gap check is initiated by selecting the regulation and scope (full plant, specific area, or equipment class).',
        'Output includes a compliance matrix: Clause / Status / Evidence / Gap Description / Responsible Owner.',
        'Status uses traffic-light coding: Green (compliant + evidence found), Amber (partial evidence), Red (non-compliant or evidence missing).',
        'Report is exportable as PDF and Excel within 5 minutes of initiation.',
      ]
    ),

    ...story('US-4.2', 'Document Controller (Anita)',
      'click a single button to generate an audit evidence package for an upcoming PESO inspection covering Process Area 3',
      'I do not have to manually compile evidence from 6 different systems over 2 weeks',
      [
        'Evidence package generation is initiated by selecting the regulation, scope, and date range.',
        'System compiles: applicable procedures with revision and approval status, inspection records within scope, equipment certificates, and a compliance gap summary.',
        'Package is generated as a structured PDF with table of contents and regulatory clause references.',
        'Generation completes within 15 minutes for a standard audit scope.',
        'Package includes a cover sheet showing scope, evidence completeness percentage, and identified gaps.',
      ]
    ),

    pb(),

    // MODULE 5
    h1('6. Module 5 — Lessons Learned & Failure Intelligence Engine'),
    p('The Lessons Learned Engine analyses incident reports, near-miss records, audit findings, and quality non-conformances using internal history and external industry databases to identify systemic patterns invisible to individual reviews, and proactively alerts operational teams when similar conditions emerge.'),
    sp(100),
    ftbl([
      ['FR-5.01','Incident & Near-Miss Corpus Ingestion','Ingest incident investigation reports, near-miss records, safety observations, and LTI reports. Extract root causes, contributing factors, equipment involved, and corrective actions.','Must Have','M5'],
      ['FR-5.02','Pattern Analysis','Apply NLP clustering and trend analysis to identify systemic patterns across incidents: recurring failure modes, seasonal patterns, equipment class vulnerabilities.','Must Have','M5'],
      ['FR-5.03','Proactive Similar-Condition Alerts','When current equipment states or maintenance patterns match the precursor conditions of a past incident, generate a proactive alert to the responsible team.','Must Have','M5'],
      ['FR-5.04','Cross-Plant Lesson Sharing','In multi-plant deployments, allow lessons learned at one plant to be shared across all plants with appropriate access controls.','Should Have','M5'],
      ['FR-5.05','Lessons Learned Register','Searchable register with categories, tags, linked equipment, applicability filters, and status tracking for associated corrective actions.','Should Have','M5'],
    ]),
    sp(100),

    ...story('US-5.1', 'HSE Manager',
      'view a systemic pattern analysis report showing which equipment classes and work activities have the highest frequency of near-miss incidents over the past 3 years',
      'I can direct safety improvement resources to the highest-impact areas rather than reacting to individual incidents',
      [
        'Report aggregates all ingested near-miss and incident records within the specified date range.',
        'Incidents are clustered by root cause category, equipment class, work activity type, and shift/time patterns.',
        'Top 5 systemic patterns are highlighted with frequency count, trend direction, and most recent occurrence.',
        'Each pattern links to the underlying incident records for drill-down review.',
        'Report is auto-generated monthly and distributed to HSE leadership by email.',
      ]
    ),

    ...story('US-5.2', 'Maintenance Supervisor',
      'receive an alert that the current maintenance backlog and operating pattern for Heat Exchanger HX-401 matches the conditions that preceded a tube rupture incident in 2019',
      'I can take immediate preventive action before a similar incident occurs',
      [
        'Alert is triggered when precursor condition similarity score exceeds 70%.',
        'Alert clearly states the matched historical incident ID, date, and failure type.',
        'Alert includes the specific precursor conditions matched and their individual match confidence scores.',
        'Recommended immediate actions from the original incident\'s corrective action report are listed.',
        'Alert is delivered to the Maintenance Supervisor and Plant Manager within 15 minutes of condition detection.',
      ]
    ),

    sp(800),
    p('— END OF DOCUMENT —', { center:true, italic:true, color:C.dGray }),
  ];
  return saveDoc(buildDoc(children), 'AIKI_FRD_v1.0.docx');
}

// ╔══════════════════════════════════════════════════════════╗
// ║  DOCUMENT 3: DRD                                        ║
// ╚══════════════════════════════════════════════════════════╝
async function createDRD() {
  const children = [
    ...cover(
      'DRD — Data Requirements Document',
      'AI Industrial Knowledge Intelligence',
      'Data Sources, Schemas, Refresh Rates & Governance'
    ),

    h1('1. Data Architecture Overview'),
    p('The AIKI platform ingests, processes, and maintains data from a diverse corpus of industrial documents and operational systems. The data architecture is structured in five layers:'),
    nb('Raw Ingestion Layer: Original documents from source systems (DMS, CMMS, email, manual uploads).'),
    nb('Processing Layer: OCR output, extracted entities, NLP annotations, and computer vision outputs.'),
    nb('Knowledge Layer: Knowledge graph (Neo4j), vector embeddings (Pinecone), and metadata index (Elasticsearch).'),
    nb('Query Layer: RAG retrieval pipeline and conversational AI response generation.'),
    nb('Governance Layer: Data quality scores, extraction confidence tracking, human review queue, and audit logs.'),
    div(),

    h1('2. Data Source Catalogue'),
    tbl([700,1900,1200,1300,1500,760,1900],[
      tr([hc('DS-ID',700),hc('Source Name',1900),hc('Format(s)',1200),hc('Volume Estimate',1300),hc('Source System',1500),hc('Refresh',760),hc('Priority',1900)]),
      tr([bc('DS-01',700),dc('Engineering Drawings & P&IDs',1900),dc('PDF, TIFF, DWG',1200),dc('5,000-15,000 files',1300),dc('SharePoint / EDM',1500),dc('Monthly',760),dc('Critical — equipment graph foundation',1900)]),
      tr([bc('DS-02',700),dc('Standard Operating Procedures (SOPs)',1900),dc('PDF, DOCX',1200),dc('2,000-8,000 docs',1300),dc('SharePoint / OpenText',1500),dc('Weekly',760),dc('Critical — primary RAG corpus',1900)]),
      tr([bc('DS-03',700),dc('Maintenance Work Orders',1900),dc('SAP PM / CSV export',1200),dc('50,000+ WOs/yr',1300),dc('SAP PM / Maximo',1500),dc('Daily',760),dc('Critical — failure history',1900)]),
      tr([bc('DS-04',700),dc('Equipment Inspection Records',1900),dc('PDF, Excel',1200),dc('10,000+ records',1300),dc('SharePoint / paper',1500),dc('Weekly',760),dc('High — compliance evidence',1900)]),
      tr([bc('DS-05',700),dc('OEM Equipment Manuals',1900),dc('PDF',1200),dc('500-2,000 manuals',1300),dc('SharePoint / physical',1500),dc('On change',760),dc('High — maintenance guidance',1900)]),
      tr([bc('DS-06',700),dc('Safety Procedures (JSA, MSDS, PTW templates)',1900),dc('PDF, DOCX',1200),dc('1,000-3,000 docs',1300),dc('HSE DMS',1500),dc('Monthly',760),dc('High — compliance & RAG',1900)]),
      tr([bc('DS-07',700),dc('Regulatory Standards (OISD, PESO, Factory Act, BIS)',1900),dc('PDF',1200),dc('500-1,500 standards',1300),dc('External / PESO portal',1500),dc('Quarterly',760),dc('High — compliance mapping',1900)]),
      tr([bc('DS-08',700),dc('Incident & Near-Miss Reports',1900),dc('PDF, DOCX, Excel',1200),dc('200-2,000 reports',1300),dc('HSE system / SharePoint',1500),dc('Weekly',760),dc('High — lessons learned',1900)]),
      tr([bc('DS-09',700),dc('Quality NCR & CAPA Records',1900),dc('PDF, Excel',1200),dc('1,000-5,000 records',1300),dc('QMS / SharePoint',1500),dc('Weekly',760),dc('Medium — quality intelligence',1900)]),
      tr([bc('DS-10',700),dc('Email Archives (engineering & HSE)',1900),dc('MSG, EML, PST',1200),dc('Variable — millions',1300),dc('Exchange / Outlook',1500),dc('Weekly delta',760),dc('Medium — informal knowledge',1900)]),
      tr([bc('DS-11',700),dc('Project Documents (EPC deliverables)',1900),dc('PDF, DOCX, Excel',1200),dc('10,000-50,000 docs',1300),dc('SharePoint / DVDs',1500),dc('Static (backfile)',760),dc('Medium — as-built baseline',1900)]),
    ]),
    div(),

    h1('3. Core Entity Schema Definitions'),
    p('The AIKI knowledge graph is built on four primary entity types. Each schema defines field names, data types, source systems, and descriptions.'),

    h2('3.1  Equipment Entity'),
    tbl([2200,1400,1600,4160],[
      tr([hc('Field Name',2200),hc('Data Type',1400),hc('Source',1600),hc('Description',4160)]),
      tr([bc('equipment_id',2200),dc('String (PK)',1400),dc('CMMS / NER',1600),dc('Unique equipment identifier (e.g., "P-101"). Primary graph node key.',4160)]),
      tr([bc('tag_number',2200),dc('String',1400),dc('CMMS / NER',1600),dc('Instrument / equipment tag per plant tagging convention (ISA-5.1).',4160)]),
      tr([bc('equipment_name',2200),dc('String',1400),dc('CMMS / OEM Manual',1600),dc('Descriptive name (e.g., "Feed Water Booster Pump").',4160)]),
      tr([bc('equipment_class',2200),dc('Enum',1400),dc('CMMS / ontology',1600),dc('PUMP | COMPRESSOR | VESSEL | HEAT_EXCHANGER | VALVE | INSTRUMENT | ELECTRICAL | STRUCTURE.',4160)]),
      tr([bc('plant_area',2200),dc('String',1400),dc('CMMS / P&ID',1600),dc('Plant area / unit code (e.g., "CDU-02", "AREA-3").',4160)]),
      tr([bc('manufacturer',2200),dc('String',1400),dc('OEM Manual / CMMS',1600),dc('Equipment manufacturer name.',4160)]),
      tr([bc('installation_date',2200),dc('Date',1400),dc('CMMS / As-built',1600),dc('Date equipment was commissioned and put into service.',4160)]),
      tr([bc('criticality_rating',2200),dc('Enum',1400),dc('CMMS / manual',1600),dc('A (Safety Critical) | B (Production Critical) | C (Non-critical).',4160)]),
      tr([bc('parent_equipment_id',2200),dc('String (FK)',1400),dc('CMMS / P&ID',1600),dc('Parent equipment ID for hierarchical assemblies (e.g., impeller -> pump).',4160)]),
    ]),
    sp(),

    h2('3.2  Document Entity'),
    tbl([2200,1400,1600,4160],[
      tr([hc('Field Name',2200),hc('Data Type',1400),hc('Source',1600),hc('Description',4160)]),
      tr([bc('doc_id',2200),dc('UUID (PK)',1400),dc('AIKI (generated)',1600),dc('System-generated unique document identifier within AIKI.',4160)]),
      tr([bc('source_doc_id',2200),dc('String',1400),dc('Source DMS',1600),dc('Document number in source system (SharePoint ID, Documentum ID, etc.).',4160)]),
      tr([bc('title',2200),dc('String',1400),dc('NER / Metadata',1600),dc('Document title extracted from metadata or NER.',4160)]),
      tr([bc('doc_type',2200),dc('Enum',1400),dc('Classification model',1600),dc('SOP | P_AND_ID | WORK_ORDER | INSPECTION | OEM_MANUAL | INCIDENT | REGULATION | NCR | DRAWING | EMAIL | OTHER.',4160)]),
      tr([bc('revision',2200),dc('String',1400),dc('NER / Metadata',1600),dc('Revision identifier (e.g., "Rev 3", "B", "2024-03").',4160)]),
      tr([bc('effective_date',2200),dc('Date',1400),dc('NER / Metadata',1600),dc('Date document became effective or was approved.',4160)]),
      tr([bc('equipment_tags[]',2200),dc('String[]',1400),dc('NER (equipment entity)',1600),dc('List of equipment tag IDs mentioned in this document.',4160)]),
      tr([bc('regulatory_refs[]',2200),dc('String[]',1400),dc('NER (regulation entity)',1600),dc('List of regulatory clause references cited in this document.',4160)]),
      tr([bc('extraction_confidence',2200),dc('Float (0-1)',1400),dc('NER pipeline',1600),dc('Overall entity extraction confidence score for this document.',4160)]),
      tr([bc('vector_embedding_id',2200),dc('String',1400),dc('Embedding pipeline',1600),dc('Reference ID of the document\'s chunk embeddings in the vector database.',4160)]),
      tr([bc('source_system',2200),dc('Enum',1400),dc('Ingestion pipeline',1600),dc('SHAREPOINT | OPENTEXT | SAP_PM | MAXIMO | EMAIL | MANUAL_UPLOAD.',4160)]),
    ]),
    sp(),

    h2('3.3  Work Order Entity'),
    tbl([2200,1400,1600,4160],[
      tr([hc('Field Name',2200),hc('Data Type',1400),hc('Source',1600),hc('Description',4160)]),
      tr([bc('wo_id',2200),dc('String (PK)',1400),dc('CMMS (SAP PM / Maximo)',1600),dc('Work order number from CMMS system.',4160)]),
      tr([bc('equipment_id',2200),dc('String (FK)',1400),dc('CMMS',1600),dc('Equipment tag this work order relates to.',4160)]),
      tr([bc('wo_type',2200),dc('Enum',1400),dc('CMMS',1600),dc('CORRECTIVE | PREVENTIVE | PREDICTIVE | SHUTDOWN | INSPECTION.',4160)]),
      tr([bc('failure_mode',2200),dc('String',1400),dc('CMMS / NER',1600),dc('Failure mode description (e.g., "Bearing failure", "Seal leak", "Vibration high").',4160)]),
      tr([bc('root_cause',2200),dc('String',1400),dc('CMMS / NER',1600),dc('Root cause as recorded in work order completion notes.',4160)]),
      tr([bc('action_taken',2200),dc('String',1400),dc('CMMS / NER',1600),dc('Corrective action performed, from work order completion description.',4160)]),
      tr([bc('reported_date',2200),dc('DateTime',1400),dc('CMMS',1600),dc('Date and time the failure or work requirement was reported.',4160)]),
      tr([bc('completion_date',2200),dc('DateTime',1400),dc('CMMS',1600),dc('Date and time the work order was completed.',4160)]),
      tr([bc('man_hours',2200),dc('Float',1400),dc('CMMS',1600),dc('Total man-hours consumed to complete this work order.',4160)]),
      tr([bc('spare_parts[]',2200),dc('Object[]',1400),dc('CMMS',1600),dc('Spare parts used: {part_number, description, quantity, unit_cost}.',4160)]),
    ]),
    sp(),

    h2('3.4  Incident Entity'),
    tbl([2200,1400,1600,4160],[
      tr([hc('Field Name',2200),hc('Data Type',1400),hc('Source',1600),hc('Description',4160)]),
      tr([bc('incident_id',2200),dc('String (PK)',1400),dc('HSE System / NER',1600),dc('Unique incident identifier from HSE system or AIKI assignment.',4160)]),
      tr([bc('incident_date',2200),dc('DateTime',1400),dc('Report / NER',1600),dc('Date and time the incident occurred.',4160)]),
      tr([bc('incident_type',2200),dc('Enum',1400),dc('Classification model',1600),dc('LTI | NEAR_MISS | FIRST_AID | PROPERTY_DAMAGE | ENVIRONMENTAL | FIRE | SPILL | PROCESS_SAFETY.',4160)]),
      tr([bc('severity',2200),dc('Enum',1400),dc('Report / NER',1600),dc('CATASTROPHIC | CRITICAL | MAJOR | MODERATE | MINOR.',4160)]),
      tr([bc('equipment_involved[]',2200),dc('String[]',1400),dc('NER (equipment entity)',1600),dc('Equipment tag IDs involved in or contributing to the incident.',4160)]),
      tr([bc('root_causes[]',2200),dc('String[]',1400),dc('NER / report',1600),dc('Root causes identified using the investigation methodology (5-Why, Bow-Tie, etc.).',4160)]),
      tr([bc('corrective_actions[]',2200),dc('Object[]',1400),dc('NER / report',1600),dc('Actions: {description, responsible_owner, due_date, status}.',4160)]),
      tr([bc('lessons_learned',2200),dc('String',1400),dc('NER / report',1600),dc('Key lessons learned as stated in the investigation report.',4160)]),
    ]),
    div(),

    h1('4. Data Refresh Rates & Synchronisation'),
    tbl([1800,1700,1700,4160],[
      tr([hc('Data Source',1800),hc('Frequency',1700),hc('Method',1700),hc('Notes',4160)]),
      tr([dc('SAP PM Work Orders',1800),dc('Daily (overnight batch)',1700),dc('OData API delta pull',1700),dc('Pull all WOs modified in the past 24 hours. Full re-sync monthly for backdated changes.',4160)]),
      tr([dc('SharePoint Documents',1800),dc('Near real-time (15 min)',1700),dc('Microsoft Graph webhook',1700),dc('Subscribe to document library change events. New/modified documents queued immediately.',4160)]),
      tr([dc('OpenText Documents',1800),dc('Weekly batch',1700),dc('Documentum REST delta crawl',1700),dc('Poll for documents modified since last crawl. Near-real-time in Phase 2 with event subscription.',4160)]),
      tr([dc('Email Archives',1800),dc('Weekly delta',1700),dc('IMAP IDLE / Exchange EWS',1700),dc('Index relevant engineering and HSE mailboxes. Scoped to defined sender/recipient domains.',4160)]),
      tr([dc('Incident & HSE Records',1800),dc('Weekly batch',1700),dc('SharePoint / HSE system API',1700),dc('Pull newly closed and recently modified incident reports.',4160)]),
      tr([dc('Regulatory Standards',1800),dc('Quarterly',1700),dc('Manual upload + review',1700),dc('Compliance team notified to upload any new or revised regulatory documents. Version tracked.',4160)]),
    ]),
    div(),

    h1('5. Data Access Methods'),
    tbl([2000,1800,1800,3760],[
      tr([hc('Source System',2000),hc('Protocol',1800),hc('Authentication',1800),hc('Notes & Constraints',3760)]),
      tr([dc('SAP Plant Maintenance',2000),dc('SAP OData V2 API',1800),dc('LDAP service account',1800),dc('Read-only. Equipment master + work order history. Max 5-second response. Batch via RFC function modules.',3760)]),
      tr([dc('IBM Maximo',2000),dc('Maximo REST API (JSON)',1800),dc('OAuth 2.0 service account',1800),dc('Read-only. Work order and asset data. Batch via OSLC API.',3760)]),
      tr([dc('SharePoint Online',2000),dc('Microsoft Graph API',1800),dc('Azure AD app registration',1800),dc('Scoped to specific document libraries. Read-only. Webhook for change events.',3760)]),
      tr([dc('OpenText Documentum',2000),dc('Documentum REST API',1800),dc('HTTP Basic service account',1800),dc('Read-only. Delta crawl using _modify_date query filter.',3760)]),
      tr([dc('Email (Exchange/Outlook)',2000),dc('Exchange Web Services (EWS)',1800),dc('OAuth 2.0 service account',1800),dc('Scoped to HSE and Engineering mailboxes only. Privacy review required before activation.',3760)]),
      tr([dc('Manual Upload (AIKI Portal)',2000),dc('HTTPS multipart upload',1800),dc('AIKI session (RBAC)',1800),dc('Drag-and-drop or API-based. Max 100 MB per document. Batch ZIP upload supported.',3760)]),
    ]),
    div(),

    h1('6. Data Governance & Ownership'),
    tbl([2200,1800,2000,3360],[
      tr([hc('Data Domain',2200),hc('Data Owner',1800),hc('Data Steward',2000),hc('Responsibilities',3360)]),
      tr([dc('Engineering Documents',2200),dc('Head of Engineering',1800),dc('Lead Document Controller',2000),dc('Approve ingestion scope, validate P&ID entity extractions, approve ontology changes.',3360)]),
      tr([dc('Maintenance Work Orders',2200),dc('Maintenance Manager',1800),dc('Maintenance Planner',2000),dc('Validate WO data quality, review failure mode taxonomy, approve maintenance intelligence outputs.',3360)]),
      tr([dc('HSE Records & Incidents',2200),dc('Head of HSE',1800),dc('HSE Coordinator',2000),dc('Approve incident ingestion scope, validate incident classification, control cross-plant lesson sharing.',3360)]),
      tr([dc('Regulatory Corpus',2200),dc('Compliance Officer',1800),dc('HSE Document Controller',2000),dc('Maintain regulatory corpus currency, approve regulation-to-procedure mappings.',3360)]),
      tr([dc('Quality Records',2200),dc('Quality Manager',1800),dc('QMS Administrator',2000),dc('Approve NCR and CAPA ingestion, validate quality entity extractions.',3360)]),
    ]),
    div(),

    h1('7. Data Retention Policy'),
    tbl([2200,1800,1800,3560],[
      tr([hc('Data Category',2200),hc('Active Retention',1800),hc('Archive Retention',1800),hc('Regulatory Basis',3560)]),
      tr([dc('Ingested Document Content',2200),dc('Unlimited (active)',1800),dc('7 years post-supersession',1800),dc('Company policy. Superseded documents remain searchable with version label.',3560)]),
      tr([dc('Equipment Maintenance Records',2200),dc('Full history (active)',1800),dc('Minimum 10 years',1800),dc('Factory Act 1948, OISD requirements for statutory equipment records.',3560)]),
      tr([dc('Incident & Near-Miss Records',2200),dc('Full history (active)',1800),dc('10 years; LTI: permanent',1800),dc('OISD-STD-154, Factory Act, CPCB requirements for accident records.',3560)]),
      tr([dc('Compliance Evidence',2200),dc('Current standard period',1800),dc('10 years post-revision',1800),dc('Required for statutory audit response.',3560)]),
      tr([dc('User Query & Audit Logs',2200),dc('12 months (active)',1800),dc('7 years (archive)',1800),dc('IT security policy. DPDPA 2023 data minimisation applied.',3560)]),
      tr([dc('Personal Data (user profiles)',2200),dc('Duration of employment + 90 days',1800),dc('Deleted on request',1800),dc('DPDPA 2023 right to erasure. Query logs pseudonymised on account deletion.',3560)]),
    ]),
    sp(800),
    p('— END OF DOCUMENT —', { center:true, italic:true, color:C.dGray }),
  ];
  return saveDoc(buildDoc(children), 'AIKI_DRD_v1.0.docx');
}

// ╔══════════════════════════════════════════════════════════╗
// ║  DOCUMENT 4: TRD                                        ║
// ╚══════════════════════════════════════════════════════════╝
async function createTRD() {
  const children = [
    ...cover(
      'TRD — Technical Requirements Document',
      'AI Industrial Knowledge Intelligence',
      'Technology Stack, Architecture & Integration Specifications'
    ),

    h1('1. System Architecture Overview'),
    p('The AIKI platform is designed as a cloud-native, microservices-based system deployed on Indian cloud infrastructure (AWS ap-south-1 or Azure Central India). The architecture spans seven layers: document ingestion, document processing, knowledge engineering, AI/ML inference, application, integration, and infrastructure. The system is horizontally scalable, with stateless processing workers and a shared persistent knowledge layer.'),
    p('Core architectural principles:'),
    bl('RAG-first: All AI-generated responses are grounded in retrieved documents. No generative response is produced without retrieval context.'),
    bl('Event-driven ingestion: Document updates trigger asynchronous processing pipelines, completely decoupled from query serving.'),
    bl('Knowledge graph as connective tissue: All entity relationships maintained in the graph layer; vector store handles semantic similarity; full-text search handles keyword retrieval.'),
    bl('Zero-trust security: All service-to-service communication authenticated via service accounts and mTLS. No implicit trust between microservices.'),
    bl('Data residency: No document content or extracted data leaves Indian cloud regions.'),
    div(),

    h1('2. Technology Stack'),
    tbl([1600,1900,2100,1000,2760],[
      tr([hc('Layer',1600),hc('Component',1900),hc('Technology',2100),hc('Version',1000),hc('Rationale',2760)]),
      tr([bc('Frontend',1600),dc('Web Application',1900),dc('Next.js (React)',2100),dc('14.x',1000),dc('SSR for performance on slow connections; excellent PWA support; strong ecosystem for industrial UI.',2760)]),
      tr([bc('Frontend',1600),dc('CSS & Design System',1900),dc('TailwindCSS + shadcn/ui',2100),dc('3.x',1000),dc('Rapid responsive development; accessible components; consistent design tokens across mobile/desktop.',2760)]),
      tr([bc('Frontend',1600),dc('State Management',1900),dc('Zustand + React Query',2100),dc('4.x / 5.x',1000),dc('Lightweight global state; server-state caching reduces API calls for mobile users.',2760)]),
      tr([bc('Backend',1600),dc('API Gateway',1900),dc('FastAPI (Python)',2100),dc('0.110+',1000),dc('High-performance async Python; native OpenAPI schema; excellent AI/ML workload integration.',2760)]),
      tr([bc('Backend',1600),dc('Message Queue',1900),dc('Apache Kafka',2100),dc('3.6+',1000),dc('High-throughput event streaming for document ingestion; supports replay for reprocessing.',2760)]),
      tr([bc('Backend',1600),dc('Task Queue / Workers',1900),dc('Celery + Redis',2100),dc('5.x / 7.x',1000),dc('Distributed task queue for document processing jobs; Redis as broker and result backend.',2760)]),
      tr([bc('AI/ML — LLM',1600),dc('Large Language Model',1900),dc('Anthropic Claude 3.5 Sonnet / GPT-4o',2100),dc('Latest stable',1000),dc('Primary: Claude for safety-conscious industrial responses. GPT-4o fallback. Both via API with data masking.',2760)]),
      tr([bc('AI/ML — Embeddings',1600),dc('Embedding Model',1900),dc('text-embedding-3-small + bge-m3',2100),dc('Latest',1000),dc('OpenAI for general text; bge-m3 for multilingual and technical domain content; bge also for offline mode.',2760)]),
      tr([bc('AI/ML — RAG',1600),dc('RAG Orchestration',1900),dc('LangChain + LlamaIndex',2100),dc('0.2+ / 0.10+',1000),dc('LangChain for pipeline orchestration; LlamaIndex for industrial document chunking and graph integration.',2760)]),
      tr([bc('Knowledge Layer',1600),dc('Knowledge Graph DB',1900),dc('Neo4j Enterprise',2100),dc('5.x',1000),dc('Leading graph database; native Cypher queries; strong industrial ontology ecosystem; ACID compliance.',2760)]),
      tr([bc('Knowledge Layer',1600),dc('Vector Database',1900),dc('Pinecone (primary) / Weaviate (fallback)',2100),dc('Latest',1000),dc('Pinecone for managed high-performance vector search; Weaviate self-hosted if data sovereignty requires on-premise storage.',2760)]),
      tr([bc('Knowledge Layer',1600),dc('Full-Text Search',1900),dc('Elasticsearch',2100),dc('8.x',1000),dc('Hybrid search: keyword BM25 + dense vector. Document metadata index. Real-time search across corpus.',2760)]),
      tr([bc('Data Layer',1600),dc('Relational Database',1900),dc('PostgreSQL',2100),dc('16.x',1000),dc('ACID-compliant store for user data, RBAC, audit logs, document metadata, and workflow state.',2760)]),
      tr([bc('Data Layer',1600),dc('Document Store',1900),dc('MongoDB',2100),dc('7.x',1000),dc('Flexible schema store for raw extraction outputs, entity annotations, and semi-structured metadata.',2760)]),
      tr([bc('Data Layer',1600),dc('Object Storage',1900),dc('AWS S3 (ap-south-1) or Azure Blob',2100),dc('—',1000),dc('Original document storage, processed PDFs, OCR outputs, and audit artefacts. Versioned and encrypted.',2760)]),
      tr([bc('Doc Processing',1600),dc('OCR Engine (primary)',1900),dc('Azure Document Intelligence',2100),dc('2024-02',1000),dc('Best-in-class accuracy for structured forms, tables, and mixed-content industrial documents.',2760)]),
      tr([bc('Doc Processing',1600),dc('OCR Engine (fallback)',1900),dc('Tesseract + PaddleOCR',2100),dc('5.x / 2.7',1000),dc('Open-source fallback for simple text and offline processing. PaddleOCR for handwritten content.',2760)]),
      tr([bc('Doc Processing',1600),dc('P&ID Parser',1900),dc('LayoutParser + custom CV model',2100),dc('0.3+',1000),dc('Detectron2-based layout detection fine-tuned on P&ID symbol libraries (ISA-5.1).',2760)]),
      tr([bc('Infrastructure',1600),dc('Containerisation',1900),dc('Docker + Kubernetes (EKS/AKS)',2100),dc('Latest',1000),dc('All services containerised. Kubernetes for orchestration, auto-scaling, and self-healing. Helm charts for deployment.',2760)]),
      tr([bc('Infrastructure',1600),dc('CI/CD Pipeline',1900),dc('GitHub Actions + ArgoCD',2100),dc('Latest',1000),dc('GitHub Actions for build/test; ArgoCD for GitOps-based Kubernetes deployment with rollback capability.',2760)]),
      tr([bc('Observability',1600),dc('Monitoring & Alerting',1900),dc('Prometheus + Grafana',2100),dc('Latest',1000),dc('Infrastructure and application metrics. Custom dashboards for ingestion health and RAG query performance.',2760)]),
      tr([bc('Observability',1600),dc('Logging',1900),dc('ELK Stack',2100),dc('8.x',1000),dc('Centralised structured logging for all services. Retention: 12 months active, 7 years archive.',2760)]),
      tr([bc('Security',1600),dc('Identity & Access',1900),dc('Keycloak + Azure AD federation',2100),dc('24.x',1000),dc('OIDC/OAuth2 identity broker. Federates with existing Azure AD or LDAP. Issues AIKI JWT tokens.',2760)]),
    ]),
    div(),

    h1('3. Integration Architecture'),
    tbl([1800,1500,1600,1600,2860],[
      tr([hc('Target System',1800),hc('System Type',1500),hc('Protocol',1600),hc('Data Direction',1600),hc('Data Exchanged',2860)]),
      tr([dc('SAP Plant Maintenance',1800),dc('CMMS',1500),dc('OData V2 REST / RFC',1600),dc('Read from SAP',1600),dc('Equipment master data, functional locations, work order history, planned maintenance tasks, spare parts catalogue.',2860)]),
      tr([dc('IBM Maximo',1800),dc('CMMS',1500),dc('Maximo REST (OSLC)',1600),dc('Read from Maximo',1600),dc('Asset data, work orders, job plans, preventive maintenance schedules.',2860)]),
      tr([dc('SharePoint Online',1800),dc('DMS',1500),dc('Microsoft Graph API',1600),dc('Read from SharePoint',1600),dc('Engineering documents, SOPs, inspection reports, project files, email archives via Exchange.',2860)]),
      tr([dc('OpenText Documentum',1800),dc('DMS (on-prem)',1500),dc('Documentum REST API',1600),dc('Read from Documentum',1600),dc('Controlled engineering documents, drawings, regulatory submissions.',2860)]),
      tr([dc('Exchange / Outlook',1800),dc('Email',1500),dc('EWS / Microsoft Graph',1600),dc('Read from Exchange',1600),dc('Engineering and HSE email archives. Specific mailboxes only, scope-limited by legal review.',2860)]),
      tr([dc('Azure Active Directory',1800),dc('Identity Provider',1500),dc('OIDC / SAML 2.0',1600),dc('Auth from Azure AD',1600),dc('User identity, group membership, role assignments for AIKI RBAC.',2860)]),
      tr([dc('Anthropic Claude API',1800),dc('LLM Provider',1500),dc('HTTPS REST API',1600),dc('Queries to Anthropic',1600),dc('RAG query prompts (document-content-masked) and response generation. Data masking applied before transmission.',2860)]),
      tr([dc('Azure Document Intelligence',1800),dc('OCR Service',1500),dc('Azure Cognitive API',1600),dc('Document to Azure',1600),dc('Scanned document pages for OCR. Processed within Azure India region.',2860)]),
      tr([dc('Pinecone Vector DB',1800),dc('Vector Database',1500),dc('HTTPS REST / gRPC',1600),dc('Read/Write',1600),dc('Document chunk embeddings (vectors only — no raw text). Hosted in AWS ap-south-1 region.',2860)]),
    ]),
    div(),

    h1('4. Third-Party APIs & Services'),
    tbl([2000,1800,1960,3600],[
      tr([hc('Service',2000),hc('Provider',1800),hc('Primary Use Case',1960),hc('Data Privacy Requirement',3600)]),
      tr([dc('Claude 3.5 Sonnet API',2000),dc('Anthropic',1800),dc('Primary LLM for RAG response generation, entity extraction, compliance gap analysis.',1960),dc('No raw document content transmitted. Prompts contain only de-identified extracted text snippets (max 2,000 tokens per chunk). Data Processing Addendum required.',3600)]),
      tr([dc('GPT-4o API',2000),dc('OpenAI',1800),dc('Fallback LLM if Claude API unavailable. P&ID description generation.',1960),dc('Same masking protocol as Claude. Azure OpenAI instance in East India region preferred.',3600)]),
      tr([dc('Azure Document Intelligence',2000),dc('Microsoft',1800),dc('OCR and layout extraction for scanned PDFs and forms.',1960),dc('Documents processed in Azure Central India region. No content retained post-processing. DPA required.',3600)]),
      tr([dc('text-embedding-3-small',2000),dc('OpenAI',1800),dc('Document chunk embedding generation for vector search.',1960),dc('Text chunks (not full documents) transmitted. No PII in chunks per chunking strategy.',3600)]),
      tr([dc('Pinecone Vector Service',2000),dc('Pinecone.io',1800),dc('Vector storage and ANN similarity search for RAG retrieval.',1960),dc('Embedding vectors only (no text). Hosted in AWS ap-south-1. DPA required.',3600)]),
      tr([dc('Microsoft Graph API',2000),dc('Microsoft',1800),dc('SharePoint document discovery, retrieval, and Exchange email access.',1960),dc('No document content stored by Microsoft beyond SharePoint/Exchange origins. Scoped app permissions only.',3600)]),
    ]),
    div(),

    h1('5. Security Architecture'),
    tbl([1900,2300,5160],[
      tr([hc('Domain',1900),hc('Control',2300),hc('Implementation',5160)]),
      tr([bc('Authentication',1900),dc('Single Sign-On (SSO)',2300),dc('Keycloak federating Azure AD or LDAP. All AIKI sessions via OIDC. Session tokens: JWT, 8-hour expiry, RS256 signed.',5160)]),
      tr([bc('Authentication',1900),dc('Multi-Factor Authentication',2300),dc('MFA mandatory for all roles. TOTP (Google Authenticator) or FIDO2/WebAuthn hardware key. Admin roles require hardware key.',5160)]),
      tr([bc('Authorisation',1900),dc('Role-Based Access Control',2300),dc('Roles: VIEWER | CONTRIBUTOR | ENGINEER | COMPLIANCE_OFFICER | ADMIN | SYSTEM_ADMIN. Permissions scoped to plant, department, and document classification. All access decisions logged.',5160)]),
      tr([bc('Data Encryption',1900),dc('Encryption at Rest',2300),dc('AES-256 for all data at rest: S3/Blob, PostgreSQL, MongoDB, Elasticsearch. KMS-managed keys. Annual key rotation.',5160)]),
      tr([bc('Data Encryption',1900),dc('Encryption in Transit',2300),dc('TLS 1.3 for all external and internal communication. mTLS for microservice mesh (Istio). No plaintext HTTP connections permitted.',5160)]),
      tr([bc('Data Masking',1900),dc('LLM Data Masking',2300),dc('Proprietary entity masking layer applied before any text is sent to external LLM APIs. Equipment tags, plant names, personnel names, and commercial parameters replaced with synthetic tokens. Reversed in post-processing.',5160)]),
      tr([bc('Network Security',1900),dc('Network Isolation',2300),dc('AIKI deployed in a dedicated VPC with no public internet access except approved API endpoints. All external API calls via NAT Gateway with static IP whitelisting. Internal services on private subnets.',5160)]),
      tr([bc('Audit & Compliance',1900),dc('Comprehensive Audit Logging',2300),dc('All user queries, document accesses, admin actions, role changes, and API calls logged with: user ID, timestamp, action type, resource, IP address. Logs are write-once (S3 Object Lock). Retention: 7 years.',5160)]),
      tr([bc('Vulnerability Mgmt',1900),dc('Security Testing',2300),dc('SAST: Semgrep on every commit. DAST: OWASP ZAP weekly on staging. Dependency scanning: Snyk. Container scanning: Trivy. Annual pen test by CERT-In empanelled firm. Critical CVEs patched within 48 hours.',5160)]),
    ]),
    div(),

    h1('6. Deployment Architecture'),
    tbl([1700,2100,1700,3860],[
      tr([hc('Environment',1700),hc('Host',2100),hc('Scaling',1700),hc('Notes',3860)]),
      tr([dc('Production',1700),dc('AWS EKS (ap-south-1) or Azure AKS (Central India)',2100),dc('Auto-scaling (HPA)',1700),dc('Multi-AZ deployment. Min 3 nodes. Auto-scaling based on CPU and queue depth. Blue-green for zero-downtime releases.',3860)]),
      tr([dc('Staging',1700),dc('Separate EKS cluster (ap-south-1)',2100),dc('Fixed — 50% capacity',1700),dc('Full production replica at half capacity. Used for integration testing, UAT, and penetration testing. Refreshed weekly with anonymised production data.',3860)]),
      tr([dc('Development',1700),dc('Local Docker Compose + dev namespace',2100),dc('Single node',1700),dc('Developers run local Docker Compose. Shared dev Kubernetes namespace for integration tests. Mocked LLM responses for cost efficiency.',3860)]),
      tr([dc('Disaster Recovery',1700),dc('Secondary AWS region (warm standby)',2100),dc('Promoted on failover',1700),dc('Neo4j, PostgreSQL, and Elasticsearch replicated cross-region. RTO: 4 hours. RPO: 1 hour. Failover via Route 53 health checks.',3860)]),
    ]),
    sp(800),
    p('— END OF DOCUMENT —', { center:true, italic:true, color:C.dGray }),
  ];
  return saveDoc(buildDoc(children), 'AIKI_TRD_v1.0.docx');
}

// ╔══════════════════════════════════════════════════════════╗
// ║  DOCUMENT 5: NFR                                        ║
// ╚══════════════════════════════════════════════════════════╝
async function createNFR() {
  const children = [
    ...cover(
      'NFR — Non-Functional Requirements Document',
      'AI Industrial Knowledge Intelligence',
      'Performance, Availability, Security & Quality Attributes'
    ),

    h1('1. Overview'),
    p('This document defines the non-functional requirements (NFRs) for the AIKI platform — the quality attributes that determine how the system performs its functions, not what functions it performs. NFRs are organised across eight quality domains: Performance, Availability & Reliability, Scalability, Security & Data Privacy, Usability & Accessibility, Maintainability & Operability, Data Retention & Compliance, and Monitoring & Observability.'),
    p('Notation: P50 = 50th percentile (median), P95 = 95th percentile, P99 = 99th percentile. All targets assume nominal load unless stated otherwise.'),
    div(),

    h1('2. Performance Requirements'),
    tbl([2100,1800,1800,1600,2060],[
      tr([hc('Requirement',2100),hc('Metric',1800),hc('Target (P95)',1800),hc('Measurement',1600),hc('Notes',2060)]),
      tr([bc('Conversational Query Response',2100),dc('End-to-end query latency',1800),dc('< 10 seconds',1800),dc('Synthetic monitoring (k6)',1600),dc('Includes RAG retrieval + LLM generation. P99 < 20s. Streaming response begins < 3s for progressive display.',2060)]),
      tr([bc('Semantic Search Response',2100),dc('Vector search + metadata filter',1800),dc('< 2 seconds',1800),dc('APM agent',1600),dc('Across up to 10M document chunks at Phase 1.',2060)]),
      tr([bc('Full-Text Search',2100),dc('Elasticsearch keyword search',1800),dc('< 1 second',1800),dc('APM agent',1600),dc('Against document metadata index. Complex filter queries < 2s.',2060)]),
      tr([bc('Knowledge Graph Query',2100),dc('Neo4j Cypher latency',1800),dc('< 500 ms',1800),dc('APM agent',1600),dc('2-hop graph traversals. Complex 4-hop queries < 3s.',2060)]),
      tr([bc('Document Ingestion Throughput',2100),dc('Documents processed per hour per worker',1800),dc('> 100 docs/hr/worker',1800),dc('Kafka consumer lag',1600),dc('PDF text: 200/hr. Scanned OCR: 60/hr. P&ID CV parsing: 20/hr. Workers scale horizontally.',2060)]),
      tr([bc('Entity Extraction Accuracy',2100),dc('F1 score — equipment tag NER',1800),dc('> 95% F1',1800),dc('Benchmark eval (quarterly)',1600),dc('> 85% F1 for handwritten/degraded scans. Benchmarked on 500-document labelled eval set.',2060)]),
      tr([bc('Page Load Time',2100),dc('Largest Contentful Paint (LCP)',1800),dc('< 2.5 seconds (P75)',1800),dc('Lighthouse CI / Web Vitals',1600),dc('On 4G connection. Offline cached pages: < 0.5s from local cache.',2060)]),
      tr([bc('Concurrent User Capacity',2100),dc('Active simultaneous sessions',1800),dc('500 concurrent users',1800),dc('Load test (k6 / Locust)',1600),dc('No degradation under 500 users. Graceful degradation to 1,000 users (latency < 30s).',2060)]),
    ]),
    div(),

    h1('3. Availability & Reliability'),
    tbl([2400,1700,1600,3660],[
      tr([hc('Service Tier',2400),hc('SLA Target',1700),hc('Max Monthly Downtime',1600),hc('Scope & Notes',3660)]),
      tr([bc('Tier 1 — Read Query (RAG Copilot)',2400),dc('99.5% availability',1700),dc('3.6 hours/month',1600),dc('Conversational AI query interface and semantic search. Highest user-facing impact.',3660)]),
      tr([bc('Tier 2 — Document Ingestion Pipeline',2400),dc('99.0% availability',1700),dc('7.3 hours/month',1600),dc('Brief outages acceptable; missed events replayed from Kafka topic retention (7 days).',3660)]),
      tr([bc('Tier 3 — Knowledge Graph Updates',2400),dc('99.0% availability',1700),dc('7.3 hours/month',1600),dc('Write path to Neo4j. Read path remains available during scheduled maintenance.',3660)]),
      tr([bc('Tier 4 — Admin & Configuration',2400),dc('99.0% availability',1700),dc('7.3 hours/month',1600),dc('Admin portal, user management, compliance report generation.',3660)]),
      tr([bc('Planned Maintenance Windows',2400),dc('Excluded from SLA',1700),dc('Max 4 hours/month',1600),dc('Sundays 02:00-06:00 IST. Minimum 72 hours advance notice. Critical security patches exempt.',3660)]),
    ]),
    sp(100),
    p('Recovery Objectives:', { bold:true, after:80 }),
    tbl([2400,3480,3480],[
      tr([hc('Category',2400),hc('Recovery Time Objective (RTO)',3480),hc('Recovery Point Objective (RPO)',3480)]),
      tr([dc('Infrastructure Failure (single AZ)',2400),dc('< 5 minutes (automated failover)',3480),dc('0 minutes (synchronous replication within region)',3480)]),
      tr([dc('Application Software Failure',2400),dc('< 15 minutes (Kubernetes self-healing + rollback)',3480),dc('0 minutes (stateless application layer)',3480)]),
      tr([dc('Database Corruption / Failure',2400),dc('< 4 hours (restore from replica or backup)',3480),dc('< 1 hour (continuous backup + 15-min checkpoint)',3480)]),
      tr([dc('Full Region Outage (DR activation)',2400),dc('< 4 hours (warm standby promotion)',3480),dc('< 1 hour (cross-region async replication)',3480)]),
    ]),
    div(),

    h1('4. Scalability Requirements'),
    tbl([2200,1900,1900,3360],[
      tr([hc('Dimension',2200),hc('Phase 1 Target',1900),hc('Phase 2 Target',1900),hc('Scaling Mechanism',3360)]),
      tr([dc('Concurrent Users',2200),dc('500 users',1900),dc('2,000 users',1900),dc('Kubernetes HPA based on CPU and active session count. Read replicas for database query scaling.',3360)]),
      tr([dc('Document Corpus Size',2200),dc('1M documents / 10M chunks',1900),dc('10M documents / 100M chunks',1900),dc('Pinecone / Weaviate scales to 1B+ vectors. Elasticsearch sharding. Neo4j cluster scaling.',3360)]),
      tr([dc('Ingestion Throughput',2200),dc('400 docs/hr (4 workers)',1900),dc('2,000 docs/hr (20 workers)',1900),dc('Celery worker autoscaling based on Kafka consumer lag. Independent scaling of OCR, NER, and graph workers.',3360)]),
      tr([dc('Plants Supported',2200),dc('Up to 10 plants',1900),dc('50+ plants',1900),dc('Logical data segregation per plant in all stores. Shared compute with tenant isolation via RBAC.',3360)]),
      tr([dc('Knowledge Graph Size',2200),dc('10M nodes / 50M edges',1900),dc('100M nodes / 500M edges',1900),dc('Neo4j Enterprise cluster (3-node minimum). Read replicas for query workload.',3360)]),
    ]),
    div(),

    h1('5. Security & Data Privacy Requirements'),
    tbl([1800,2200,5360],[
      tr([hc('Category',1800),hc('Requirement',2200),hc('Standard / Implementation',5360)]),
      tr([bc('Encryption at Rest',1800),dc('All persistent storage encrypted',2200),dc('AES-256-GCM. KMS-managed keys (AWS KMS or Azure Key Vault). Annual key rotation. Encryption verified quarterly.',5360)]),
      tr([bc('Encryption in Transit',1800),dc('All network traffic encrypted',2200),dc('TLS 1.3 minimum for all external connections. mTLS for internal microservice mesh (Istio). No plaintext HTTP connections permitted.',5360)]),
      tr([bc('Authentication',1800),dc('SSO with MFA',2200),dc('OIDC SSO via Keycloak + Azure AD federation. MFA: TOTP (minimum) or FIDO2 hardware key (admin roles). Session timeout: 8 hours idle.',5360)]),
      tr([bc('Authorisation',1800),dc('Least-privilege RBAC',2200),dc('6 predefined roles. Permissions: resource type, plant, department, document classification. All access decisions logged. Quarterly access review mandatory.',5360)]),
      tr([bc('Data Sovereignty',1800),dc('India-only data residency',2200),dc('All document content and extracted data stored exclusively in AWS ap-south-1 or Azure Central India. No cross-border transfer except anonymised embedding vectors to Pinecone (ap-south-1 only).',5360)]),
      tr([bc('LLM Data Masking',1800),dc('PII and sensitive data masked before LLM transmission',2200),dc('Named entity masking (NER-based) applied before prompt construction. Equipment-specific details tokenised. Masking coverage: > 99% of identifiable sensitive entities.',5360)]),
      tr([bc('Vulnerability Mgmt',1800),dc('Regular security testing',2200),dc('SAST on every commit (Semgrep). DAST weekly on staging (OWASP ZAP). Annual pen test by CERT-In empanelled firm. Critical CVEs: patch within 48 hours. High CVEs: within 7 days.',5360)]),
      tr([bc('Data Privacy',1800),dc('DPDPA 2023 compliance',2200),dc('No personal data processed beyond minimum necessary. Data Principal access request resolved within 30 days. Privacy Impact Assessment completed before go-live.',5360)]),
      tr([bc('Audit Logging',1800),dc('Immutable comprehensive audit trail',2200),dc('All queries, document accesses, admin actions, and role changes logged. Log fields: user_id (pseudonymised), timestamp, action, resource, IP. Write-once (S3 Object Lock). 7-year retention.',5360)]),
    ]),
    div(),

    h1('6. Usability & Accessibility Requirements'),
    bl('Query Response Clarity: AI copilot responses must include source document citations for every factual claim. Responses that cannot be grounded in retrieved documents must explicitly state "No relevant documents found" rather than generating an unsupported answer.'),
    bl('Mobile Performance: The PWA must achieve a Google Lighthouse Performance score of > 80 on a representative low-end Android device on a simulated 4G connection.'),
    bl('First-Query Onboarding: A new user must be able to submit their first successful query within 5 minutes of first login, without training, following an in-app guided query prompt.'),
    bl('Error Messaging: All error states (ingestion failure, query timeout, low-confidence response) must display a human-readable explanation and a recommended action. No raw error codes exposed to end users.'),
    bl('Offline Mode: The top 50 most recently accessed procedures per user are cached in the PWA service worker and accessible without network connectivity.'),
    bl('Accessibility: WCAG 2.1 Level AA compliance for all web interface components. Minimum contrast ratio 4.5:1 for body text. Keyboard-navigable interface. Screen reader compatible (ARIA labels on all interactive elements).'),
    div(),

    h1('7. Maintainability & Operability Requirements'),
    bl('Service Health: All microservices expose /health and /ready endpoints. Kubernetes liveness and readiness probes configured for all services. Unhealthy pods replaced within 60 seconds automatically.'),
    bl('Observability: End-to-end distributed tracing for all query requests (OpenTelemetry + Jaeger). Trace ID propagated through all service calls. Latency breakdown visible per service hop.'),
    bl('Deployment: Zero-downtime blue-green deployments for all production releases. Rollback completes in < 5 minutes using ArgoCD.'),
    bl('Configuration Management: All environment configuration managed via Kubernetes ConfigMaps and Secrets (sealed secrets for sensitive values). No configuration hardcoded in application code.'),
    bl('On-Call Alerting: PagerDuty integration. SLO breach alerts (error rate > 1%, P95 latency > 15 seconds) trigger immediate on-call page with auto-generated runbook link.'),
    bl('Model Retraining: Entity extraction NER model retrained quarterly using correction feedback from the human review queue. Minimum 500 corrected samples required. A/B evaluation before production deployment.'),
    bl('Code Quality: Unit test coverage > 80% for all backend services. Integration test suite on every pull request. Code review: minimum 2 approvers for production-affecting changes.'),
    div(),

    h1('8. Data Retention & Compliance'),
    tbl([2200,1800,1800,3560],[
      tr([hc('Data Category',2200),hc('Active Retention',1800),hc('Archive Retention',1800),hc('Regulatory Basis',3560)]),
      tr([dc('Ingested Document Content',2200),dc('Unlimited (active)',1800),dc('7 years post-supersession',1800),dc('Company policy. Superseded versions remain searchable with version label.',3560)]),
      tr([dc('Equipment Maintenance Records',2200),dc('Full history (active)',1800),dc('Minimum 10 years',1800),dc('Factory Act 1948, OISD requirements for statutory equipment records.',3560)]),
      tr([dc('Incident & Near-Miss Records',2200),dc('Full history (active)',1800),dc('10 years; LTI: permanent',1800),dc('OISD-STD-154, Factory Act, CPCB requirements for accident records.',3560)]),
      tr([dc('Compliance Evidence',2200),dc('Current standard period',1800),dc('10 years post-regulation revision',1800),dc('Required for statutory audit response. Includes auto-generated audit evidence packages.',3560)]),
      tr([dc('User Query & Audit Logs',2200),dc('12 months (active)',1800),dc('7 years (archive)',1800),dc('IT security policy. DPDPA 2023 data minimisation applied.',3560)]),
      tr([dc('Personal Data (user profiles)',2200),dc('Employment + 90 days',1800),dc('Deleted on request (DPDPA)',1800),dc('DPDPA 2023 right to erasure. Query logs pseudonymised on account deletion.',3560)]),
    ]),
    div(),

    h1('9. Monitoring & Observability Requirements'),
    tbl([2200,7160],[
      tr([hc('Observability Domain',2200),hc('Requirements',7160)]),
      tr([bc('Service Metrics',2200),dc('All services expose Prometheus metrics: request rate, error rate, latency (P50/P95/P99), CPU, memory, disk. Custom metrics: RAG retrieval score distribution, entity extraction confidence, ingestion queue depth, LLM cost per query.',7160)]),
      tr([bc('Alerting Thresholds',2200),dc('CRITICAL: Error rate > 5% for 2 minutes | P95 latency > 30 seconds | Queue depth > 10,000 documents | Disk > 85%. WARNING: Error rate > 1% | P95 latency > 15 seconds | Queue depth > 5,000.',7160)]),
      tr([bc('AI/ML Quality Monitoring',2200),dc('Weekly automated evaluation of RAG response quality using a benchmark query set (200 queries with expert-labelled answers). Alert if answer quality score drops below 80% of baseline. LLM cost per query tracked and budget-alerted.',7160)]),
      tr([bc('Business KPI Dashboard',2200),dc('Grafana dashboard for Plant Manager tier: daily active users, queries per department, knowledge coverage score by equipment class, ingestion pipeline health, compliance gap count trend. Refreshed daily.',7160)]),
      tr([bc('Incident Response',2200),dc('All CRITICAL alerts trigger automated runbook execution (restart unhealthy pod, scale ingestion workers, flush cache). Runbook outcome logged. Escalation to on-call engineer if not self-healed within 10 minutes.',7160)]),
    ]),
    sp(800),
    p('— END OF DOCUMENT —', { center:true, italic:true, color:C.dGray }),
  ];
  return saveDoc(buildDoc(children), 'AIKI_NFR_v1.0.docx');
}

// ╔══════════════════════════════════════════════════════════╗
// ║  MAIN                                                   ║
// ╚══════════════════════════════════════════════════════════╝
(async () => {
  console.log('\nAIKI Platform — Generating Requirement Documents...\n');
  try {
    await createPRD();
    await createFRD();
    await createDRD();
    await createTRD();
    await createNFR();
    console.log('\n  All 5 documents generated successfully.\n');
  } catch (err) {
    console.error('Generation error:', err.message);
    process.exit(1);
  }
})();
