const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
  WidthType, ShadingType, PageNumber, PageBreak, TableOfContents
} = require('docx');
const fs = require('fs');

const BRAND = "0F4C81";
const ACCENT = "1565C0";
const LIGHT_BG = "EEF4FB";
const TABLE_HEADER = "0F4C81";
const TABLE_ROW_ALT = "F0F6FF";
const GRAY = "6B7280";
const GREEN = "166534";
const GREEN_BG = "DCFCE7";
const ORANGE = "9A3412";
const ORANGE_BG = "FFEDD5";

const border = { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" };
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
    children: [new TextRun({ text, bold: true, size: 24, color: "1E3A5F", font: "Arial" })]
  });
}
function para(text) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text, size: 22, font: "Arial", color: "1F2937" })]
  });
}
function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: 22, font: "Arial", color: "1F2937" })]
  });
}
function numbered(text) {
  return new Paragraph({
    numbering: { reference: "numbers", level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: 22, font: "Arial", color: "1F2937" })]
  });
}
function divider() {
  return new Paragraph({
    spacing: { before: 160, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0", space: 1 } },
    children: [new TextRun("")]
  });
}
function pageBreak() { return new Paragraph({ children: [new PageBreak()] }); }

function colorBox(lines, fill, textColor = "1F2937") {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({ children: [new TableCell({
      borders,
      width: { size: 9360, type: WidthType.DXA },
      shading: { fill, type: ShadingType.CLEAR },
      margins: { top: 140, bottom: 140, left: 220, right: 220 },
      children: lines.map(l => new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: l, size: 21, font: "Arial", color: textColor })]
      }))
    })]})  ]
  });
}

function userStoryTable(stories) {
  const hRow = new TableRow({
    children: ["ID", "As a...", "I want to...", "So that..."].map((h, i) => new TableCell({
      borders, width: { size: [900, 2200, 3000, 3260][i], type: WidthType.DXA },
      shading: { fill: TABLE_HEADER, type: ShadingType.CLEAR },
      margins: { top: 100, bottom: 100, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 21, font: "Arial" })] })]
    }))
  });
  const rows = stories.map((s, ri) => new TableRow({
    children: s.map((cell, ci) => new TableCell({
      borders, width: { size: [900, 2200, 3000, 3260][ci], type: WidthType.DXA },
      shading: { fill: ri % 2 === 0 ? "FFFFFF" : TABLE_ROW_ALT, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: cell, size: 20, font: "Arial", color: "1F2937" })] })]
    }))
  }));
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [900, 2200, 3000, 3260], rows: [hRow, ...rows] });
}

