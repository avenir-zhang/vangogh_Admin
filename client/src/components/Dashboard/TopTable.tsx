import { Card, Table } from 'antd';

type Props = {
  title: string;
  data: any[];
  type: 'teacher' | 'subject';
};

export default function TopTable({ title, data, type }: Props) {
  const columns =
    type === 'teacher'
      ? [
          { title: '教师', dataIndex: 'teacherName' },
          { title: '收入(¥)', dataIndex: 'income', render: (v: any) => Number(v).toFixed(2) },
        ]
      : [
          { title: '科目', dataIndex: 'subjectName' },
          { title: '收入(¥)', dataIndex: 'income', render: (v: any) => Number(v).toFixed(2) },
        ];
  const rowKey = type === 'teacher' ? 'teacherName' : 'subjectName';
  return (
    <Card title={title} bordered={false}>
      <Table rowKey={rowKey} pagination={false} dataSource={data} columns={columns as any} />
    </Card>
  );
}
