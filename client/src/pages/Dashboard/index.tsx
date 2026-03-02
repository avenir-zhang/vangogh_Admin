import { PageContainer, ProCard, StatisticCard } from '@ant-design/pro-components';
import { useRequest } from '@umijs/max';
import { request, history } from '@umijs/max';
import RcResizeObserver from 'rc-resize-observer';
import { useState } from 'react';
import { Statistic, Card, Row, Col, List, Avatar, Tag, Button, Table } from 'antd';
import { Line, Bar } from '@ant-design/plots';

const { Statistic: ProStatistic } = StatisticCard;

export default function Dashboard() {
  const [responsive, setResponsive] = useState(false);

  // 移除统一的 fetchData，直接在 useRequest 中处理，以便更好地调试
  const { data: summaryData, loading: summaryLoading } = useRequest(async () => {
      console.log('Starting fetch summary...');
      try {
          const res = await request('/api/dashboard/summary');
          console.log('Summary raw response:', res);
          // 针对性处理
          if (res?.data?.totalStudents !== undefined) {
              console.log('Resolved via res.data');
              return res;
          } 
          console.log('Could not resolve data structure, returning raw res');
          return res;
      } catch (error) {
          console.error('Summary fetch error:', error);
          throw error;
      }
  }, {
      onSuccess: (data) => console.log('Summary hook onSuccess data:', data)
  });
  
  // 确保 summaryData 不为 undefined
  const data = summaryData || {};
  
  // 调试日志：检查 data 的结构
  console.log('Render Data (processed):', data);
  console.log('totalStudents:', data.totalStudents);

  const { data: attendanceTrend } = useRequest(async () => {
      const res = await request('/api/dashboard/attendance-trend');
      if (Array.isArray(res?.data)) return res;
      return [];
  });

  const { data: arrearsList } = useRequest(async () => {
      const res = await request('/api/dashboard/arrears-list');
      if (Array.isArray(res?.data)) return res;
      return [];
  });

  const { data: expiringList } = useRequest(async () => {
      const res = await request('/api/dashboard/expiring-list');
      if (Array.isArray(res?.data)) return res;
      return [];
  });

  const { data: exceededList } = useRequest(async () => {
      const res = await request('/api/dashboard/exceeded-list');
      if (Array.isArray(res?.data)) return res;
      return [];
  });
  
  // 折线图配置
  const lineConfig = {
    data: Array.isArray(attendanceTrend) ? attendanceTrend : [],
    xField: 'date',
    yField: 'value',
    point: {
      shapeField: 'circle',
      sizeField: 4,
    },
    interaction: {
      tooltip: {
        marker: false,
      },
    },
    style: {
      lineWidth: 2,
    },
  };

  // 条形图配置
  const barConfig = {
    data: Array.isArray(arrearsList) ? arrearsList : [],
    xField: 'studentName',
    yField: 'arrearsAmount',
    colorField: 'subjectName', 
    sort: {
      reverse: true,
    },
    legend: {
        color: { size: 72, autoWrap: true, maxRows: 3, cols: 6 },
    },
  };

  return (
    <PageContainer>
      <RcResizeObserver
        key="resize-observer"
        onResize={(offset) => {
          setResponsive(offset.width < 596);
        }}
      >
        <ProCard
          title="数据概览"
          extra={new Date().toLocaleDateString()}
          split={responsive ? 'horizontal' : 'vertical'}
          headerBordered
          loading={summaryLoading}
          style={{ marginBottom: 24 }}
        >
          <ProCard split="vertical">
            <StatisticCard
              statistic={{
                title: '在册学员',
                value: data.totalStudents ?? 0,
                description: <ProStatistic title="占比" value="100%" />,
              }}
            />
            <StatisticCard
              statistic={{
                title: '在读学员',
                value: data.activeStudents ?? 0,
                description: <ProStatistic title="占比" value={data.totalStudents ? ((data.activeStudents / data.totalStudents) * 100).toFixed(2) + '%' : '0%'} />,
              }}
            />
          </ProCard>
          <ProCard split="vertical">
            <StatisticCard
              statistic={{
                title: '欠费学员',
                value: data.arrearsStudents ?? 0,
                status: data.arrearsStudents > 0 ? 'error' : 'default', // 有欠费才标红
                description: <ProStatistic title="占比" value={data.totalStudents ? ((data.arrearsStudents / data.totalStudents) * 100).toFixed(2) + '%' : '0%'} />, // 保持 UI 结构一致
              }}
            />
            <StatisticCard
              statistic={{
                title: '本月消耗课时',
                value: data.monthlyClassHours ?? 0,
                description: <ProStatistic title="总计" value={`${data.monthlyClassHours ?? 0} 课时`} />, // 保持 UI 结构一致
              }}
            />
          </ProCard>
        </ProCard>

        <Row gutter={24}>
            <Col span={8}>
                <Card title="欠费学员" bordered={false} style={{ marginBottom: 24, minHeight: 400 }}>
                    <List
                        itemLayout="horizontal"
                        dataSource={(() => {
                            const list = Array.isArray(arrearsList) ? arrearsList : [];
                            const map = new Map();
                            list.forEach((item: any) => {
                                if (map.has(item.studentName)) {
                                    const existing = map.get(item.studentName);
                                    existing.arrearsAmount += Number(item.arrearsAmount);
                                    const subjects = new Set(existing.subjectName.split(', '));
                                    item.subjectName.split(', ').forEach((s: string) => subjects.add(s));
                                    existing.subjectName = Array.from(subjects).join(', ');
                                } else {
                                    map.set(item.studentName, { ...item, arrearsAmount: Number(item.arrearsAmount) });
                                }
                            });
                            return Array.from(map.values());
                        })()}
                        renderItem={(item: any) => (
                        <List.Item>
                            <List.Item.Meta
                            avatar={<Avatar style={{ backgroundColor: '#ff4d4f' }}>{item.studentName?.[0]}</Avatar>}
                            title={<a onClick={() => history.push(`/finance/order?orderNo=${item.orderNo}`)}>{item.studentName}</a>}
                            description={
                                <>
                                    {item.subjectName.split(', ').map((t: string) => <Tag key={t} color="blue">{t}</Tag>)}
                                    <span>欠费: <span style={{ color: 'red', fontWeight: 'bold' }}>¥{Number(item.arrearsAmount).toFixed(2)}</span></span>
                                </>
                            }
                            />
                            <div>
                                <Button type="link" onClick={() => history.push(`/finance/order?orderNo=${item.orderNo}`)}>去补缴</Button>
                            </div>
                        </List.Item>
                        )}
                    />
                </Card>
            </Col>
            <Col span={8}>
                <Card title="课时上超学员 (剩余 < 0)" bordered={false} style={{ marginBottom: 24, minHeight: 400 }}>
                    <List
                        itemLayout="horizontal"
                        dataSource={Array.isArray(exceededList) ? exceededList : []}
                        renderItem={(item: any) => (
                        <List.Item>
                            <List.Item.Meta
                            avatar={<Avatar style={{ backgroundColor: '#ff4d4f' }}>{item.studentName?.[0]}</Avatar>}
                            title={<a onClick={() => history.push(`/finance/order/create?student=${item.studentName}`)}>{item.studentName}</a>}
                            description={
                                <>
                                    <Tag color="blue">{item.subjectName}</Tag>
                                    <span>超课时: <span style={{ color: 'red', fontWeight: 'bold' }}>{Number(item.exceededHours).toFixed(2)}</span></span>
                                </>
                            }
                            />
                            <div>
                                <Button type="link" onClick={() => history.push(`/finance/order/create?student=${item.studentName}`)}>去续费</Button>
                            </div>
                        </List.Item>
                        )}
                    />
                </Card>
            </Col>
            <Col span={8}>
                <Card title="即将续费学员 (剩余课时 <= 5)" bordered={false} style={{ marginBottom: 24, minHeight: 400 }}>
                    <List
                        itemLayout="horizontal"
                        dataSource={Array.isArray(expiringList) ? expiringList : []}
                        renderItem={(item: any) => (
                        <List.Item>
                            <List.Item.Meta
                            avatar={<Avatar style={{ backgroundColor: '#f56a00' }}>{item.studentName?.[0]}</Avatar>}
                            title={<a onClick={() => history.push(`/finance/order/create?student=${item.studentName}`)}>{item.studentName}</a>}
                            description={
                                <>
                                    <Tag color="blue">{item.subjectName}</Tag>
                                    <span>剩余课时: <span style={{ color: 'red', fontWeight: 'bold' }}>{Number(item.remainingHours).toFixed(2)}</span></span>
                                </>
                            }
                            />
                            <div>
                                <Button type="link" onClick={() => window.open(`/finance/order/create?student=${item.studentName}`, '_self')}>去续费</Button>
                            </div>
                        </List.Item>
                        )}
                    />
                </Card>
            </Col>
        </Row>

        <Card title="签到趋势 (近12个月)" bordered={false} style={{ marginBottom: 24 }}>
            <Line {...lineConfig} />
        </Card>

      </RcResizeObserver>
    </PageContainer>
  );
}
