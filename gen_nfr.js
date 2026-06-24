const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
  WidthType, ShadingType, PageNumber, PageBreak, TableOfContents
} = require('docx');
const fs = require('fs');

const BRAND = "B45309";
const ACCENT = "D97706";
const LIGHT_BG = "FFFBEB";
const TABLE_HEADER = "92400E";
const TABLE_ROW_ALT = "FFFEF0";
const GRAY = "6B7280";
const RED = "991B1B";
const RED_BG = "FEE2E2";
const YELLOW = "92400E";
const YELLOW_BG = "FEF3C7";
const GREEN = "166534";
const GREEN_BG = "DCFCE7";
const BLUE = "1E40AF";
const BLUE_BG = "EFF6FF";

const border = { style: BorderStyle.SINGLE, size: 1, color: "FDE68A" };
const borders = { top: border, bottom: border, left: border, right: border };

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 120 },
    children: [new TextRun({ text, bold: true, size: 36, color: BRAND, font: "Arial" })] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 100 },
    children: [new TextRun({ text, bold: true, size: 28, color: ACCENT, font: "Arial" })] });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, size: 24, color: "78350F", font: "Arial" })] });
}
function para(text) {
  return new Paragraph({ spacing: { before: 80, after: 80 },
    children: [new TextRun({ text, size: 22, font: "Arial", color: "1F2937" })] });
}
function bullet(text, level = 0) {
  return new Paragraph({ numbering: { reference: "bullets", level }, spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: 22, font: "Arial", color: "1F2937" })] });
}
function divider() {
  return new Paragraph({ spacing: { before: 160, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "FDE68A", space: 1 } },
    children: [new TextRun("")] });
}
function pageBreak() { return new Paragraph({ children: [new PageBreak()] }); }

function colorBox(lines, fill) {
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [9360],
    rows: [new TableRow({ children: [new TableCell({
      borders, width: { size: 9360, type: WidthType.DXA },
      shading: { fill, type: ShadingType.CLEAR },
      margins: { top: 140, bottom: 140, left: 220, right: 220 },
      children: lines.map(l => new Paragraph({ spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: l, size: 21, font: "Arial", color: "1F2937" })] }))
    })] })] });
}

function nfrTable(rows) {
  const headers = ["NFR-ID", "Requirement", "Target / SLA", "Measurement Method", "Priority"];
  const widths = [900, 3000, 2200, 2100, 1160];
  const hRow = new TableRow({ children: headers.map((h, i) => new TableCell({
    borders, width: { size: widths[i], type: WidthType.DXA },
    shading: { fill: TABLE_HEADER, type: ShadingType.CLEAR },
    margins: { top: 100, bottom: 100, left: 100, right: 100 },
    children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 19, font: "Arial" })] })]
  })) });
  const dataRows = rows.map((row, ri) => new TableRow({ children: row.map((cell, ci) => {
    const pFill = ci === 4 ? (cell === "Critical" ? RED_BG : cell === "High" ? YELLOW_BG : cell === "Medium" ? BLUE_BG : GREEN_BG) : (ri % 2 === 0 ? "FFFFFF" : TABLE_ROW_ALT);
    const pCol = ci === 4 ? (cell === "Critical" ? RED : cell === "High" ? YELLOW : cell === "Medium" ? BLUE : GREEN) : "1F2937";
    return new TableCell({
      borders, width: { size: widths[ci], type: WidthType.DXA },
      shading: { fill: pFill, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
      children: [new Paragraph({ children: [new TextRun({ text: cell, size: 18, font: "Arial", color: pCol, bold: ci === 4 })] })]
    });
  }) }));
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: widths, rows: [hRow, ...dataRows] });
}

