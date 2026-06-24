const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
  WidthType, ShadingType, PageNumber, PageBreak, TableOfContents
} = require('docx');
const fs = require('fs');

const BRAND = "4A1942";
const ACCENT = "7B2D8B";
const LIGHT_BG = "F3E8FF";
const TABLE_HEADER = "4A1942";
const TABLE_ROW_ALT = "FAF5FF";
const GRAY = "6B7280";
const GREEN = "166534";
const GREEN_BG = "DCFCE7";
const YELLOW = "92400E";
const YELLOW_BG = "FEF3C7";
const BLUE = "1E40AF";
const BLUE_BG = "EFF6FF";

const border = { style: BorderStyle.SINGLE, size: 1, color: "E9D5FF" };
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
    children: [new TextRun({ text, bold: true, size: 24, color: "3B0764", font: "Arial" })] });
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
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "E9D5FF", space: 1 } },
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

function stackTable(rows) {
  const headers = ["Component", "Technology Choice", "Version", "Rationale", "Status"];
  const widths = [1800, 2000, 900, 3400, 1260];
  const hRow = new TableRow({ children: headers.map((h, i) => new TableCell({
    borders, width: { size: widths[i], type: WidthType.DXA },
    shading: { fill: TABLE_HEADER, type: ShadingType.CLEAR },
    margins: { top: 100, bottom: 100, left: 100, right: 100 },
    children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 19, font: "Arial" })] })]
  })) });
  const dataRows = rows.map((row, ri) => new TableRow({ children: row.map((cell, ci) => {
    const statusFill = ci === 4 ? (cell === "Confirmed" ? GREEN_BG : cell === "Provisional" ? YELLOW_BG : BLUE_BG) : (ri % 2 === 0 ? "FFFFFF" : TABLE_ROW_ALT);
    const statusCol = ci === 4 ? (cell === "Confirmed" ? GREEN : cell === "Provisional" ? YELLOW : BLUE) : "1F2937";
    return new TableCell({
      borders, width: { size: widths[ci], type: WidthType.DXA },
      shading: { fill: statusFill, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
      children: [new Paragraph({ children: [new TextRun({ text: cell, size: 18, font: "Arial", color: statusCol, bold: ci === 4 })] })]
    });
  }) }));
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: widths, rows: [hRow, ...dataRows] });
}

