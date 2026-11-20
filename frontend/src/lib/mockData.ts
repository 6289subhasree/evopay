import type {
  AnalyticsData,
  Attack,
  AuditEvent,
  DashboardData,
  Incident,
  Investigation,
  ModelVersion,
  NetworkData,
  RiskAnalysis,
  Simulation,
  ThreatPattern,
  Transaction,
  User,
} from './api'

export const mockUser: User = {
  id: 'usr-analyst-1',
  email: 'analyst@evopay.ai',
  display_name: 'Security Analyst',
}

export const mockTransactions: Transaction[] = [
  { id: 'TXN-84921', customer_id: 'C-A81F', merchant_id: 'M-M921', amount: 12840, location: 'Kolkata', payment_method: 'UPI', risk_score: 94, status: 'BLOCKED', device_id: 'D-X28', created_at: '2026-08-26T16:42:09Z', synthetic: true },
  { id: 'TXN-84920', customer_id: 'C-C44B', merchant_id: 'M-M104', amount: 2499, location: 'Mumbai', payment_method: 'Card', risk_score: 71, status: 'VERIFY', device_id: 'D-Q41', created_at: '2026-08-26T16:42:04Z', synthetic: true },
  { id: 'TXN-84919', customer_id: 'C-D90E', merchant_id: 'M-M772', amount: 48200, location: 'Delhi', payment_method: 'Net Banking', risk_score: 89, status: 'BLOCKED', device_id: 'D-X28', created_at: '2026-08-26T16:41:58Z', synthetic: true },
  { id: 'TXN-84918', customer_id: 'C-F302', merchant_id: 'M-M318', amount: 1280, location: 'Bengaluru', payment_method: 'Wallet', risk_score: 22, status: 'ALLOWED', device_id: 'D-P07', created_at: '2026-08-26T16:41:50Z', synthetic: true },
  { id: 'TXN-84917', customer_id: 'C-B73C', merchant_id: 'M-M442', amount: 8750, location: 'Hyderabad', payment_method: 'UPI', risk_score: 64, status: 'HOLD', device_id: 'D-Q41', created_at: '2026-08-26T16:41:39Z', synthetic: true },
  { id: 'TXN-84916', customer_id: 'C-E51A', merchant_id: 'M-M104', amount: 3450, location: 'Pune', payment_method: 'Card', risk_score: 18, status: 'ALLOWED', device_id: 'D-P07', created_at: '2026-08-26T16:38:15Z', synthetic: true },
]

export const mockIncidents: Incident[] = [
  { id: 'INC-204', title: 'Coordinated mule network', severity: 'CRITICAL', status: 'OPEN', created_at: '2026-08-26T16:38:00Z', transaction_id: 'TXN-84921', risk_score: 94, reasons: ['High transaction velocity', 'Connected to high-risk network cluster'], synthetic: true },
  { id: 'INC-203', title: 'Device reuse pattern', severity: 'HIGH', status: 'INVESTIGATING', created_at: '2026-08-26T16:21:00Z', transaction_id: 'TXN-84919', risk_score: 89, reasons: ['Device linked to multiple accounts'], synthetic: true },
  { id: 'INC-202', title: 'Velocity burst anomaly', severity: 'MEDIUM', status: 'RESOLVED', created_at: '2026-08-26T15:45:00Z', transaction_id: 'TXN-84917', risk_score: 64, reasons: ['Rapid successive transactions in 60s'], synthetic: true },
]

export const mockAttacks: Attack[] = [
  { id: 'EV-0418', name: 'Velocity Attack', severity: 'CRITICAL', status: 'CONTAINED', accounts: 14, devices: 5, merchants: 8, transactions: 921, created_at: '2026-08-26T16:40:00Z', attack_type: 'velocity_attack', attack_score: 78, detection_score: 61, evasion_success: false, generation: 1, synthetic: true },
  { id: 'EV-0417', name: 'Behavioral Mimicry', severity: 'MEDIUM', status: 'EVALUATED', accounts: 8, devices: 3, merchants: 4, transactions: 318, created_at: '2026-08-26T16:24:00Z', attack_type: 'behavioral_mimicry', attack_score: 86, detection_score: 39, evasion_success: true, generation: 1, synthetic: true },
]

export const mockDashboardData: DashboardData = {
  metrics: {
    transactions_monitored: 921,
    active_threats: 2,
    attacks_simulated: 14,
    mean_detection_score: 74,
    false_positive_rate: 0.021,
    average_detection_time: 142,
  },
  transactions: mockTransactions,
  incidents: mockIncidents,
}

