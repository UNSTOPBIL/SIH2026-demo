export interface OCRDetail {
  text: string;
  confidence: number;
  box: number[][]; // [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
}

export interface CardFontCompliance {
  detected_height_mm: number;
  detected_width_mm?: number;
  min_required_mm: number;
  is_font_compliant: boolean;
  note: string;
}

export interface RuleCard {
  id?: string;
  rule_id?: string;
  label?: string;
  name?: string;
  rule_ref?: string;
  section?: string;
  required: boolean;
  passed?: boolean;
  status: "PASS" | "FAIL" | "WARN" | "WARNING" | "OPTIONAL";
  actual_status?: string;
  snippet?: string | null;
  extracted_value?: string | null;
  pattern_used?: string;
  statutory_basis?: string;
  description?: string;
  failure_penalty?: string;
  matched_pattern_idx?: number;
  font_compliance?: CardFontCompliance;
  remediated?: boolean;
}

export interface AuditSummary {
  required_total: number;
  required_passed: number;
  required_failed: number;
  total_rules: number;
  total_passed: number;
  passed_count?: number;
  violation_count?: number;
  review_count?: number;
  not_applicable_count?: number;
  score_percentage?: number;
}

export interface FontMeasurement {
  card_id: string;
  label: string;
  detected_height_mm: number;
  detected_width_mm?: number;
  min_required_mm: number;
  is_font_compliant: boolean;
  note: string;
}

export interface FontComplianceSummary {
  package_width_mm: number;
  scale_px_to_mm: number;
  statutory_schedule: string;
  all_fonts_compliant: boolean;
  measurements: FontMeasurement[];
}

export interface GpsLocation {
  name: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number;
}

export interface EvidenceVault {
  audit_id: string;
  inspector_id: string;
  timestamp_utc: string;
  gps_location: GpsLocation;
  image_sha256: string;
  digital_hmac_signature: string;
  tamper_proof_status: string;
  qr_verification_url: string;
  statutory_defense_statement: string;
}

export interface PastViolation {
  date: string;
  rule: string;
  penalty: string;
}

export interface RepeatOffenderStatus {
  entity_name: string;
  company_name?: string;
  offense_count: number;
  is_repeat_offender: boolean;
  risk_tier: "CLEAN" | "STANDARD" | "CRITICAL";
  past_violations: PastViolation[];
  statutory_action: string;
  legal_provision?: string;
}

export interface RemediationFix {
  field_id: string;
  label: string;
  rule_ref: string;
  action: string;
  injected_text: string;
}

export interface RemediationData {
  remediated_image_base64: string;
  fixes_applied: RemediationFix[];
  original_violations_count: number;
  remediated_score_percentage: number;
  remediated_cards: RuleCard[];
  statutory_compliance_badge: string;
}

export interface ScanResponse {
  preset_id?: string;
  filename?: string;
  source?: string;
  label_name?: string;
  latency_seconds: number;
  image_data_url: string;
  dimensions: {
    width: number;
    height: number;
  };
  ocr_line_count: number;
  ocr_lines: string[];
  ocr_details: OCRDetail[];
  ocr_tokens?: any[];
  is_compliant: boolean;
  score_percentage: number;
  verdict_state?: string;
  summary: AuditSummary;
  findings?: any[];
  id?: string;
  cards: RuleCard[];
  font_compliance?: FontComplianceSummary;
  placement_compliance?: any;
  contrast_compliance?: any;
  evidence_vault?: EvidenceVault;
  repeat_offender?: RepeatOffenderStatus;
  remediation?: RemediationData;
}

export interface StatutoryRuleDefinition {
  id: string;
  name: string;
  section: string;
  mandatory: boolean;
  primary_regex: string;
  fallback_regex?: string;
  legal_mandate: string;
}

export interface GalleryPackage {
  id: string;
  filename: string;
  brand: string;
  product_name: string;
  category: string;
  expected_verdict: string;
  has_unprinted_box?: boolean;
  is_stamped?: boolean;
  image_url: string;
}