function acTable(criteria) {
  const hRow = new TableRow({
    children: ["#", "Acceptance Criterion", "Priority"].map((h, i) => new TableCell({
      borders, width: { size: [600, 7560, 1200][i], type: WidthType.DXA },
      shading: { fill: TABLE_HEADER, type: ShadingType.CLEAR },
      margins: { top: 100, bottom: 100, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 21, font: "Arial" })] })]
    }))
  });
  const rows = criteria.map((c, ri) => new TableRow({
    children: c.map((cell, ci) => {
      const color = ci === 2 ? (cell === "Must" ? GREEN_BG : cell === "Should" ? ORANGE_BG : "F8FAFC") : (ri % 2 === 0 ? "FFFFFF" : TABLE_ROW_ALT);
      const textCol = ci === 2 ? (cell === "Must" ? GREEN : cell === "Should" ? ORANGE : "374151") : "1F2937";
      return new TableCell({
        borders, width: { size: [600, 7560, 1200][ci], type: WidthType.DXA },
        shading: { fill: color, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: cell, size: 20, font: "Arial", color: textCol, bold: ci === 2 })] })]
      });
    })
  }));
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [600, 7560, 1200], rows: [hRow, ...rows] });
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
        run: { size: 24, bold: true, font: "Arial", color: "1E3A5F" },
        paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 } }
    ]
  },
  sections: [{
    properties: {
      page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
    },
    headers: {
      default: new Header({ children: [new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BRAND, space: 1 } },
        spacing: { after: 120 },
        children: [
          new TextRun({ text: "AirIQ Platform", bold: true, color: BRAND, size: 20, font: "Arial" }),
          new TextRun({ text: "   |   Functional Requirements Document (FRD)", color: GRAY, size: 20, font: "Arial" })
        ]
      })] })
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0", space: 1 } },
        spacing: { before: 120 }, alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "CONFIDENTIAL   |   Page ", color: GRAY, size: 18, font: "Arial" }),
          new TextRun({ children: [PageNumber.CURRENT], color: GRAY, size: 18, font: "Arial" }),
          new TextRun({ text: " of ", color: GRAY, size: 18, font: "Arial" }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], color: GRAY, size: 18, font: "Arial" })
        ]
      })] })
    },
    children: [
      // Cover
      new Paragraph({ spacing: { before: 1440, after: 200 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "AirIQ", bold: true, size: 80, color: BRAND, font: "Arial" })] }),
      new Paragraph({ spacing: { before: 0, after: 120 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "AI-Powered Urban Air Quality Intelligence Platform", size: 36, color: ACCENT, font: "Arial" })] }),
      new Paragraph({ spacing: { before: 120, after: 480 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Functional Requirements Document (FRD)", bold: true, size: 28, color: "374151", font: "Arial" })] }),
      colorBox([
        "Version: 1.0     |     Status: Under Review",
        "Date: June 2025     |     Classification: Confidential",
        "Owner: Product & Engineering     |     Linked to: PRD v1.0"
      ], LIGHT_BG),
      pageBreak(),

      new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" }),
      pageBreak(),

      h1("1. Document Purpose"),
      para("This Functional Requirements Document (FRD) defines the features, user stories, and acceptance criteria for each module of the AirIQ platform. It is the primary specification document for engineering, QA, and design teams and directly references the goals and personas defined in the PRD v1.0."),
      para("Each feature is organised as: Feature Description, User Stories, and Acceptance Criteria. Priority is classified as Must (MVP critical), Should (Phase 2), or Could (backlog)."),
      divider(),

      // Feature 1
      h1("2. Feature 1 — Geospatial Pollution Source Attribution Engine"),
      h2("2.1 Description"),
      para("The Source Attribution Engine is a multi-modal AI agent that analyses spatial-temporal AQI patterns from monitoring stations and satellite data against land use maps, traffic density, construction permits, industrial stack records, and satellite-detected thermal anomalies. It produces ward-level attribution outputs — expressed as percentage contributions from each source category (industry, vehicular, construction, waste burning, dust) — with statistical confidence scores and timestamped provenance."),
      h2("2.2 User Stories"),
      userStoryTable([
        ["US-1.1", "City Environment Officer", "see a map showing which sources are responsible for current AQI at each ward", "I can direct enforcement to the right source category"],
        ["US-1.2", "CPCB Analyst", "view a time-series of source contribution at a monitoring station", "I can identify persistent industrial emitters vs. episodic events"],
        ["US-1.3", "City Environment Officer", "download a PDF attribution report for any pollution event", "I can share evidence with senior officials and legal teams"],
        ["US-1.4", "SPCB Inspector", "see a confidence score alongside each attribution", "I know how reliable the source identification is before taking action"],
        ["US-1.5", "Policy Maker", "compare source category contributions across cities", "I can target NCAP investment at the highest-impact source types"]
      ]),
      new Paragraph({ spacing: { before: 120 } }),
      h2("2.3 Acceptance Criteria"),
      acTable([
        ["AC-1.1", "System ingests CAAQMS readings and attributes them to source categories within 30 minutes of data availability", "Must"],
        ["AC-1.2", "Attribution output includes percentage contribution from each of: industry, vehicular, construction, waste burning, road dust, and other", "Must"],
        ["AC-1.3", "Each attribution record carries a confidence score (0–1.0) derived from data completeness and model uncertainty", "Must"],
        ["AC-1.4", "Attribution is displayed on an interactive choropleth map at ward/zone granularity", "Must"],
        ["AC-1.5", "Attribution accuracy meets ≥ 75% agreement with CPCB emission inventory on validation dataset", "Must"],
        ["AC-1.6", "System supports export of attribution reports in PDF and CSV format", "Must"],
        ["AC-1.7", "Attribution engine handles missing sensor data through gap-filling interpolation with confidence penalty applied", "Must"],
        ["AC-1.8", "Time-series attribution view available for any ward, any date range up to 12 months", "Should"],
        ["AC-1.9", "Thermal anomaly overlay from MODIS/Sentinel imagery visible on the attribution map", "Should"],
        ["AC-1.10", "Multi-city comparative attribution view shows source category breakdown for all enrolled cities", "Could"]
      ]),
      divider(),

      // Feature 2
      h1("3. Feature 2 — Hyperlocal Predictive AQI Forecasting Agent"),
      h2("3.1 Description"),
      para("The Forecasting Agent integrates meteorological forecasts (wind, temperature, humidity, precipitation), traffic prediction models, seasonal emission calendars, and atmospheric dispersion modelling (AERMOD or similar) to generate 24h and 72h AQI predictions at 1km grid resolution across city boundaries. Outputs are presented as grid maps, ward-level summaries, and alert triggers when forecasted AQI is projected to cross index thresholds."),
      h2("3.2 User Stories"),
      userStoryTable([
        ["US-2.1", "City Environment Officer", "see a 24-hour AQI forecast map for my city at ward level", "I can pre-position resources before a pollution event occurs"],
        ["US-2.2", "Enforcement Inspector", "receive a next-day alert when my zone is forecast to breach AQI 200", "I can prepare for high-priority inspection deployment"],
        ["US-2.3", "Citizen", "view tomorrow's forecasted AQI for my specific neighbourhood", "I can decide whether to let my child walk to school"],
        ["US-2.4", "CPCB Analyst", "compare forecasted AQI against actual AQI for any past date", "I can assess model accuracy and recalibrate if needed"],
        ["US-2.5", "City Environment Officer", "receive an automated weekly forecast summary report by email", "I can brief the Commissioner without manual report preparation"]
      ]),
      new Paragraph({ spacing: { before: 120 } }),
      h2("3.3 Acceptance Criteria"),
      acTable([
        ["AC-2.1", "System generates 24h AQI forecasts at 1km grid resolution for all enrolled cities, refreshed every 6 hours", "Must"],
        ["AC-2.2", "Forecast RMSE for PM2.5 is at least 20% better than a persistence baseline (using last observed value)", "Must"],
        ["AC-2.3", "Forecasts integrate IMD meteorological data, traffic prediction feeds, and satellite-derived dust index", "Must"],
        ["AC-2.4", "AQI forecast map renders in browser within 3 seconds at 1920x1080 resolution", "Must"],
        ["AC-2.5", "Alert notifications trigger automatically when forecast crosses AQI 200 threshold, delivered within 5 minutes of forecast generation", "Must"],
        ["AC-2.6", "Forecast uncertainty band (± range) displayed alongside point estimate on map", "Must"],
        ["AC-2.7", "72-hour forecast available with reduced confidence tier flagged visually", "Should"],
        ["AC-2.8", "Automated weekly email report summarising next 7-day forecast outlook for enrolled city", "Should"],
        ["AC-2.9", "Historical forecast vs. actual comparison view with RMSE and bias metrics available for last 90 days", "Should"],
        ["AC-2.10", "Model retraining pipeline triggered automatically when RMSE exceeds 30% above baseline for 5 consecutive days", "Should"]
      ]),
      divider(),

      // Feature 3
      h1("4. Feature 3 — Enforcement Intelligence and Prioritisation Agent"),
      h2("4.1 Description"),
      para("The Enforcement Intelligence Agent correlates hotspot data from the attribution engine with the registered emission source registry — including industries with consent-to-operate, active construction sites, waste processing facilities, and diesel fleet movement patterns. It generates a daily prioritised enforcement action list, ranked by estimated pollution-reduction impact per inspection, accompanied by supporting geospatial documentation and historical compliance records."),
      h2("4.2 User Stories"),
      userStoryTable([
        ["US-3.1", "City Environment Officer", "receive a ranked daily list of the top 10 enforcement targets", "My team can deploy limited inspector resources for maximum impact"],
        ["US-3.2", "Enforcement Inspector", "view a mobile-friendly inspection brief for each target including location, evidence, and historical violations", "I can conduct an efficient, evidence-backed field inspection"],
        ["US-3.3", "SPCB Analyst", "see which industries have exceeded emission norms most frequently in the past 90 days", "I can escalate repeat offenders to legal proceedings"],
        ["US-3.4", "City Environment Officer", "mark an enforcement action as completed and log the outcome", "Inspection records are maintained digitally for audit purposes"],
        ["US-3.5", "Policy Maker", "view an aggregate enforcement effectiveness report showing AQI change after inspections", "I can measure the impact of enforcement investment"]
      ]),
      new Paragraph({ spacing: { before: 120 } }),
      h2("4.3 Acceptance Criteria"),
      acTable([
        ["AC-3.1", "System generates a ranked enforcement action list by 6:00 AM daily, refreshed from overnight attribution and forecast data", "Must"],
        ["AC-3.2", "Each enforcement recommendation includes: source name, category, location (GPS + ward), estimated PM2.5 contribution, confidence score, and 30-day violation history", "Must"],
        ["AC-3.3", "Ranking algorithm weights estimated pollution-reduction impact, recidivism score, and confidence score", "Must"],
        ["AC-3.4", "Mobile-friendly inspection brief page loads within 2 seconds on 4G connection", "Must"],
        ["AC-3.5", "Field inspectors can log inspection outcome (compliant / non-compliant / not found) with photo evidence from mobile", "Must"],
        ["AC-3.6", "Expert review panel rates enforcement recommendation quality at ≥ 4.0 / 5.0 in quarterly evaluation", "Must"],
        ["AC-3.7", "System integrates construction permit API from municipal corporations for active site tracking", "Should"],
        ["AC-3.8", "Diesel fleet enforcement recommendations generated from FASTAG / vehicle mobility data when available", "Should"],
        ["AC-3.9", "Enforcement case dossier exportable as PDF for use in legal proceedings", "Should"],
        ["AC-3.10", "Notification to SPCB when a source exceeds emission threshold 3 times in a 30-day window", "Could"]
      ]),
      divider(),

      // Feature 4
      h1("5. Feature 4 — Multi-City Comparative Intelligence Dashboard"),
      h2("5.1 Description"),
      para("The Comparative Dashboard provides a geospatial analytics layer for state and national policy makers to track and compare air quality trends, intervention effectiveness, and source category compliance across multiple urban centres. It surfaces learning from successful interventions in comparable cities and provides benchmarking against NCAP targets."),
      h2("5.2 User Stories"),
      userStoryTable([
        ["US-4.1", "State Policy Maker", "compare average PM2.5 trends across 5 cities over the past 12 months", "I can identify which cities are improving and which need additional support"],
        ["US-4.2", "CPCB Analyst", "view AQI trend lines for all enrolled cities on a single screen", "I can identify national-level seasonal patterns"],
        ["US-4.3", "State Policy Maker", "see which intervention types produced the greatest AQI reduction across cities", "I can replicate successful programmes in underperforming cities"],
        ["US-4.4", "CPCB Analyst", "benchmark each city's performance against its NCAP annual target", "I can identify cities at risk of missing targets before year-end"],
        ["US-4.5", "Ministry Official", "export a formatted comparative performance report for all enrolled cities", "I can submit progress reports to Parliament without manual compilation"]
      ]),
      new Paragraph({ spacing: { before: 120 } }),
      h2("5.3 Acceptance Criteria"),
      acTable([
        ["AC-4.1", "Dashboard displays real-time AQI index for all enrolled cities on a single interactive map view", "Must"],
        ["AC-4.2", "City comparison table shows PM2.5, PM10, NO2, SO2, and AQI index with 7-day trend arrows", "Must"],
        ["AC-4.3", "Time-series chart supports multi-city overlay for any pollutant over user-selected date range", "Must"],
        ["AC-4.4", "NCAP annual target progress bar displayed for each enrolled city", "Must"],
        ["AC-4.5", "Intervention log with pre/post AQI delta visible for each enforcement action marked complete", "Should"],
        ["AC-4.6", "Automated monthly comparison report emailed to registered policy maker accounts", "Should"],
        ["AC-4.7", "City similarity clustering feature shows which cities have comparable emission profiles", "Could"],
        ["AC-4.8", "Dashboard supports up to 50 cities simultaneously without rendering degradation", "Should"]
      ]),
      divider(),

      // Feature 5
      h1("6. Feature 5 — Citizen Health Risk Advisory System"),
      h2("6.1 Description"),
      para("The Citizen Advisory System generates ward-level health risk alerts, maps population vulnerability (hospitals, schools, outdoor workers, elderly populations) against forecast AQI, and pushes personalised advisories through mobile app notifications, web widgets, and IVR. Advisories are generated in regional languages using an LLM-powered multilingual pipeline, adjusted for audience vulnerability profile."),
      h2("6.2 User Stories"),
      userStoryTable([
        ["US-5.1", "Citizen", "receive a daily morning advisory in my language telling me today's and tomorrow's air quality risk", "I can plan my outdoor activities safely"],
        ["US-5.2", "Parent", "receive an alert when AQI in my ward is forecast to exceed 200 tomorrow", "I can decide whether to send my child to school"],
        ["US-5.3", "Outdoor Worker", "get a personalised advisory noting my occupation's specific exposure risk", "I know whether to wear a mask or adjust my schedule"],
        ["US-5.4", "Hospital Administrator", "see a forecast AQI overlay showing expected respiratory emergency admissions for the next 48 hours", "I can pre-position respiratory care resources"],
        ["US-5.5", "Citizen", "receive my advisory in Kannada, Tamil, or Hindi based on my language preference", "I understand the advisory without a language barrier"]
      ]),
      new Paragraph({ spacing: { before: 120 } }),
      h2("6.3 Acceptance Criteria"),
      acTable([
        ["AC-5.1", "Daily health advisory generated for every ward in enrolled cities, published by 7:00 AM every day", "Must"],
        ["AC-5.2", "Advisory content generated in English + at least 5 regional languages (Hindi, Kannada, Tamil, Bengali, Marathi)", "Must"],
        ["AC-5.3", "Advisory includes: current AQI category, 24h forecast, recommended actions, and vulnerable population guidance", "Must"],
        ["AC-5.4", "Push notifications delivered to opted-in users within 10 minutes of advisory generation", "Must"],
        ["AC-5.5", "AQI breach alert (threshold 200 PM2.5) delivered within 5 minutes of forecast generation", "Must"],
        ["AC-5.6", "Native language quality evaluated at ≥ 4.0/5.0 by native-speaker reviewers for each language", "Must"],
        ["AC-5.7", "Web widget embeddable on city municipal portal with responsive design for mobile screens", "Must"],
        ["AC-5.8", "Vulnerability overlay shows hospitals, schools, and outdoor worker zones on advisory map", "Should"],
        ["AC-5.9", "IVR call-in service available with automated voice advisory in regional language", "Should"],
        ["AC-5.10", "WhatsApp advisory delivery channel for citizens without smartphone app installed", "Could"]
      ]),
      divider(),

      // Section 7
      h1("7. Feature Prioritisation Summary"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2200, 3560, 1800, 1800],
        rows: [
          new TableRow({ children: ["Feature ID", "Feature Name", "Phase", "Priority"].map((h, i) => new TableCell({
            borders, width: { size: [2200, 3560, 1800, 1800][i], type: WidthType.DXA },
            shading: { fill: TABLE_HEADER, type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 21, font: "Arial" })] })]
          })) }),
          ...[ ["F-1", "Source Attribution Engine", "Phase 1 (MVP)", "Critical"],
               ["F-2", "Hyperlocal AQI Forecasting", "Phase 1 (MVP)", "Critical"],
               ["F-3", "Enforcement Intelligence Agent", "Phase 1 (MVP)", "Critical"],
               ["F-4", "Multi-City Comparative Dashboard", "Phase 2", "High"],
               ["F-5", "Citizen Health Advisory System", "Phase 1 (MVP)", "Critical"]
          ].map((row, ri) => new TableRow({ children: row.map((cell, ci) => new TableCell({
            borders, width: { size: [2200, 3560, 1800, 1800][ci], type: WidthType.DXA },
            shading: { fill: ri % 2 === 0 ? "FFFFFF" : TABLE_ROW_ALT, type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: cell, size: 20, font: "Arial", color: "1F2937" })] })]
          })) }))
        ]
      }),
      new Paragraph({ spacing: { before: 120 } })
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/home/claude/aq_docs/FRD_AirIQ.docx", buffer);
  console.log("FRD created successfully.");
});
