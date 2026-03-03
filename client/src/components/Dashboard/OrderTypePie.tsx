import { Card } from 'antd';
import { Pie } from '@ant-design/plots';

type Item = { type: string; value: number };
type Props = { title?: string; data: Item[]; height?: number };

export default function OrderTypePie({ title = '订单类型分布', data, height = 240 }: Props) {
  return (
    <Card title={title} bordered={false} bodyStyle={{ paddingBottom: 8 }}>
      <Pie data={data} angleField="value" colorField="type" height={height} legend={false} label={{ type: 'outer' }} />
    </Card>
  );
}