function slaTable(rows) {
  const headers = ["API / Endpoint", "P50 Latency", "P95 Latency", "P99 Latency", "Notes"];
  const widths = [2400, 1440, 1440, 1440, 2640];
  const hRow = new TableRow({ children: headers.map((h, i) => new TableCell({
    borders, width: { size: widths[i], type: WidthType.DXA },
    shading: { fill: TABLE_HEADER, type: ShadingType.CLEAR },
    margins: { top: 100, bottom: 100, left: 100, right: 100 },
    children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 19, font: "Arial" })] })]
  })) });
  const dataRows = rows.map((row, ri) => new TableRow({ children: row.map((cell, ci) => new TableCell({
    borders, width: { size: widths[ci], type: WidthType.DXA },
    shading: { fill: ri % 2 === 0 ? "FFFFFF" : TABLE_ROW_ALT, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [new Paragraph({ children: [new TextRun({ text: cell, size: 18, font: "Arial", color: "1F2937" })] })]
  })) }));
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: widths, rows: [hRow, ...dataRows] });
}

function twoColTable(headers, rows, widths = [3200, 6160]) {
  const hRow = new TableRow({ children: headers.map((h, i) => new TableCell({
    borders, width: { size: widths[i], type: WidthType.DXA },
    shading: { fill: TABLE_HEADER, type: ShadingType.CLEAR },
    margins: { top: 100, bottom: 100, left: 150, right: 150 },
    children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 21, font: "Arial" })] })]
  })) });
  const dataRows = rows.map((row, ri) => new TableRow({ children: row.map((cell, ci) => new TableCell({
    borders, width: { size: widths[ci], type: WidthType.DXA },
    shading: { fill: ci === 0 ? LIGHT_BG : (ri % 2 === 0 ? "FFFFFF" : TABLE_ROW_ALT), type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 150, right: 150 },
    children: [new Paragraph({ children: [new TextRun({ text: cell, size: 20, font: "Arial", color: "1F2937", bold: ci === 0 })] })]
  })) }));
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: widths, rows: [hRow, ...dataRows] });
}

