import { Card, Col, Row, Statistic } from 'antd';
import type { KPI } from '@/types/dashboard';

type Props = { kpi: Partial<KPI> };

export default function KpiCards({ kpi }: Props) {
  return (
    <Row gutter={16} style={{ marginBottom: 16 }}>
      <Col span={6}><Card><Statistic title="期间收入(¥)" value={Number(kpi.income || 0).toFixed(2)} /></Card></Col>
      <Col span={6}><Card><Statistic title="订单数" value={kpi.ordersCount || 0} /></Card></Col>
      <Col span={6}><Card><Statistic title="平均客单(¥)" value={Number(kpi.avgTicket || 0).toFixed(2)} /></Card></Col>
      <Col span={6}><Card><Statistic title="当前欠费(¥)" value={Number(kpi.debtTotal || 0).toFixed(2)} valueStyle={{ color: (kpi.debtTotal || 0) > 0 ? '#cf1322' : undefined }} /></Card></Col>
    </Row>
  );
}
