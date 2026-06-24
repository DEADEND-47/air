const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
  WidthType, ShadingType, VerticalAlign, PageNumber, PageBreak, TableOfContents
} = require('docx');
const fs = require('fs');

const BRAND = "1A56A0"; // dark blue
const ACCENT = "2E86AB"; // medium blue
const LIGHT_BG = "EBF4FA";
const TABLE_HEADER = "1A56A0";
const TABLE_ROW_ALT = "F2F8FC";
const GRAY = "6B7280";

const border = { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 120 },
    children: [new TextRun({ text, bold: true, size: 36, color: BRAND, font: "Arial" })]
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 100 },
    children: [new TextRun({ text, bold: true, size: 28, color: ACCENT, font: "Arial" })]
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, size: 24, color: "374151", font: "Arial" })]
  });
}
function para(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text, size: 22, font: "Arial", color: "1F2937", ...opts })]
  });
}
function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: 22, font: "Arial", color: "1F2937" })]
  });
}
function labeledPara(label, text) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [
      new TextRun({ text: label + ": ", bold: true, size: 22, font: "Arial", color: BRAND }),
      new TextRun({ text, size: 22, font: "Arial", color: "1F2937" })
    ]
  });
}
function divider() {
  return new Paragraph({
    spacing: { before: 160, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB", space: 1 } },
    children: [new TextRun("")]
  });
}
function pageBreak() { return new Paragraph({ children: [new PageBreak()] }); }

function infoBox(lines) {
  const cells = [new TableCell({
    borders,
    width: { size: 9360, type: WidthType.DXA },
    shading: { fill: LIGHT_BG, type: ShadingType.CLEAR },
    margins: { top: 160, bottom: 160, left: 220, right: 220 },
    children: lines.map(l => new Paragraph({
      spacing: { before: 40, after: 40 },
      children: [new TextRun({ text: l, size: 22, font: "Arial", color: "1F2937" })]
    }))
  })];
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({ children: cells })]
  });
}

function twoColTable(headers, rows, widths = [4680, 4680]) {
  const hRow = new TableRow({
    children: headers.map((h, i) => new TableCell({
      borders,
      width: { size: widths[i], type: WidthType.DXA },
      shading: { fill: TABLE_HEADER, type: ShadingType.CLEAR },
      margins: { top: 100, bottom: 100, left: 150, right: 150 },
      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 22, font: "Arial" })] })]
    }))
  });
  const dataRows = rows.map((row, ri) => new TableRow({
    children: row.map((cell, ci) => new TableCell({
      borders,
      width: { size: widths[ci], type: WidthType.DXA },
      shading: { fill: ri % 2 === 0 ? "FFFFFF" : TABLE_ROW_ALT, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 150, right: 150 },
      children: [new Paragraph({ children: [new TextRun({ text: cell, size: 21, font: "Arial", color: "1F2937" })] })]
    }))
  }));
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: widths,
    rows: [hRow, ...dataRows]
  });
}

function threeColTable(headers, rows, widths) {
  const hRow = new TableRow({
    children: headers.map((h, i) => new TableCell({
      borders,
      width: { size: widths[i], type: WidthType.DXA },
      shading: { fill: TABLE_HEADER, type: ShadingType.CLEAR },
      margins: { top: 100, bottom: 100, left: 150, right: 150 },
      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 22, font: "Arial" })] })]
    }))
  });
  const dataRows = rows.map((row, ri) => new TableRow({
    children: row.map((cell, ci) => new TableCell({
      borders,
      width: { size: widths[ci], type: WidthType.DXA },
      shading: { fill: ri % 2 === 0 ? "FFFFFF" : TABLE_ROW_ALT, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 150, right: 150 },
      children: [new Paragraph({ children: [new TextRun({ text: cell, size: 21, font: "Arial", color: "1F2937" })] })]
    }))
  }));
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: widths,
    rows: [hRow, ...dataRows]
  });
}