export const mockNetworkData: NetworkData = {
  nodes: [
    { id: 'C-A81F', name: 'Customer #A81F', city: 'Kolkata', type: 'Customer' },
    { id: 'M-M921', name: 'Merchant #M921', city: 'Kolkata', type: 'Merchant' },
    { id: 'D-X28', name: 'Device #X28 (Android)', city: 'Kolkata', type: 'Device' },
    { id: 'C-D90E', name: 'Customer #D90E', city: 'Delhi', type: 'Customer' },
    { id: 'M-M772', name: 'Merchant #M772', city: 'Delhi', type: 'Merchant' },
    { id: 'C-C44B', name: 'Customer #C44B', city: 'Mumbai', type: 'Customer' },
    { id: 'M-M104', name: 'Merchant #M104', city: 'Mumbai', type: 'Merchant' },
    { id: 'D-Q41', name: 'Device #Q41 (iOS)', city: 'Mumbai', type: 'Device' },
  ],
  relationships: [
    { from: 'C-A81F', to: 'M-M921', type: 'TRANSACTED_WITH' },
    { from: 'C-A81F', to: 'D-X28', type: 'USED_DEVICE' },
    { from: 'C-D90E', to: 'D-X28', type: 'SHARED_DEVICE' },
    { from: 'C-D90E', to: 'M-M772', type: 'TRANSACTED_WITH' },
    { from: 'C-C44B', to: 'D-Q41', type: 'USED_DEVICE' },
    { from: 'C-C44B', to: 'M-M104', type: 'TRANSACTED_WITH' },
  ],
}

export const mockAnalyticsData: AnalyticsData = {
  mean_detection_score: 74.2,
  false_positive_rate: 0.021,
  average_response_time: 142,
  daily_events: [
    { day: 'Mon', count: 120 },
    { day: 'Tue', count: 184 },
    { day: 'Wed', count: 241 },
    { day: 'Thu', count: 198 },
    { day: 'Fri', count: 310 },
    { day: 'Sat', count: 280 },
    { day: 'Sun', count: 345 },
  ],
  model_version: 'v1.4-adaptive',
}

export const mockThreatPatterns: ThreatPattern[] = [
  { id: 1, name: 'Velocity burst', description: 'Rapid authorizations across a shared device cluster', severity: 'HIGH' },
  { id: 2, name: 'Mule convergence', description: 'Multiple customers converging on one merchant relationship', severity: 'CRITICAL' },
  { id: 3, name: 'Behavioral mimicry', description: 'Transactions closely matching legitimate user distributions', severity: 'MEDIUM' },
]

export const mockModelVersions: ModelVersion[] = [
  { id: 1, version: 'v1.0', training_samples: 80000, precision: 0.9945, recall: 0.9978, f1: 0.9962, created_at: '2026-08-26T16:00:00Z' },
  { id: 2, version: 'v1.1-adaptive', training_samples: 92000, precision: 0.9961, recall: 0.9984, f1: 0.9972, created_at: '2026-08-26T17:30:00Z' },
]

export const mockAuditEvents: AuditEvent[] = [
  { id: 1, event_type: 'ATTACK_GENERATED', entity_id: 'EV-0418', details: '{"attack_type": "velocity_attack"}', created_at: '2026-08-26T16:40:00Z' },
  { id: 2, event_type: 'RISK_DECISION', entity_id: 'TXN-84921', details: '{"decision": "BLOCKED", "score": 94}', created_at: '2026-08-26T16:42:09Z' },
  { id: 3, event_type: 'INCIDENT_CREATED', entity_id: 'INC-204', details: '{"severity": "CRITICAL"}', created_at: '2026-08-26T16:42:10Z' },
]

export function getMockRiskAnalysis(id: string): RiskAnalysis {
  const txn = mockTransactions.find((item) => item.id === id) ?? mockTransactions[0]
  return {
    risk_score: txn.risk_score,
    classification: txn.status === 'BLOCKED' ? 'CRITICAL_RISK' : txn.status === 'ALLOWED' ? 'LOW_RISK' : 'EVALUATED_RISK',
    signals: {
      velocity_anomaly: txn.risk_score > 70,
      device_reused: txn.device_id === 'D-X28',
      high_amount: txn.amount > 10000,
      synthetic_profile: true,
    },
    reasons: txn.risk_score > 70 ? ['Rapid authorization burst detected', 'Device linked to previous high-risk cluster'] : ['Behavior consistent with baseline profile'],
    recommended_action: txn.status,
  }
}

export function getMockInvestigation(id: string): Investigation {
  const txn = mockTransactions.find((item) => item.id === id) ?? mockTransactions[0]
  return {
    finding: `Comprehensive risk assessment for transaction ${txn.id}`,
    evidence: [
      `Device ${txn.device_id} observed across multiple customer identifiers`,
      `Amount ₹${txn.amount.toLocaleString()} is 3.4x higher than location baseline (${txn.location})`,
      'Deterministic graph traversal identifies 2-hop connection to flagged cluster',
    ],
    risk: txn.risk_score > 70 ? 'CRITICAL' : 'MODERATE',
    attack_type: txn.risk_score > 80 ? 'Coordinated Mule Network' : 'Behavioral Anomaly',
    recommended_action: txn.status === 'BLOCKED' ? 'BLOCK_AND_ISOLATE' : 'STEP_UP_VERIFICATION',
    risk_score: txn.risk_score,
    signals: {
      device_multi_homed: true,
      velocity_score: 88,
      location_entropy: 0.72,
    },
    analysis_mode: 'deterministic-heuristic-ml-ensemble',
  }
}