const doc = new Document({
  numbering: { config: [
    { reference: "bullets", levels: [
      { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
      { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 360 } } } }
    ]}
  ]},
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: BRAND }, paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: ACCENT }, paragraph: { spacing: { before: 280, after: 100 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: "78350F" }, paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 } }
    ]
  },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BRAND, space: 1 } },
      spacing: { after: 120 },
      children: [new TextRun({ text: "AirIQ Platform", bold: true, color: BRAND, size: 20, font: "Arial" }),
                 new TextRun({ text: "   |   Non-Functional Requirements Document (NFR)", color: GRAY, size: 20, font: "Arial" })]
    })] }) },
    footers: { default: new Footer({ children: [new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: "FDE68A", space: 1 } },
      spacing: { before: 120 }, alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "CONFIDENTIAL   |   Page ", color: GRAY, size: 18, font: "Arial" }),
                 new TextRun({ children: [PageNumber.CURRENT], color: GRAY, size: 18, font: "Arial" }),
                 new TextRun({ text: " of ", color: GRAY, size: 18, font: "Arial" }),
                 new TextRun({ children: [PageNumber.TOTAL_PAGES], color: GRAY, size: 18, font: "Arial" })]
    })] }) },
    children: [
      new Paragraph({ spacing: { before: 1440, after: 200 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "AirIQ", bold: true, size: 80, color: BRAND, font: "Arial" })] }),
      new Paragraph({ spacing: { before: 0, after: 120 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "AI-Powered Urban Air Quality Intelligence Platform", size: 36, color: ACCENT, font: "Arial" })] }),
      new Paragraph({ spacing: { before: 120, after: 480 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Non-Functional Requirements Document (NFR)", bold: true, size: 28, color: "374151", font: "Arial" })] }),
      colorBox([
        "Version: 1.0     |     Status: Under QA + DevOps Review",
        "Date: June 2025     |     Classification: Confidential",
        "Owner: Engineering Lead + DevOps     |     Linked to: TRD v1.0, PRD v1.0"
      ], LIGHT_BG),
      pageBreak(),
      new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" }),
      pageBreak(),

      h1("1. Document Purpose"),
      para("This Non-Functional Requirements (NFR) document defines the quality attributes, performance targets, operational SLAs, security standards, and compliance requirements for the AirIQ platform. These requirements apply system-wide and supplement the functional requirements defined in the FRD v1.0."),
      para("Requirements are prioritised as Critical (system unusable if unmet), High (significant degradation if unmet), Medium (noticeable but manageable), or Low (desirable but deferrable)."),
      divider(),

      h1("2. NFR-PERF: Performance Requirements"),
      h2("2.1 API Response Time SLAs"),
      para("All measurements taken under normal operating load (up to 500 concurrent active users for Phase 1) without degradation. Load testing target is 2x normal load with graceful degradation, not failure."),
      slaTable([
        ["GET /api/attribution/ward/{ward_id}", "120ms", "400ms", "800ms", "Cached result; cache TTL = 15 min"],
        ["GET /api/forecast/city/{city_id}", "200ms", "600ms", "1200ms", "Pre-computed every 6h; map tile cache hit"],
        ["GET /api/enforcement/daily-list", "150ms", "450ms", "900ms", "Generated at 5:50 AM; cached until next run"],
        ["GET /api/advisory/ward/{ward_id}", "100ms", "300ms", "600ms", "LLM-generated at 6:30 AM; fully cached"],
        ["POST /api/enforcement/log-action", "200ms", "600ms", "1200ms", "Write + Kafka emit; no cache benefit"],
        ["Map tile delivery (PMTiles/S3)", "50ms", "180ms", "400ms", "CDN-cached; measured at CloudFront edge"],
        ["Mobile push advisory delivery", "< 5 min from generation", "N/A", "N/A", "Measured end-to-end at FCM delivery log"],
        ["AQI forecast generation (batch)", "< 10 min total", "N/A", "N/A", "Full city forecast run; not per-request"]
      ]),
      new Paragraph({ spacing: { before: 120 } }),
      h2("2.2 Throughput Requirements"),
      nfrTable([
        ["PERF-01", "API gateway sustains 500 concurrent requests without degradation", "500 RPS peak; P95 < 600ms", "k6 load test; 500 VU sustained 10 min", "Critical"],
        ["PERF-02", "CAAQMS ingestion pipeline processes new batches without delay", "< 5 min lag at 100 msg/sec", "Kafka consumer lag metric", "Critical"],
        ["PERF-03", "Satellite raster processing completes daily MODIS AOD ingest", "< 2 hours per city per day", "Pipeline execution time log", "High"],
        ["PERF-04", "Advisory generation for all wards in a city completes on time", "< 30 minutes for 200 wards", "Celery task completion metric", "Critical"],
        ["PERF-05", "Map tile rendering in browser at city scale", "< 3 seconds initial load at 1920x1080", "Playwright synthetic test", "High"],
        ["PERF-06", "Mobile advisory page loads on 4G connection", "< 2 seconds LCP (Largest Contentful Paint)", "WebPageTest via 4G throttle profile", "High"]
      ]),
      divider(),

      h1("3. NFR-AVAIL: Availability and Reliability"),
      nfrTable([
        ["AVAIL-01", "Production API gateway uptime (monthly)", "99.5% (< 3.6 hrs downtime/month)", "UptimeRobot + CloudWatch SLA report", "Critical"],
        ["AVAIL-02", "Database availability (PostgreSQL Multi-AZ)", "99.9% (< 45 min downtime/month)", "RDS CloudWatch AvailabilityMetric", "Critical"],
        ["AVAIL-03", "Kafka broker availability", "99.5%", "Confluent / MSK CloudWatch", "Critical"],
        ["AVAIL-04", "Advisory generation SLA (daily advisory published by 7:00 AM)", "99% of scheduled days", "Celery task success rate log", "Critical"],
        ["AVAIL-05", "Enforcement list SLA (generated by 6:00 AM)", "99% of scheduled days", "Scheduled task completion metric", "Critical"],
        ["AVAIL-06", "Recovery Time Objective (RTO) after critical failure", "< 4 hours (production restore)", "DR drill twice per year", "Critical"],
        ["AVAIL-07", "Recovery Point Objective (RPO) — maximum data loss tolerated", "< 15 minutes", "RDS automated backup interval", "Critical"],
        ["AVAIL-08", "Graceful degradation when upstream data source unavailable", "Advisory publishes with data-gap warning", "Chaos engineering test (Gremlin)", "High"],
        ["AVAIL-09", "CAAQMS gap-fill activates within defined threshold", "Within 60 min of sensor outage detected", "Gap-fill trigger metric", "High"],
        ["AVAIL-10", "Zero-downtime deployment for all application updates", "0 minutes downtime during deploy", "Rolling update K8s deployment test", "High"]
      ]),
      divider(),

      h1("4. NFR-SCALE: Scalability Requirements"),
      nfrTable([
        ["SCALE-01", "Horizontal scaling of API pods on load increase", "Auto-scale from 2 to 10 pods within 3 min of >70% CPU", "HPA Kubernetes metric + k6 ramp test", "Critical"],
        ["SCALE-02", "Support for multi-city expansion", "Platform supports 50 cities with no architecture change", "Load test with 50-city data set", "High"],
        ["SCALE-03", "TimescaleDB handles 2-year CAAQMS time-series for 50 cities", "Query P95 < 500ms on 2B row dataset", "pgbench + EXPLAIN ANALYZE", "High"],
        ["SCALE-04", "Kafka topics scale with additional data sources", "Supports 20 new source topics with no broker reconfiguration", "Architecture review", "Medium"],
        ["SCALE-05", "Advisory generation scales with ward count", "< 30 min for 2000 wards (10-city Phase 2 scale)", "Celery worker autoscaling test", "High"],
        ["SCALE-06", "Map tile cache absorbs 10x normal traffic spike", "CDN cache hit rate > 90% under 5000 RPS tile load", "CloudFront cache metrics + load test", "High"]
      ]),
      divider(),

      h1("5. NFR-SEC: Security Requirements"),
      h2("5.1 Authentication and Access Control"),
      nfrTable([
        ["SEC-01", "All API endpoints require authenticated JWT", "0 unauthenticated data requests reach application layer", "OWASP ZAP API scan", "Critical"],
        ["SEC-02", "RBAC enforced at API gateway and database layer", "Inspector cannot access admin functions; verified by pen test", "Role permission matrix + pen test", "Critical"],
        ["SEC-03", "API keys for third-party integrations stored in secrets manager", "0 keys in code repositories or environment variables", "GitHub secret scanning + AWS Secrets Manager audit", "Critical"],
        ["SEC-04", "Session token TTL", "Access token: 1 hour. Refresh token: 24 hours", "JWT decode + expiry test", "Critical"],
        ["SEC-05", "Rate limiting on public advisory API", "100 req/min per IP; 429 response with retry-after", "k6 rate limit test", "High"],
        ["SEC-06", "OWASP Top 10 vulnerability scan passes quarterly", "0 Critical or High findings after remediation", "Quarterly OWASP ZAP + manual pen test", "Critical"],
        ["SEC-07", "SQL injection and XSS prevention", "All user inputs parameterised; CSP headers enforced", "OWASP ZAP scan + CSP audit", "Critical"],
        ["SEC-08", "LLM prompt injection prevention", "Structured JSON input to LLM; no raw user text in system prompt", "Red-team adversarial prompt test", "High"]
      ]),
      new Paragraph({ spacing: { before: 120 } }),
      h2("5.2 Data Security"),
      nfrTable([
        ["DSEC-01", "Data at rest encryption", "AES-256 for all S3, RDS, and TimescaleDB storage", "AWS encryption audit", "Critical"],
        ["DSEC-02", "Data in transit encryption", "TLS 1.3 for all API, database, and inter-service traffic", "ssllabs.com scan; A+ rating", "Critical"],
        ["DSEC-03", "PII isolation for citizen advisory opt-in data", "PII in separate schema; PII joins blocked by application-layer policy", "Code review + DB schema audit", "Critical"],
        ["DSEC-04", "Enforcement action log immutability", "Write-once; audit log table with trigger-based protection", "DB audit log test", "High"],
        ["DSEC-05", "Third-party API credential rotation", "Automated rotation every 90 days via AWS Secrets Manager", "Rotation schedule audit", "High"]
      ]),
      divider(),

      h1("6. NFR-PRIV: Privacy Requirements"),
      nfrTable([
        ["PRIV-01", "DPDPA 2023 compliance for all citizen data", "Data processing agreement in place; consent logged", "Legal review + DPA audit", "Critical"],
        ["PRIV-02", "Citizen opt-in for advisory notifications", "No push notifications without explicit user consent", "Consent flow code review + UX audit", "Critical"],
        ["PRIV-03", "Data minimisation for citizen advisory personalisation", "Only city + ward + language preference stored; no health data", "Privacy impact assessment", "Critical"],
        ["PRIV-04", "Right to erasure for citizen accounts", "User data deletion within 30 days of request", "Deletion workflow test", "High"],
        ["PRIV-05", "Advisory delivery logs anonymised", "Logs contain anonymised user_id only; no PII in logs", "Log audit", "High"],
        ["PRIV-06", "Cookie consent for web portal", "GDPR/DPDPA-compliant consent banner; analytics opt-in only", "UX audit + cookie scanner", "Medium"]
      ]),
      divider(),

      h1("7. NFR-MAINT: Maintainability and Observability"),
      nfrTable([
        ["MAINT-01", "All services emit structured logs in JSON format", "100% of service logs parseable by Loki/ELK", "Log format audit", "High"],
        ["MAINT-02", "Distributed tracing across all API calls", "OpenTelemetry traces with > 95% span capture rate", "Jaeger trace completeness audit", "High"],
        ["MAINT-03", "Model performance dashboards visible to ML team", "MLflow dashboard with RMSE, F1, and drift metrics updated daily", "Dashboard availability check", "High"],
        ["MAINT-04", "Infrastructure as Code coverage", "100% of production AWS resources defined in Terraform", "Terraform plan + drift detection", "High"],
        ["MAINT-05", "Automated unit test coverage", "≥ 80% line coverage on backend API and ML pipeline code", "pytest coverage report in CI", "High"],
        ["MAINT-06", "API versioning", "Semantic versioning; v1 API supported for 12 months after v2 launch", "API version management review", "Medium"],
        ["MAINT-07", "Runbook for every critical alert", "All PagerDuty alerts link to a runbook in Confluence", "Alert-runbook mapping audit", "High"],
        ["MAINT-08", "Model retraining pipeline is fully automated", "Zero manual steps required for scheduled retraining cycle", "Pipeline code review", "High"]
      ]),
      divider(),

      h1("8. NFR-ACCL: Accessibility and Localisation"),
      nfrTable([
        ["ACCL-01", "Web portal WCAG 2.1 AA compliance", "0 Level A or AA violations in automated scan", "axe DevTools + manual screen reader test", "High"],
        ["ACCL-02", "Mobile app responsive design minimum screen size", "Usable on 5-inch screen at 360px viewport width", "Device emulation test", "High"],
        ["ACCL-03", "Regional language advisory readability", "Flesch-Kincaid equivalent score < 60 (accessible language)", "Readability audit per language", "High"],
        ["ACCL-04", "Advisory displayed in user's language preference with fallback", "Fallback to English if regional LLM output quality check fails", "Language fallback test", "Critical"],
        ["ACCL-05", "Colour contrast ratio for AQI category colours", "WCAG AA: contrast ratio ≥ 4.5:1 for text on AQI colour bands", "Colour contrast checker", "High"]
      ]),
      divider(),

      h1("9. NFR-MON: Monitoring and Alerting SLAs"),
      twoColTable(["Monitoring Category", "Tooling + SLA"], [
        ["Infrastructure metrics", "Prometheus + Grafana; alert within 2 minutes of threshold breach"],
        ["API error rate", "PagerDuty alert if 5xx error rate exceeds 1% for 5 consecutive minutes"],
        ["ML model drift", "MLflow evidently AI drift detection; daily report; alert if RMSE > 30% above baseline"],
        ["Kafka consumer lag", "Alert if consumer lag exceeds 5-minute equivalent for CAAQMS topic"],
        ["Database storage", "Alert at 75% capacity; auto-scale or archive policy at 85%"],
        ["Advisory generation failure", "PagerDuty critical alert if advisory not published by 7:15 AM"],
        ["Certificate expiry", "Alert 30 days before TLS certificate expiry; auto-rotate via ACM"],
        ["Security anomaly", "AWS GuardDuty; immediate PagerDuty critical for high-severity findings"]
      ], [3600, 5760]),
      new Paragraph({ spacing: { before: 120 } }),
      divider(),

      h1("10. NFR Summary Dashboard"),
      para("The following table provides a one-page summary of all NFR categories, their priority weighting, and current readiness status for Phase 1 MVP."),
      new Table({
        width: { size: 9360, type: WidthType.DXA }, columnWidths: [2400, 1600, 1600, 1800, 1960],
        rows: [
          new TableRow({ children: ["NFR Category", "Total Requirements", "Critical", "High", "MVP Readiness"].map((h, i) => new TableCell({
            borders, width: { size: [2400, 1600, 1600, 1800, 1960][i], type: WidthType.DXA },
            shading: { fill: TABLE_HEADER, type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 20, font: "Arial" })] })]
          })) }),
          ...[ ["Performance (PERF)", "11", "4", "5", "Testable"],
               ["Availability (AVAIL)", "10", "7", "3", "Testable"],
               ["Scalability (SCALE)", "6", "1", "5", "Architecture Review"],
               ["Security (SEC)", "8", "7", "1", "Pen Test Required"],
               ["Data Security (DSEC)", "5", "3", "2", "Audit Required"],
               ["Privacy (PRIV)", "6", "3", "2", "Legal Review"],
               ["Maintainability (MAINT)", "8", "0", "7", "Tooling in Place"],
               ["Accessibility (ACCL)", "5", "1", "4", "UX Review"],
               ["Monitoring (MON)", "8", "3", "5", "Tooling in Place"]
          ].map((row, ri) => new TableRow({ children: row.map((cell, ci) => {
            const readFill = ci === 4 ? (cell === "Testable" ? GREEN_BG : cell === "Pen Test Required" ? RED_BG : cell === "Legal Review" ? RED_BG : YELLOW_BG) : (ri % 2 === 0 ? "FFFFFF" : TABLE_ROW_ALT);
            const readCol = ci === 4 ? (cell === "Testable" ? GREEN : cell.includes("Required") || cell === "Legal Review" ? RED : YELLOW) : "1F2937";
            return new TableCell({
              borders, width: { size: [2400, 1600, 1600, 1800, 1960][ci], type: WidthType.DXA },
              shading: { fill: readFill, type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun({ text: cell, size: 19, font: "Arial", color: readCol, bold: ci === 4 })] })]
            });
          }) }))
        ]
      }),
      new Paragraph({ spacing: { before: 120 } })
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/home/claude/aq_docs/NFR_AirIQ.docx", buffer);
  console.log("NFR created successfully.");
});