const doc = new Document({
  numbering: {
    config: [
      { reference: "bullets", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 360 } } } }
      ]},
      { reference: "numbers", levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }
      ]}
    ]
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: BRAND },
        paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: ACCENT },
        paragraph: { spacing: { before: 280, after: 100 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: "374151" },
        paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 } }
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BRAND, space: 1 } },
          spacing: { after: 120 },
          children: [
            new TextRun({ text: "AirIQ Platform", bold: true, color: BRAND, size: 20, font: "Arial" }),
            new TextRun({ text: "   |   Product Requirements Document", color: GRAY, size: 20, font: "Arial" })
          ]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB", space: 1 } },
          spacing: { before: 120 },
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "CONFIDENTIAL   |   Page ", color: GRAY, size: 18, font: "Arial" }),
            new TextRun({ children: [PageNumber.CURRENT], color: GRAY, size: 18, font: "Arial" }),
            new TextRun({ text: " of ", color: GRAY, size: 18, font: "Arial" }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], color: GRAY, size: 18, font: "Arial" })
          ]
        })]
      })
    },
    children: [
      // Cover
      new Paragraph({ spacing: { before: 1440, after: 200 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "AirIQ", bold: true, size: 80, color: BRAND, font: "Arial" })] }),
      new Paragraph({ spacing: { before: 0, after: 120 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "AI-Powered Urban Air Quality Intelligence Platform", size: 36, color: ACCENT, font: "Arial" })] }),
      new Paragraph({ spacing: { before: 120, after: 480 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Product Requirements Document (PRD)", bold: true, size: 28, color: "374151", font: "Arial" })] }),
      infoBox([
        "Version: 1.0     |     Status: Approved for Development",
        "Date: June 2025     |     Classification: Confidential",
        "Owner: Product Management     |     Hackathon: Smart Cities AI Challenge"
      ]),
      pageBreak(),

      // TOC
      new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" }),
      pageBreak(),

      // Section 1
      h1("1. Executive Summary"),
      para("AirIQ is an AI-powered Urban Air Quality Intelligence platform designed to transform how Indian city administrations understand, predict, and act on air pollution data. The platform fuses data from CAAQMS monitoring stations, satellite imagery (Sentinel-2, MODIS), meteorological feeds, traffic mobility layers, and geospatial land-use maps to deliver real-time source attribution, 24–72 hour hyperlocal AQI forecasts, and prioritised enforcement intelligence."),
      para("India's air quality crisis costs an estimated 1.67 million premature deaths annually (Lancet Planetary Health, 2024). Despite over 900 monitoring stations deployed under the National Clean Air Programme, a 2024 CAG audit found that only 31% of cities with monitoring data had any actionable multi-agency response protocols. AirIQ closes this intelligence gap — converting raw sensor readings into evidence-backed intervention decisions."),
      divider(),

      // Section 2
      h1("2. Problem Statement"),
      h2("2.1 Current State"),
      para("City administrations across India have access to ambient air quality data from the CPCB's CAAQMS network but lack the analytical infrastructure to derive timely, actionable intelligence from it. Existing dashboards display AQI readings without attribution, forecasting, or enforcement guidance."),
      twoColTable(
        ["Metric", "Value"],
        [
          ["Delhi avg. AQI 2024–25", "218 (Poor or worse >200 days)"],
          ["Mumbai dangerous AQI days (2024)", ">60 days"],
          ["Kolkata avg. AQI (winter season)", ">150"],
          ["India's 50 most polluted cities that are Tier 1/2 urban centres", "24 of 50"],
          ["Annual premature deaths from air pollution (India)", "1.67 million (Lancet, 2024)"],
          ["CAAQMS stations deployed under NCAP", "900+"],
          ["Cities with actionable multi-agency response protocols", "31% (CAG audit, 2024)"]
        ],
        [5400, 3960]
      ),
      new Paragraph({ spacing: { before: 120 } }),
      h2("2.2 The Intelligence Gap"),
      para("The challenge is not data availability — it is intelligence. Three specific gaps exist:"),
      bullet("Source Attribution Gap: AQI readings are available but not attributed to specific sources (industry, traffic, construction, waste burning). Without attribution, enforcement is reactive and misdirected."),
      bullet("Forecasting Gap: No hyperlocal (ward-level, 1km grid) AQI forecasting exists, making proactive scheduling of interventions impossible."),
      bullet("Enforcement Gap: No system correlates hotspot data with registered emission sources to prioritise inspector deployment for maximum pollution reduction impact."),
      divider(),

      // Section 3
      h1("3. Goals and Objectives"),
      h2("3.1 Primary Goals"),
      bullet("Enable geospatial attribution of pollution sources at ward/zone level with statistical confidence scores within 30 minutes of data ingestion."),
      bullet("Deliver 24–72 hour AQI forecasts at 1km grid resolution for all participating cities with RMSE better than a persistence baseline."),
      bullet("Generate prioritised, evidence-backed enforcement action recommendations with supporting geospatial documentation."),
      bullet("Provide ward-level health risk advisories in regional languages (Hindi, Kannada, Tamil, Bengali, Marathi, Telugu) to citizens."),
      bullet("Reduce average time from pollution signal detection to intervention dispatch by 60% vs. current baseline."),
      h2("3.2 Secondary Goals"),
      bullet("Enable cross-city benchmarking and learning from successful intervention patterns."),
      bullet("Build a compliance tracking layer for industrial and construction emission sources."),
      bullet("Establish an open data API for third-party health apps and civic tech integrations."),
      divider(),

      // Section 4
      h1("4. User Personas"),
      h2("4.1 Persona 1 — City Environment Officer (Primary)"),
      infoBox([
        "Name: Priya Rajan, Joint Commissioner of Environment, BBMP Bengaluru",
        "Goal: Reduce actionable pollution events in her jurisdiction and demonstrate measurable progress to state government.",
        "Pain Points: Dashboard overload with no attribution; no ability to justify enforcement actions to legal teams; no forecast capability to pre-position resources.",
        "Tech Comfort: Moderate — uses desktop dashboards, familiar with GIS tools but not ML workflows.",
        "Key Jobs-to-be-Done: Know which sources are responsible for today's pollution. Schedule inspections proactively. Report outcomes to elected officials."
      ]),
      new Paragraph({ spacing: { before: 120 } }),
      h2("4.2 Persona 2 — CPCB / SPCB Analyst (Primary)"),
      infoBox([
        "Name: Ravi Shankar, Air Quality Analyst, Tamil Nadu SPCB",
        "Goal: Identify systematic non-compliant industrial emitters and build evidence dossiers for enforcement proceedings.",
        "Pain Points: Manual correlation between monitoring data and industrial permits; lack of geospatial visualisation; no trend analysis across multiple monitoring cycles.",
        "Tech Comfort: High — comfortable with data tools, GIS, and spreadsheet-based analysis.",
        "Key Jobs-to-be-Done: Correlate emission events with registered industries. Export evidence-grade geospatial reports."
      ]),
      new Paragraph({ spacing: { before: 120 } }),
      h2("4.3 Persona 3 — Municipal Enforcement Inspector (Secondary)"),
      infoBox([
        "Name: Mohammed Arif, Field Inspector, MCGM Mumbai",
        "Goal: Conduct efficient field inspections with highest pollution-reduction impact per day.",
        "Pain Points: No prioritised task list; receives generic area assignments without pollution attribution context; paper-based inspection records.",
        "Tech Comfort: Low-to-moderate — primary device is a smartphone.",
        "Key Jobs-to-be-Done: Know exactly which site to inspect and why. Access supporting evidence on mobile. Submit inspection report digitally."
      ]),
      new Paragraph({ spacing: { before: 120 } }),
      h2("4.4 Persona 4 — Citizen / Patient-Advocacy Group"),
      infoBox([
        "Name: Ananya Mehta, Asthma patient and parent in Delhi NCR",
        "Goal: Understand daily and next-day air quality risk for herself, her child, and her elderly father.",
        "Pain Points: Generic AQI numbers without health context; no ward-level specificity; English-only advisories.",
        "Tech Comfort: High for consumer apps; uses WhatsApp, Google Maps daily.",
        "Key Jobs-to-be-Done: Get a simple, personalised, language-appropriate daily health advisory. Know when outdoor activity is safe."
      ]),
      new Paragraph({ spacing: { before: 120 } }),
      h2("4.5 Persona 5 — State-Level Policy Maker (Tertiary)"),
      infoBox([
        "Name: Secretary, Department of Environment, Government of Maharashtra",
        "Goal: Allocate NCAP budget to interventions with proven impact; demonstrate progress to Ministry of Environment.",
        "Pain Points: No cross-city comparative data; inability to measure intervention effectiveness; data locked in city-level silos.",
        "Tech Comfort: Low — consumes summary reports and briefing decks.",
        "Key Jobs-to-be-Done: Compare city performance on AQI reduction. Identify which city interventions produced measurable outcomes."
      ]),
      divider(),

      // Section 5
      h1("5. Scope"),
      h2("5.1 In Scope — Phase 1 (MVP)"),
      bullet("Geospatial Pollution Source Attribution Engine for 3 pilot cities (Delhi, Mumbai, Bengaluru)"),
      bullet("Hyperlocal AQI Forecasting (24h) at ward level for pilot cities"),
      bullet("Enforcement Intelligence Dashboard with top-10 daily priority enforcement targets"),
      bullet("Citizen health advisory via web and mobile push (English + 2 regional languages)"),
      bullet("Data ingestion pipeline for CAAQMS, MODIS satellite, and IMD meteorological feeds"),
      bullet("Architecture Diagram, Demo Video, and Presentation Deck for hackathon deliverables"),
      h2("5.2 In Scope — Phase 2"),
      bullet("72h forecasting extension"),
      bullet("Multi-city comparative dashboard (up to 10 cities)"),
      bullet("IVR advisory system integration"),
      bullet("Construction permit and industrial compliance tracking"),
      bullet("Open data API for third-party integrations"),
      h2("5.3 Non-Goals (Explicitly Out of Scope)"),
      bullet("Direct command-and-control of traffic signals or industrial shutdowns"),
      bullet("Indoor air quality monitoring"),
      bullet("Real-time video surveillance of emission sources"),
      bullet("Medical diagnosis or treatment recommendations"),
      bullet("Replacement of statutory CPCB reporting systems"),
      bullet("Support for cities outside India in Phase 1 or Phase 2"),
      divider(),

      // Section 6
      h1("6. Success Metrics"),
      threeColTable(
        ["Metric", "Target", "Measurement Method"],
        [
          ["Source attribution accuracy", "≥ 75% vs. emission inventory ground truth", "Expert validation dataset"],
          ["AQI forecast RMSE (24h)", "< 20% improvement over persistence baseline", "CPCB validation data"],
          ["Enforcement recommendation quality", "≥ 4.0 / 5.0 domain expert rating", "Structured expert review"],
          ["Time to intervention from signal", "≥ 60% reduction vs. baseline", "Process audit"],
          ["Citizen advisory regional language coverage", "6 languages at launch", "Language audit"],
          ["System uptime", "99.5% monthly", "Monitoring dashboard"],
          ["Data ingestion latency (CAAQMS)", "< 15 minutes", "Pipeline metrics"]
        ],
        [4000, 2800, 2560]
      ),
      new Paragraph({ spacing: { before: 120 } }),
      divider(),

      // Section 7
      h1("7. Constraints and Assumptions"),
      h2("7.1 Constraints"),
      bullet("CAAQMS API access is subject to CPCB data sharing agreements; public feeds may have 15–30 min latency."),
      bullet("Sentinel-2 satellite revisit time is 5 days at the equator; MODIS provides daily but lower-resolution coverage."),
      bullet("Regional language NLP accuracy for air quality advisory generation depends on available fine-tuned model availability."),
      bullet("Budget and compute constraints limit inference latency targets for real-time geospatial AI during Phase 1."),
      h2("7.2 Assumptions"),
      bullet("Participating cities will provide access to construction permit databases and industrial registry data under MoU."),
      bullet("CPCB provides access to CAAQMS historical data (at minimum 2 years) for model training."),
      bullet("Anthropic or equivalent LLM API access is available for multilingual advisory generation."),
      bullet("Cloud infrastructure (AWS, GCP, or Azure) is provisioned with GPU capacity for model inference."),
      divider(),

      // Section 8
      h1("8. Stakeholders"),
      twoColTable(
        ["Stakeholder", "Role / Interest"],
        [
          ["CPCB (Central Pollution Control Board)", "Data provider, regulatory authority, primary institutional user"],
          ["State PCBs (TNPCB, MPCB, KSPCB, DPCC)", "Data provider and enforcement authority for respective states"],
          ["Municipal Corporations (BBMP, MCGM, MCD)", "Enforcement execution and construction permit data provider"],
          ["Ministry of Environment, Forest & Climate Change", "Policy oversight, NCAP funding alignment"],
          ["Indian Meteorological Department (IMD)", "Meteorological data provider"],
          ["ISRO / National Remote Sensing Centre (NRSC)", "Satellite imagery and geospatial data support"],
          ["Citizens and Resident Welfare Associations", "End consumers of health advisories"],
          ["NGOs and Public Health Researchers", "Validation partners and outcome measurement"]
        ],
        [4000, 5360]
      ),
      new Paragraph({ spacing: { before: 120 } }),
      divider(),

      // Section 9
      h1("9. Risks"),
      threeColTable(
        ["Risk", "Likelihood", "Mitigation"],
        [
          ["CAAQMS data gaps / sensor downtime", "High", "Satellite fallback + gap-filling interpolation model"],
          ["Regulatory data sharing barriers", "Medium", "Pilot with publicly available CPCB Open Data"],
          ["Model accuracy below acceptance threshold", "Medium", "Ensemble approach + continuous retraining pipeline"],
          ["Regional language quality below user expectation", "Low-Medium", "Native speaker validation + human-in-the-loop review"],
          ["Cloud cost overruns", "Low", "Cost caps, serverless inference, spot instance usage"]
        ],
        [3800, 2000, 3560]
      ),
      new Paragraph({ spacing: { before: 120 } })
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/home/claude/aq_docs/PRD_AirIQ.docx", buffer);
  console.log("PRD created successfully.");
});
