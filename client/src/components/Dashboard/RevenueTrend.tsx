import { Card } from 'antd';
import { Line } from '@ant-design/plots';
import type { TimeseriesPoint } from '@/types/dashboard';

type Props = { title?: string; data: TimeseriesPoint[]; height?: number };

export default function RevenueTrend({ title = '收入趋势', data, height = 240 }: Props) {
  return (
    <Card title={title} bordered={false} bodyStyle={{ paddingBottom: 8 }}>
      <Line data={data} xField="date" yField="amount" point={{ size: 3 }} smooth height={height} />
    </Card>
  );
}