function apiTable(rows) {
  const headers = ["API / Service", "Provider", "Purpose", "Auth Method", "Rate Limit"];
  const widths = [1800, 1600, 2400, 1600, 1960];
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
        run: { size: 24, bold: true, font: "Arial", color: "3B0764" }, paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 } }
    ]
  },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BRAND, space: 1 } },
      spacing: { after: 120 },
      children: [new TextRun({ text: "AirIQ Platform", bold: true, color: BRAND, size: 20, font: "Arial" }),
                 new TextRun({ text: "   |   Technical Requirements Document (TRD)", color: GRAY, size: 20, font: "Arial" })]
    })] }) },
    footers: { default: new Footer({ children: [new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: "E9D5FF", space: 1 } },
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
        children: [new TextRun({ text: "Technical Requirements Document (TRD)", bold: true, size: 28, color: "374151", font: "Arial" })] }),
      colorBox([
        "Version: 1.0     |     Status: Under Engineering Review",
        "Date: June 2025     |     Classification: Confidential",
        "Owner: Engineering Lead     |     Linked to: PRD v1.0, DRD v1.0, NFR v1.0"
      ], LIGHT_BG),
      pageBreak(),
      new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" }),
      pageBreak(),

      h1("1. System Architecture Overview"),
      para("AirIQ follows a cloud-native, microservices architecture organised around five functional layers: Ingestion, Processing, AI/ML, Serving, and Presentation. The system is designed for horizontal scalability, cloud-agnostic deployment (AWS-primary, GCP-secondary), and modular replacement of individual AI components without full redeployment."),
      h2("1.1 Architecture Layers"),
      bullet("Layer 1 — Data Ingestion: Kafka-based streaming ingestion for CAAQMS, satellite, and meteorological feeds; batch ingestion for static registries. Data validated at topic entry and written to object storage Bronze zone."),
      bullet("Layer 2 — Data Processing: Apache Spark for large-scale batch processing (satellite raster, emission inventories); dbt for transformation pipeline; PostGIS for spatial operations; TimescaleDB for time-series aggregations."),
      bullet("Layer 3 — AI / ML Platform: MLflow for experiment tracking and model registry; Kubernetes-hosted inference pods (one per model); Celery task queue for async orchestration; PyTorch / scikit-learn model serving via FastAPI."),
      bullet("Layer 4 — API Serving: FastAPI REST gateway; Redis cache for pre-computed tile and forecast layers; PMTiles static map tile server; GraphQL endpoint for dashboard complex queries."),
      bullet("Layer 5 — Presentation: Next.js web application; React Native mobile app; push notification via Firebase Cloud Messaging (FCM); IVR integration via Twilio or Exotel."),
      h2("1.2 Multi-Agent Architecture"),
      para("The AI core is implemented as a multi-agent system with three specialised agents orchestrated by a central Coordinator Agent:"),
      bullet("Attribution Agent: Receives sensor + satellite + land-use feature vectors; outputs source category percentages and confidence scores per ward per timestep."),
      bullet("Forecasting Agent: Receives meteorological, traffic, and historical AQI features; outputs 24h/72h AQI grid forecasts; exposes alert threshold evaluation."),
      bullet("Enforcement Agent: Receives attribution output + emission source registry; ranks enforcement targets; generates evidence briefs."),
      bullet("Coordinator Agent (LLM-powered): Orchestrates agent calls, synthesises outputs, generates natural language summaries and multilingual citizen advisories via Claude or GPT-4o API."),
      divider(),

      h1("2. Technology Stack"),
      stackTable([
        ["Streaming Ingest", "Apache Kafka", "3.7", "Battle-tested; supports exactly-once semantics; native Kafka Connect for CAAQMS", "Confirmed"],
        ["Batch Processing", "Apache Spark", "3.5", "Native raster + geospatial processing; PySpark for Python ML pipeline", "Confirmed"],
        ["Data Transform", "dbt (Data Build Tool)", "1.8", "SQL-native transforms; lineage tracking; version-controlled data models", "Confirmed"],
        ["Primary Database", "PostgreSQL + PostGIS", "16 + 3.4", "Spatial queries (ST_Within, ST_Intersects); mature ecosystem; strong Python support", "Confirmed"],
        ["Time-Series DB", "TimescaleDB", "2.x", "PostgreSQL extension; hypertable compression; native AQI time-series aggregates", "Confirmed"],
        ["Object Storage", "AWS S3 / GCS", "N/A", "Bronze/Silver/Gold data lake; Delta Lake on top of Parquet files", "Confirmed"],
        ["ML Framework", "PyTorch + scikit-learn", "2.3 / 1.5", "PyTorch for deep spatiotemporal models (GNN/Transformer); sklearn for ensemble attribution", "Confirmed"],
        ["Geospatial AI", "GeoPandas + GDAL + Rasterio", "0.14 / 3.9 / 1.3", "Vector + raster geospatial processing; AOD ingest from MODIS HDF4", "Confirmed"],
        ["Dispersion Model", "AERMOD / HYSPLIT (NOAA)", "v24197", "Atmospheric dispersion modelling; EPA-approved AERMOD for source-receptor modelling", "Provisional"],
        ["ML Ops", "MLflow", "2.13", "Experiment tracking, model registry, versioned artifact storage", "Confirmed"],
        ["Container Orchestration", "Kubernetes (EKS/GKE)", "1.30", "Auto-scaling inference pods; resource isolation per agent", "Confirmed"],
        ["Task Queue", "Celery + Redis", "5.4 / 7.2", "Async ML task dispatch; Redis as both broker and cache layer", "Confirmed"],
        ["API Framework", "FastAPI", "0.111", "Async Python API; auto-generated OpenAPI docs; sub-10ms routing overhead", "Confirmed"],
        ["LLM API", "Anthropic Claude API", "claude-3-5-sonnet", "Multilingual advisory generation; agent coordination; structured output via tool use", "Confirmed"],
        ["Frontend", "Next.js 14", "14.2", "React server components; ISR for advisory pages; PWA for mobile web", "Confirmed"],
        ["Map Rendering", "MapLibre GL JS + PMTiles", "4.x / 0.21", "Open-source WebGL maps; PMTiles for serverless vector tile delivery", "Confirmed"],
        ["Mobile App", "React Native + Expo", "0.74", "Cross-platform iOS + Android; push via Expo Notifications / FCM", "Provisional"],
        ["IVR", "Exotel / Twilio", "N/A", "Regional language IVR; DTMF navigation; TTS for advisory delivery", "Provisional"],
        ["CI/CD", "GitHub Actions + ArgoCD", "N/A", "GitOps pipeline; automated test, build, and deploy to Kubernetes", "Confirmed"],
        ["Monitoring", "Prometheus + Grafana + OpenTelemetry", "N/A", "Metrics, traces, and logs; model performance dashboards; SLA alerting", "Confirmed"]
      ]),
      new Paragraph({ spacing: { before: 120 } }),
      divider(),

      h1("3. Third-Party API Integrations"),
      apiTable([
        ["CPCB CAAQMS API", "CPCB / Govt. of India", "Primary AQI sensor ingestion", "API Key (header)", "No stated limit; 85% uptime SLO"],
        ["Copernicus Sentinel Hub", "ESA / Sinergise", "Sentinel-2 imagery processing API", "OAuth 2.0", "300 processing units/month (free tier)"],
        ["NASA Earthdata API", "NASA EOSDIS", "MODIS AOD and fire products", "Bearer token", "Unlimited (academic); throttle 100 req/s"],
        ["IMD Forecast API", "India Met. Dept.", "6-hourly meteorological forecast grid", "API Key + MoU", "1000 req/day per key"],
        ["ECMWF CDS API", "ECMWF", "ERA5 historical reanalysis for model training", "API Key", "100k fields/day (free academic)"],
        ["Google Maps Traffic", "Google Cloud", "Real-time traffic congestion layer", "API Key (billable)", "~$5/1000 req; quota 100 QPS"],
        ["PARIVESH API", "MoEFCC / NIC", "Industrial consent-to-operate registry", "API Key + MoU", "1000 req/day"],
        ["Anthropic Claude API", "Anthropic", "Advisory generation, agent coordination", "API Key", "Tier-based; ~1000 req/min at Tier 2"],
        ["Firebase Cloud Messaging", "Google", "Mobile push notifications for advisories", "Service Account JWT", "600k messages/min (free)"],
        ["Exotel", "Exotel India", "IVR advisory delivery (regional languages)", "API Key + SID", "Concurrent call limit per plan"],
        ["MapBox / Bhuvan GIS", "MapBox / NRSC", "Base map tiles; India ward boundaries", "Access token", "50k tile loads/month (free)"]
      ]),
      new Paragraph({ spacing: { before: 120 } }),
      divider(),

      h1("4. AI and ML Technical Specifications"),
      h2("4.1 Attribution Model"),
      twoColTable(["Parameter", "Specification"], [
        ["Model Architecture", "Gradient-boosted ensemble (XGBoost) + Graph Neural Network (GNN) for spatial dependency"],
        ["Input Features", "Station AQI vector, AOD from MODIS, wind speed/dir, temp, humidity, land-use proportions, traffic density, time-of-day, day-of-week, seasonal index"],
        ["Output", "6-class source attribution vector (industry, vehicular, construction, waste burning, road dust, other) + confidence score per class"],
        ["Training Data", "CPCB 2022–2024 CAAQMS data cross-referenced with NAEI emission inventory and CPCB source apportionment studies"],
        ["Validation Metric", "Macro-F1 score; target ≥ 0.75 on held-out test set"],
        ["Inference Latency", "< 500ms per ward attribution; batch city run < 5 minutes"],
        ["Retraining Frequency", "Monthly automated retraining + triggered retrain when Macro-F1 drops below 0.65"]
      ], [3200, 6160]),
      new Paragraph({ spacing: { before: 120 } }),
      h2("4.2 Forecasting Model"),
      twoColTable(["Parameter", "Specification"], [
        ["Model Architecture", "Temporal Fusion Transformer (TFT) with static (land use) and dynamic (meteorological, traffic) covariates"],
        ["Input Features", "72h historical AQI, 72h meteorological forecast, traffic prediction, AOD trend, seasonal index, holiday calendar"],
        ["Output", "24h and 72h ahead PM2.5 concentration at 1km grid; uncertainty interval (10th/90th percentile)"],
        ["Grid Resolution", "1km x 1km grid interpolated from sparse monitoring stations via Kriging + TFT spatial attention"],
        ["Training Data", "CPCB 2020–2024; IMD ERA5 reanalysis; MODIS AOD time series"],
        ["Validation Metric", "RMSE against held-out CAAQMS stations; target ≥ 20% RMSE reduction vs. persistence baseline"],
        ["Inference Frequency", "Every 6 hours, aligned with IMD model runs; on-demand for alert threshold checks"]
      ], [3200, 6160]),
      new Paragraph({ spacing: { before: 120 } }),
      h2("4.3 LLM Advisory Generation"),
      twoColTable(["Parameter", "Specification"], [
        ["Model", "Anthropic Claude 3.5 Sonnet (claude-3-5-sonnet-20241022) via API"],
        ["Input Prompt", "Structured JSON: ward name, AQI index, dominant pollutant, source attribution, 24h forecast, vulnerable population presence, language code"],
        ["Output", "Structured JSON: advisory_headline (1 line), risk_category (Low/Moderate/High/Very High), recommended_actions (list), vulnerable_group_guidance, language_code"],
        ["Temperature", "0.3 (low temperature for factual, consistent advisories)"],
        ["Max Tokens", "500 per advisory; batch generation for all wards takes < 10 minutes at city scale"],
        ["Language Coverage", "English, Hindi, Kannada, Tamil, Bengali, Marathi; Telugu in Phase 2"],
        ["Quality Gate", "Automated back-translation check; human review queue for advisories with anomaly flag"]
      ], [3200, 6160]),
      new Paragraph({ spacing: { before: 120 } }),
      divider(),

      h1("5. Security Architecture"),
      h2("5.1 Authentication and Authorisation"),
      bullet("User authentication via OAuth 2.0 / OIDC with support for Google Workspace SSO (for government accounts) and username/password for citizen portal."),
      bullet("Role-Based Access Control (RBAC) with roles: Platform Admin, City Admin, SPCB Analyst, Field Inspector, Read-Only Viewer, Citizen."),
      bullet("API gateway enforces JWT validation on all requests; token TTL = 1 hour; refresh token TTL = 24 hours."),
      bullet("All LLM API calls proxied through internal gateway to prevent direct key exposure from frontend."),
      h2("5.2 Data Security"),
      bullet("All data at rest encrypted using AES-256; all data in transit encrypted with TLS 1.3."),
      bullet("PII in citizen advisory opt-in database (phone, location preference) stored in a dedicated PII-isolated schema; anonymised user ID used in advisory logs."),
      bullet("S3 bucket access restricted to IAM roles; no public bucket policies; VPC endpoint for intra-cloud traffic."),
      bullet("Enforcement action records and industrial violation data classified as Sensitive Government Data; access logged and audited."),
      h2("5.3 Compliance"),
      bullet("Platform compliant with Digital Personal Data Protection Act, 2023 (DPDPA) for all citizen data processing."),
      bullet("Data residency: all citizen PII and government enforcement records stored on India-region cloud infrastructure (AWS ap-south-1 / GCP asia-south1)."),
      divider(),

      h1("6. Infrastructure and Deployment"),
      h2("6.1 Cloud Architecture"),
      twoColTable(["Environment", "Infrastructure"], [
        ["Development", "Single-node K8s (kind or minikube); local Kafka via Docker Compose; PG + PostGIS in Docker"],
        ["Staging", "AWS EKS (2-node); RDS PostgreSQL; MSK Kafka; S3; 1x GPU node (g4dn.xlarge) for model inference"],
        ["Production", "AWS EKS (auto-scaling 3–10 nodes); RDS Multi-AZ; MSK Kafka (3-broker); S3 with lifecycle policies; 2x GPU nodes (g5.xlarge) for inference; CloudFront CDN for map tiles"],
        ["DR (Disaster Recovery)", "Cross-region S3 replication (ap-south-1 to ap-southeast-1); RDS automated backups; 4-hour RTO target"]
      ], [2800, 6560]),
      new Paragraph({ spacing: { before: 120 } }),
      h2("6.2 CI/CD Pipeline"),
      bullet("All code in GitHub; branch strategy: main (production), staging, feature/* branches."),
      bullet("GitHub Actions pipeline: lint (ruff, eslint) → unit tests (pytest, jest) → Docker build → push to ECR → ArgoCD sync to Kubernetes."),
      bullet("ML model deployment via MLflow Model Registry; A/B testing infrastructure for champion/challenger model evaluation."),
      bullet("Infrastructure as Code: Terraform for all AWS resources; Helm charts for Kubernetes workloads."),
      divider(),

      h1("7. Constraints and Technical Decisions"),
      h2("7.1 Technology Constraints"),
      bullet("AERMOD atmospheric dispersion model requires Linux runtime; containerised in a dedicated pod separate from Python ML stack."),
      bullet("MODIS HDF4 files require GDAL compiled with HDF4 support; base Docker image must include libhdf4-dev."),
      bullet("Sentinel Hub API processing unit quota limits real-time tile computation; pre-computed composites cached in S3 for dashboard delivery."),
      bullet("IMD GRIB2 ingestion requires cfgrib + eccodes native library; included in Spark worker Docker image."),
      h2("7.2 Architecture Decision Records (ADRs)"),
      bullet("ADR-001: FastAPI over Django REST Framework — chosen for async native support, sub-10ms routing overhead, and auto OpenAPI generation critical for mobile advisory delivery SLAs."),
      bullet("ADR-002: TimescaleDB over InfluxDB — chosen because TimescaleDB extends PostgreSQL, reusing existing PostGIS spatial query infrastructure and simplifying the operational footprint to a single database engine."),
      bullet("ADR-003: MapLibre GL JS over Google Maps — chosen to eliminate per-tile billing at city-scale deployment; PMTiles enables fully serverless tile delivery from S3."),
      bullet("ADR-004: Anthropic Claude API over self-hosted LLM — chosen for quality of regional language output, structured JSON tool use for advisory schema enforcement, and avoiding GPU overhead of hosting a multilingual LLM."),
      new Paragraph({ spacing: { before: 120 } })
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/home/claude/aq_docs/TRD_AirIQ.docx", buffer);
  console.log("TRD created successfully.");
});
