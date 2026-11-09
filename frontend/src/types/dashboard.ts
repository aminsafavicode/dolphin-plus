export interface TaskItem {
  id: string;
  trackingCode: string;
  workflowName: string;
  customerName: string;
  deviceModel: string;
  currentStep: string;
  assignee: string;
  status: 'active' | 'pending_handoff' | 'completed' | 'breached';
  slaDue: string;
  slaPercent: number; // 0-100
  createdAt: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export interface MetricCardData {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  period: string;
  iconName: string;
  color: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  user: string;
  time: string;
  type: 'handoff' | 'create' | 'complete' | 'backup';
}
