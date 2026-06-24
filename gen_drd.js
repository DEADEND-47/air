const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
  WidthType, ShadingType, PageNumber, PageBreak, TableOfContents
} = require('docx');
const fs = require('fs');

const BRAND = "1B4332";
const ACCENT = "2D6A4F";
const LIGHT_BG = "D8F3DC";
const TABLE_HEADER = "1B4332";
const TABLE_ROW_ALT = "F0FDF4";
const GRAY = "6B7280";
const RED = "991B1B";
const RED_BG = "FEE2E2";
const YELLOW = "92400E";
const YELLOW_BG = "FEF3C7";
const GREEN = "166534";
const GREEN_BG = "DCFCE7";

const border = { style: BorderStyle.SINGLE, size: 1, color: "D1FAE5" };
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
    children: [new TextRun({ text, bold: true, size: 24, color: "1A3D2B", font: "Arial" })] });
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
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "D1FAE5", space: 1 } },
    children: [new TextRun("")]  });
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

function dataSourceTable(rows) {
  const headers = ["Field", "Value"];
  const widths = [2800, 6560];
  const hRow = new TableRow({ children: headers.map((h, i) => new TableCell({
    borders, width: { size: widths[i], type: WidthType.DXA },
    shading: { fill: TABLE_HEADER, type: ShadingType.CLEAR },
    margins: { top: 100, bottom: 100, left: 150, right: 150 },
    children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 21, font: "Arial" })] })]
  })) });
  const dataRows = rows.map((row, ri) => new TableRow({ children: row.map((cell, ci) => new TableCell({
    borders, width: { size: widths[ci], type: WidthType.DXA },
    shading: { fill: ci === 0 ? "F0FDF4" : (ri % 2 === 0 ? "FFFFFF" : TABLE_ROW_ALT), type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 150, right: 150 },
    children: [new Paragraph({ children: [new TextRun({ text: cell, size: 20, font: "Arial", color: "1F2937", bold: ci === 0 })] })]
  })) }));
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: widths, rows: [hRow, ...dataRows] });
}

function schemaTable(rows) {
  const headers = ["Field Name", "Data Type", "Description", "Nullable"];
  const widths = [2200, 1600, 4360, 1200];
  const hRow = new TableRow({ children: headers.map((h, i) => new TableCell({
    borders, width: { size: widths[i], type: WidthType.DXA },
    shading: { fill: TABLE_HEADER, type: ShadingType.CLEAR },
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 20, font: "Arial" })] })]
  })) });
  const dataRows = rows.map((row, ri) => new TableRow({ children: row.map((cell, ci) => {
    const fill = ci === 3 ? (cell === "No" ? GREEN_BG : cell === "Yes" ? "FFFFFF" : "FFFFFF") : (ri % 2 === 0 ? "FFFFFF" : TABLE_ROW_ALT);
    const textCol = ci === 3 && cell === "No" ? GREEN : "1F2937";
    return new TableCell({
      borders, width: { size: widths[ci], type: WidthType.DXA },
      shading: { fill, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: cell, size: 19, font: "Arial", color: textCol })] })]
    });
  }) }));
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: widths, rows: [hRow, ...dataRows] });
}

