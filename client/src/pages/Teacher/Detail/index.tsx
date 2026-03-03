import React, { useEffect, useMemo, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Descriptions, DatePicker, Table, Statistic, Row, Col, Button, message, Tabs, Empty } from 'antd';
import { useParams, history, request } from '@umijs/max';
import dayjs, { Dayjs } from 'dayjs';

type RecordItem = {
  id: number;
  attendanceDate: string;
  hoursDeducted: number;
  status: string;
  courseName?: string;
  subjectName?: string;
};

const TeacherDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [teacher, setTeacher] = useState<any>(null);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [totalHours, setTotalHours] = useState<number>(0);
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [loading, setLoading] = useState(false);

  const columns = useMemo(() => ([
    { title: '日期', dataIndex: 'attendanceDate', render: (v: string) => dayjs(v).format('YYYY-MM-DD') },
    { title: '课程', dataIndex: 'courseName' },
    { title: '科目', dataIndex: 'subjectName' },
    {
      title: '状态',
      dataIndex: 'status',
      filters: [
        { text: '出勤', value: 'present' },
        { text: '缺勤', value: 'absent' },
        { text: '迟到', value: 'late' },
        { text: '请假', value: 'leave' },
      ],
      onFilter: (value: any, record: RecordItem) => record.status === value,
      render: (v: string) => ({
        present: '出勤',
        absent: '缺勤',
        late: '迟到',
        leave: '请假',
      } as any)[v] || v,
    },
    { title: '课时', dataIndex: 'hoursDeducted', render: (v: any) => Number(v || 0).toFixed(2) },
  ]), []);

  const groupedBySubject = useMemo(() => {
    const map: Record<string, RecordItem[]> = {};
    (records || []).forEach((r) => {
      const key = r.subjectName || '未分类';
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return map;
  }, [records]);

  const subjectTabs = useMemo(() => {
    const keys = Object.keys(groupedBySubject);
    return keys.map((subject) => {
      const list = groupedBySubject[subject] || [];
      const sum = list.reduce((s, it) => s + Number(it.hoursDeducted || 0), 0);
      const cols = columns.filter((c: any) => c.dataIndex !== 'subjectName');
      return {
        key: subject,
        label: subject,
        children: (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Statistic title="科目课时小计" value={Number(sum).toFixed(2)} />
              </Col>
            </Row>
            <Table rowKey="id" loading={loading} columns={cols as any} dataSource={list} pagination={{ pageSize: 10 }} />
          </div>
        ),
      };
    });
  }, [groupedBySubject, columns, loading]);

  const fetchData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const params: any = {};
      if (range?.[0]) params.start = range[0].format('YYYY-MM-DD');
      if (range?.[1]) params.end = range[1].format('YYYY-MM-DD');
      const res = await request(`/api/teachers/${id}/summary`, { params });
      if (res?.success) {
        setTeacher(res.data.teacher);
        setRecords(res.data.records || []);
        setTotalHours(Number(res.data.totalHours || 0));
      }
    } catch (e) {
      message.error('获取教师详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  return (
    <PageContainer
      title={teacher?.name || '教师详情'}
      extra={[
        <Button key="back" onClick={() => history.push('/academic/teacher')}>返回列表</Button>,
      ]}
    >
      <Card bordered={false} style={{ marginBottom: 16 }}>
        <Descriptions title="基本信息" column={3} loading={!teacher}>
          <Descriptions.Item label="姓名">{teacher?.name}</Descriptions.Item>
          <Descriptions.Item label="性别">{teacher?.gender}</Descriptions.Item>
          <Descriptions.Item label="电话">{teacher?.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="状态">{teacher?.status}</Descriptions.Item>
          <Descriptions.Item label="科目">{teacher?.subjects?.map((s: any) => s.name).join(', ') || '-'}</Descriptions.Item>
          <Descriptions.Item label="编号">{teacher?.id}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card bordered={false} style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Statistic title="区间总课时" value={Number(totalHours).toFixed(2)} />
          </Col>
          <Col span={16} style={{ textAlign: 'right' }}>
            <DatePicker.RangePicker
              value={range}
              onChange={(v) => setRange(v as any)}
              style={{ marginRight: 8 }}
            />
            <Button type="primary" onClick={fetchData} loading={loading}>查询</Button>
          </Col>
        </Row>
      </Card>

      <Card bordered={false}>
        {Object.keys(groupedBySubject).length === 0 ? (
          <Empty description="暂无授课记录" />
        ) : (
          <Tabs items={subjectTabs} />
        )}
      </Card>
    </PageContainer>
  );
};

export default TeacherDetail;