function summaryTable(rows) {
  const headers = ["Data Source", "Category", "Refresh Rate", "Access Method", "Availability"];
  const widths = [2200, 1600, 1400, 2600, 1560];
  const hRow = new TableRow({ children: headers.map((h, i) => new TableCell({
    borders, width: { size: widths[i], type: WidthType.DXA },
    shading: { fill: TABLE_HEADER, type: ShadingType.CLEAR },
    margins: { top: 100, bottom: 100, left: 100, right: 100 },
    children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 19, font: "Arial" })] })]
  })) });
  const dataRows = rows.map((row, ri) => new TableRow({ children: row.map((cell, ci) => {
    const avail = ci === 4;
    const fill = avail ? (cell === "Public" ? GREEN_BG : cell === "MoU Required" ? YELLOW_BG : RED_BG) : (ri % 2 === 0 ? "FFFFFF" : TABLE_ROW_ALT);
    const textCol = avail ? (cell === "Public" ? GREEN : cell === "MoU Required" ? YELLOW : RED) : "1F2937";
    return new TableCell({
      borders, width: { size: widths[ci], type: WidthType.DXA },
      shading: { fill, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
      children: [new Paragraph({ children: [new TextRun({ text: cell, size: 19, font: "Arial", color: textCol, bold: avail })] })]
    });
  }) }));
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
        run: { size: 24, bold: true, font: "Arial", color: "1A3D2B" }, paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 } }
    ]
  },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BRAND, space: 1 } },
      spacing: { after: 120 },
      children: [new TextRun({ text: "AirIQ Platform", bold: true, color: BRAND, size: 20, font: "Arial" }),
                 new TextRun({ text: "   |   Data Requirements Document (DRD)", color: GRAY, size: 20, font: "Arial" })]
    })] }) },
    footers: { default: new Footer({ children: [new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: "D1FAE5", space: 1 } },
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
        children: [new TextRun({ text: "Data Requirements Document (DRD)", bold: true, size: 28, color: "374151", font: "Arial" })] }),
      colorBox([
        "Version: 1.0     |     Status: Draft for Data Engineering Review",
        "Date: June 2025     |     Classification: Confidential",
        "Owner: Data Engineering     |     Linked to: PRD v1.0, TRD v1.0"
      ], LIGHT_BG),
      pageBreak(),
      new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" }),
      pageBreak(),

      h1("1. Data Sources Summary"),
      para("The following table provides a consolidated overview of all data sources required by the AirIQ platform. Availability status indicates whether the source is publicly accessible, requires an MoU/data sharing agreement, or is commercially licensed."),
      new Paragraph({ spacing: { before: 120 } }),
      summaryTable([
        ["CPCB CAAQMS", "Air Quality Monitoring", "15 min (live)", "REST API / SFTP", "Public"],
        ["CPCB Historical AQI Archive", "Air Quality Monitoring", "Batch (daily)", "SFTP / Bulk Download", "Public"],
        ["Sentinel-2 (ESA Copernicus)", "Satellite Imagery", "5-day revisit", "Copernicus Open Hub API", "Public"],
        ["MODIS Terra/Aqua (NASA)", "Satellite Imagery", "Daily", "NASA Earthdata API", "Public"],
        ["IMD Meteorological Forecast", "Meteorological", "6-hourly", "IMD API (registered)", "MoU Required"],
        ["ECMWF ERA5 Reanalysis", "Meteorological", "Hourly (historical)", "Climate Data Store API", "Public"],
        ["FASTAG/Vehicle Mobility", "Traffic & Mobility", "Near real-time", "NHAI API (commercial)", "MoU Required"],
        ["Google Maps Traffic API", "Traffic & Mobility", "Real-time", "Google Cloud API", "Commercial License"],
        ["CPCB Emission Inventory (NAEI)", "Emission Inventory", "Annual (static)", "CPCB Data Portal", "Public"],
        ["Construction Permit Registry", "Land Use / Admin", "Daily sync", "Municipal Corp. API", "MoU Required"],
        ["Industrial Consent-to-Operate DB", "Emission Sources", "Monthly sync", "SPCB / MoEFCC API", "MoU Required"],
        ["Urban Land Use Maps (NRSC)", "Geospatial", "Annual (static)", "Bhuvan GIS API", "Public"],
        ["Population Vulnerability Index", "Public Health", "Annual (static)", "Census / HMIS bulk", "Public"],
        ["Hospital & School Registry", "Public Health", "Quarterly sync", "State Health Dept. API", "MoU Required"]
      ]),
      new Paragraph({ spacing: { before: 120 } }),
      divider(),

      h1("2. DS-01: CPCB CAAQMS Real-Time Feed"),
      h2("2.1 Source Profile"),
      dataSourceTable([
        ["Source Name", "CPCB Continuous Ambient Air Quality Monitoring Stations (CAAQMS)"],
        ["Provider", "Central Pollution Control Board (CPCB), Government of India"],
        ["Coverage", "900+ stations across India; Phase 1 targets 50+ stations across Delhi, Mumbai, Bengaluru"],
        ["Data Format", "JSON over REST API; backup SFTP CSV dumps"],
        ["Refresh Rate", "Every 15 minutes (live feed); hourly aggregates available"],
        ["Historical Depth", "Minimum 2 years; some stations up to 5 years"],
        ["Access Method", "CPCB Open Data API (https://airquality.cpcb.gov.in/); API key required"],
        ["Availability", "Public (API key registration required)"],
        ["Licence", "Government Open Data Licence (GODL-India)"],
        ["SLA", "No formal SLA; 85–90% uptime observed historically; gaps filled via interpolation"]
      ]),
      new Paragraph({ spacing: { before: 120 } }),
      h2("2.2 Schema"),
      schemaTable([
        ["station_id", "VARCHAR(20)", "Unique CPCB station identifier", "No"],
        ["station_name", "TEXT", "Human-readable station name", "No"],
        ["city", "VARCHAR(100)", "City where station is located", "No"],
        ["state", "VARCHAR(100)", "State where station is located", "No"],
        ["latitude", "DECIMAL(9,6)", "Station GPS latitude", "No"],
        ["longitude", "DECIMAL(9,6)", "Station GPS longitude", "No"],
        ["timestamp_ist", "TIMESTAMPTZ", "Observation timestamp in IST (UTC+5:30)", "No"],
        ["pm25_ugm3", "FLOAT", "PM2.5 concentration in micrograms per cubic metre", "Yes"],
        ["pm10_ugm3", "FLOAT", "PM10 concentration in micrograms per cubic metre", "Yes"],
        ["no2_ugm3", "FLOAT", "Nitrogen dioxide concentration", "Yes"],
        ["so2_ugm3", "FLOAT", "Sulphur dioxide concentration", "Yes"],
        ["co_mgm3", "FLOAT", "Carbon monoxide in milligrams per cubic metre", "Yes"],
        ["o3_ugm3", "FLOAT", "Ozone concentration", "Yes"],
        ["nh3_ugm3", "FLOAT", "Ammonia concentration", "Yes"],
        ["aqi_index", "INTEGER", "Computed National AQI (0–500)", "Yes"],
        ["aqi_category", "VARCHAR(20)", "Good / Satisfactory / Moderate / Poor / Very Poor / Severe", "Yes"],
        ["data_quality_flag", "VARCHAR(10)", "Valid / Suspect / Missing", "No"]
      ]),
      new Paragraph({ spacing: { before: 120 } }),
      h2("2.3 Data Quality Rules"),
      bullet("PM2.5 values outside 0–999 ug/m3 are flagged as suspect and excluded from model input."),
      bullet("Stations with data_quality_flag = 'Missing' for more than 4 consecutive hours trigger gap-fill interpolation from nearest 3 stations."),
      bullet("Data completeness target: ≥ 95% of 15-minute slots populated per station per day."),
      divider(),

      h1("3. DS-02: Sentinel-2 and MODIS Satellite Imagery"),
      h2("3.1 Source Profile"),
      dataSourceTable([
        ["Source Name", "Sentinel-2 MSI (ESA Copernicus) + MODIS Terra/Aqua (NASA)"],
        ["Provider", "European Space Agency (Copernicus) + NASA Earthdata"],
        ["Coverage", "Sentinel-2: 10m resolution, 5-day revisit. MODIS: 250m-1km, daily global"],
        ["Data Format", "GeoTIFF (Sentinel-2 L2A); HDF4/HDF5 (MODIS); NetCDF (processed products)"],
        ["Refresh Rate", "Sentinel-2: per overpass (5 days); MODIS MAIAC AOD: daily"],
        ["Access Method", "Copernicus Browser API / Sentinel Hub API (commercial); NASA Earthdata REST API"],
        ["Key Products", "Sentinel-2: True colour, NDVI, dust index. MODIS: AOD (MCD19A2), Fire Radiative Power (MOD14), Thermal Anomalies"],
        ["Licence", "Copernicus: Open Access (free). NASA Earthdata: Free."],
        ["Preprocessing Required", "Yes: cloud masking, atmospheric correction (Sentinel); temporal compositing (MODIS)"]
      ]),
      new Paragraph({ spacing: { before: 120 } }),
      h2("3.2 Key Derived Products Schema"),
      schemaTable([
        ["tile_id", "VARCHAR(20)", "Sentinel-2 MGRS tile identifier (e.g., 44QKF)", "No"],
        ["date", "DATE", "Acquisition date", "No"],
        ["grid_lat", "DECIMAL(9,6)", "Centre latitude of 1km grid cell", "No"],
        ["grid_lon", "DECIMAL(9,6)", "Centre longitude of 1km grid cell", "No"],
        ["aod_550nm", "FLOAT", "Aerosol Optical Depth at 550nm (MODIS MAIAC)", "Yes"],
        ["fire_radiative_power_mw", "FLOAT", "Fire radiative power in megawatts (MODIS MOD14)", "Yes"],
        ["ndvi", "FLOAT", "Normalised Difference Vegetation Index (Sentinel-2)", "Yes"],
        ["thermal_anomaly_flag", "BOOLEAN", "True if MODIS detected thermal anomaly in cell", "No"],
        ["cloud_coverage_pct", "FLOAT", "Percentage cloud coverage in cell (0–100)", "No"],
        ["data_usable", "BOOLEAN", "False if cloud coverage > 70%", "No"]
      ]),
      new Paragraph({ spacing: { before: 120 } }),
      divider(),

      h1("4. DS-03: IMD Meteorological Forecast Data"),
      h2("4.1 Source Profile"),
      dataSourceTable([
        ["Source Name", "India Meteorological Department (IMD) Forecast Grid"],
        ["Provider", "IMD, Ministry of Earth Sciences, Government of India"],
        ["Coverage", "0.25 degree grid across India; city-level point forecasts for 100+ cities"],
        ["Data Format", "GRIB2 / NetCDF for grid; JSON for point API"],
        ["Refresh Rate", "4 model runs per day (00Z, 06Z, 12Z, 18Z UTC); 6-hourly updates"],
        ["Forecast Horizon", "Up to 10 days; AirIQ uses 72-hour window"],
        ["Access Method", "IMD API Gateway (registration required); academic/govt. access has relaxed limits"],
        ["Availability", "MoU required for operational forecast grid; point forecasts publicly available"],
        ["Key Variables", "Wind speed & direction (925/850/700 hPa), temperature, relative humidity, precipitation probability, boundary layer height"]
      ]),
      new Paragraph({ spacing: { before: 120 } }),
      h2("4.2 Schema"),
      schemaTable([
        ["forecast_run_utc", "TIMESTAMPTZ", "Timestamp of model initialisation run", "No"],
        ["valid_time_utc", "TIMESTAMPTZ", "Valid time for forecast step", "No"],
        ["lat", "DECIMAL(7,4)", "Grid point latitude", "No"],
        ["lon", "DECIMAL(7,4)", "Grid point longitude", "No"],
        ["wind_speed_ms", "FLOAT", "Wind speed in m/s at 10m height", "No"],
        ["wind_dir_deg", "FLOAT", "Wind direction in degrees from North", "No"],
        ["temp_celsius", "FLOAT", "Air temperature at 2m in Celsius", "No"],
        ["rh_pct", "FLOAT", "Relative humidity at 2m in %", "No"],
        ["precip_mm", "FLOAT", "Accumulated precipitation forecast in mm", "No"],
        ["pbl_height_m", "FLOAT", "Planetary Boundary Layer height in metres", "No"],
        ["visibility_m", "FLOAT", "Forecast visibility in metres", "Yes"],
        ["forecast_horizon_h", "INTEGER", "Hours from model run to valid time (1–72)", "No"]
      ]),
      new Paragraph({ spacing: { before: 120 } }),
      divider(),

      h1("5. DS-04: Emission Source Registries"),
      h2("5.1 Industrial Emission Source Registry"),
      dataSourceTable([
        ["Source Name", "State Pollution Control Board Consent-to-Operate Registry"],
        ["Provider", "Respective SPCBs (TNPCB, MPCB, KSPCB, DPCC) + MoEFCC PARIVESH portal"],
        ["Coverage", "Large, medium, and small industries with red/orange categorisation; all cities"],
        ["Data Format", "REST API (PARIVESH portal); CSV exports from SPCB portals"],
        ["Refresh Rate", "Monthly sync for new consents; real-time violation events via OCEMS API (where deployed)"],
        ["Access Method", "PARIVESH API (https://parivesh.nic.in/); SPCB data sharing MoU for detailed records"],
        ["Key Fields", "Industry name, category (red/orange/green), location, consent expiry, stack emission limits, OCEMS status"],
        ["Availability", "MoU Required (SPCB)"]
      ]),
      new Paragraph({ spacing: { before: 120 } }),
      h2("5.2 Construction Permit Registry Schema"),
      schemaTable([
        ["permit_id", "VARCHAR(30)", "Unique construction permit number", "No"],
        ["project_name", "TEXT", "Name of construction project", "Yes"],
        ["lat", "DECIMAL(9,6)", "Project site latitude", "No"],
        ["lon", "DECIMAL(9,6)", "Project site longitude", "No"],
        ["ward_id", "VARCHAR(20)", "Ward or zone identifier", "No"],
        ["permit_issue_date", "DATE", "Date permit was issued", "No"],
        ["permit_expiry_date", "DATE", "Permit expiry date", "Yes"],
        ["project_area_sqm", "FLOAT", "Construction area in square metres", "Yes"],
        ["permit_status", "VARCHAR(20)", "Active / Expired / Suspended", "No"],
        ["dust_mitigation_compliance", "BOOLEAN", "Whether dust mitigation plan submitted", "Yes"],
        ["last_inspection_date", "DATE", "Date of most recent enforcement inspection", "Yes"]
      ]),
      new Paragraph({ spacing: { before: 120 } }),
      divider(),

      h1("6. DS-05: Geospatial and Land Use Layers"),
      h2("6.1 Source Profile"),
      dataSourceTable([
        ["Source Name", "NRSC Land Use Land Cover (LULC) 2023 + OpenStreetMap Urban Fabric"],
        ["Provider", "National Remote Sensing Centre (ISRO) + OpenStreetMap Foundation"],
        ["Coverage", "Pan-India at 30m resolution (NRSC); city-level OSM for road network and POI"],
        ["Data Format", "GeoTIFF raster (LULC); GeoJSON / Shapefile (OSM)"],
        ["Refresh Rate", "Annual update (LULC); daily OSM diff updates"],
        ["Access Method", "Bhuvan GIS API (NRSC); Overpass API (OSM); no authentication required"],
        ["Key Layers", "Industrial zones, residential, green cover, water bodies, road network, ward boundaries, hospital locations, school locations"],
        ["Availability", "Public"]
      ]),
      new Paragraph({ spacing: { before: 120 } }),
      h2("6.2 Ward Boundary Schema"),
      schemaTable([
        ["ward_id", "VARCHAR(20)", "Unique ward identifier (city code + ward number)", "No"],
        ["ward_name", "TEXT", "Official ward name", "No"],
        ["city_id", "VARCHAR(10)", "Parent city identifier", "No"],
        ["geometry", "GEOMETRY (Polygon)", "PostGIS polygon geometry of ward boundary (EPSG:4326)", "No"],
        ["area_sqkm", "FLOAT", "Ward area in square kilometres", "No"],
        ["population_2021", "INTEGER", "Resident population (Census 2021 projection)", "Yes"],
        ["lulc_industry_pct", "FLOAT", "Percentage of ward area classified as industrial", "No"],
        ["lulc_green_pct", "FLOAT", "Percentage of ward area with green cover", "No"],
        ["road_density_km_sqkm", "FLOAT", "Total road length per square kilometre", "No"],
        ["active_construction_count", "INTEGER", "Count of active permitted construction sites", "Yes"]
      ]),
      new Paragraph({ spacing: { before: 120 } }),
      divider(),

      h1("7. DS-06: Traffic and Mobility Data"),
      dataSourceTable([
        ["Source Name", "Google Maps Platform Traffic API + FASTAG Vehicle Count Data (NHAI)"],
        ["Provider", "Google Cloud (commercial) + National Highways Authority of India"],
        ["Coverage", "Google Traffic: city road network, near real-time. FASTAG: national highway toll points"],
        ["Data Format", "JSON API response (Google); CSV / SFTP (FASTAG)"],
        ["Refresh Rate", "Google Traffic: every 2 minutes. FASTAG: daily aggregates"],
        ["Access Method", "Google Maps Platform API key (billable); FASTAG data via NHAI MoU"],
        ["Key Metrics", "Congestion speed ratio, vehicle count by category, average speed by road segment"],
        ["Availability", "Google: Commercial License; FASTAG: MoU Required"]
      ]),
      new Paragraph({ spacing: { before: 120 } }),
      divider(),

      h1("8. Data Pipeline Architecture Overview"),
      para("All data sources feed into a centralised Ingestion Layer before entering the AirIQ processing stack:"),
      bullet("Ingestion Layer: Apache Kafka topics per source type; message schema validated against JSON Schema v7 before topic admission."),
      bullet("Raw Zone (Bronze): All ingested data stored as-is in object storage (S3 / GCS) partitioned by source / year / month / day."),
      bullet("Cleansed Zone (Silver): Standardised schema, deduplication, outlier flagging, gap-filled interpolation applied. Stored in Delta Lake format."),
      bullet("Feature Zone (Gold): Spatially joined, aggregated, and model-ready features stored in PostGIS + TimescaleDB for time-series queries."),
      bullet("Serving Layer: FastAPI endpoints and pre-computed tile cache (PMTiles) for dashboard consumption."),
      divider(),

      h1("9. Data Retention and Archival Policy"),
      new Table({
        width: { size: 9360, type: WidthType.DXA }, columnWidths: [2800, 2200, 2200, 2160],
        rows: [
          new TableRow({ children: ["Data Tier", "Retention (Hot)", "Retention (Warm)", "Archival"].map((h, i) => new TableCell({
            borders, width: { size: [2800, 2200, 2200, 2160][i], type: WidthType.DXA },
            shading: { fill: TABLE_HEADER, type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 21, font: "Arial" })] })]
          })) }),
          ...[
            ["CAAQMS 15-min readings", "90 days (TimescaleDB)", "2 years (S3)", "7 years (Glacier)"],
            ["Satellite derived products", "30 days (PostGIS)", "1 year (S3)", "5 years (Glacier)"],
            ["Attribution records", "180 days (PostgreSQL)", "3 years (S3)", "10 years (Glacier)"],
            ["Forecast outputs", "30 days (Redis + DB)", "1 year (S3)", "5 years (Glacier)"],
            ["Enforcement actions", "Indefinite (PostgreSQL)", "Indefinite", "Indefinite (compliance)"],
            ["Citizen advisory logs", "90 days (PostgreSQL)", "2 years (S3)", "5 years (Glacier)"]
          ].map((row, ri) => new TableRow({ children: row.map((cell, ci) => new TableCell({
            borders, width: { size: [2800, 2200, 2200, 2160][ci], type: WidthType.DXA },
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
  fs.writeFileSync("/home/claude/aq_docs/DRD_AirIQ.docx", buffer);
  console.log("DRD created successfully.");
});
