import { PageContainer, ProCard, StatisticCard } from '@ant-design/pro-components';
import { useRequest, request } from '@umijs/max';
import { useEffect, useState } from 'react';
import RcResizeObserver from 'rc-resize-observer';
import { Card, Row, Col, Statistic, DatePicker, Table, Empty, Tabs, Modal, Input, Drawer, Space, Button } from 'antd';
import * as XLSX from 'xlsx';
import { Line } from '@ant-design/plots';
import KpiCards from '@/components/Dashboard/KpiCards';
import RevenueTrend from '@/components/Dashboard/RevenueTrend';
import OrderTypePie from '@/components/Dashboard/OrderTypePie';
import TopTable from '@/components/Dashboard/TopTable';

export default function FinanceDashboard() {
  const [responsive, setResponsive] = useState(false);
  const { data, loading } = useRequest(() => request('/api/dashboard/financial'));
  const [dateRange, setDateRange] = useState<any>([]);
  const [kpi, setKPI] = useState<any>({ income: 0, ordersCount: 0, avgTicket: 0, debtTotal: 0 });
  const [revenueSeries, setRevenueSeries] = useState<any[]>([]);
  const [orderTypeDist, setOrderTypeDist] = useState<any[]>([]);
  const [topTeachers, setTopTeachers] = useState<any[]>([]);
  const [topSubjects, setTopSubjects] = useState<any[]>([]);
  const [deferred, setDeferred] = useState<any>({ totalValue: 0, totalHours: 0, items: [] });
  const [refund, setRefund] = useState<any>({ total: 0, timeseries: [] });
  const [arrears, setArrears] = useState<any[]>([]);
  const [expiring, setExpiring] = useState<any[]>([]);
  const [exceeded, setExceeded] = useState<any[]>([]);
  const [followMap, setFollowMap] = useState<Record<string, boolean>>({});
  const [remarkModal, setRemarkModal] = useState<{open: boolean, key?: string, type?: string}>({ open: false });
  const [remarkText, setRemarkText] = useState('');
  const [historyDrawer, setHistoryDrawer] = useState<{open: boolean, key?: string, logs?: any[]}>({ open: false });
  const [onlyPending, setOnlyPending] = useState<boolean>(false);

  const paramsFromRange = () => ({
    start_date: dateRange?.[0]?.format?.('YYYY-MM-DD'),
    end_date: dateRange?.[1]?.format?.('YYYY-MM-DD'),
  });

  const fetchFinance = async () => {
    const params: any = paramsFromRange();
    const k = await request('/api/dashboard/kpi', { params });
    setKPI(k?.data || {});
    const rev = await request('/api/dashboard/revenue-timeseries', { params: { ...params, granularity: 'day' } });
    setRevenueSeries(rev?.data || []);
    const dist = await request('/api/dashboard/order-type-distribution', { params });
    setOrderTypeDist(dist?.data || []);
    const tt = await request('/api/dashboard/top', { params: { ...params, type: 'teacher', limit: 5 } });
    setTopTeachers(tt?.data || []);
    const ts = await request('/api/dashboard/top', { params: { ...params, type: 'subject', limit: 5 } });
    setTopSubjects(ts?.data || []);
    const dr = await request('/api/dashboard/deferred-revenue');
    setDeferred(dr?.data || { totalValue: 0, totalHours: 0, items: [] });
    const rf = await request('/api/dashboard/refund-summary', { params });
    setRefund(rf?.data || { total: 0, timeseries: [] });
    const ar = await request('/api/dashboard/arrears-list');
    setArrears(ar?.data || ar || []);
    const ex = await request('/api/dashboard/expiring-list');
    setExpiring(ex?.data || ex || []);
    const ec = await request('/api/dashboard/exceeded-list');
    setExceeded(ec?.data || ec || []);

    // fetch followup status
    const keys: string[] = [];
    (ar?.data || ar || []).forEach((i: any) => keys.push(`arrears:${i.orderNo}`));
    (ex?.data || ex || []).forEach((i: any) => keys.push(`expiring:${i.studentName}:${i.subjectName}`));
    (ec?.data || ec || []).forEach((i: any) => keys.push(`exceeded:${i.studentName}:${i.subjectName}`));
    if (keys.length > 0) {
      const st = await request('/api/followup/status', { params: { keys: keys.join(',') } });
      const map: Record<string, boolean> = {};
      (st?.data || []).forEach((r: any) => { map[r.key] = r.status === 'done'; });
      setFollowMap(map);
    } else {
      setFollowMap({});
    }
  };

  useEffect(() => { fetchFinance(); }, [dateRange]);

  return (
    <PageContainer
      header={{
        title: '财务总览',
        extra: [
          <DatePicker.RangePicker key="range" value={dateRange} onChange={setDateRange as any} />,
        ],
      }}
    >
      <RcResizeObserver
        key="resize-observer"
        onResize={(offset) => {
          setResponsive(offset.width < 596);
        }}
      >
        <ProCard
          title="年度概览"
          extra={new Date().getFullYear() + '年'}
          split={responsive ? 'horizontal' : 'vertical'}
          headerBordered
          loading={loading}
        >
          <StatisticCard
            statistic={{
              title: '全年收入',
              value: data?.yearlyIncome || 0,
              prefix: '¥',
              precision: 2,
            }}
          />
          <StatisticCard
            statistic={{
              title: '总消耗课程',
              value: data?.totalConsumedCourses || 0,
              suffix: '节',
            }}
          />
          <StatisticCard
            statistic={{
              title: '总消耗课时费',
              value: data?.totalConsumedClassFees || 0,
              prefix: '¥',
              precision: 2,
            }}
          />
        </ProCard>
      </RcResizeObserver>

      <Tabs
        style={{ marginTop: 24 }}
        items={[
          {
            key: 'overview',
            label: '概览',
            children: (
              <>
                <KpiCards kpi={kpi} />
                <Row gutter={16}>
                  <Col span={16}>
                    <RevenueTrend data={revenueSeries} />
                  </Col>
                  <Col span={8}>
                    <OrderTypePie data={orderTypeDist.map(i => ({ type: i.orderType, value: i.amount }))} />
                  </Col>
                </Row>
                <Row gutter={16} style={{ marginTop: 16 }}>
                  <Col span={12}><TopTable title="教师收入 Top5" data={topTeachers} type="teacher" /></Col>
                  <Col span={12}><TopTable title="科目收入 Top5" data={topSubjects} type="subject" /></Col>
                </Row>
              </>
            ),
          },
          {
            key: 'deferred_refund',
            label: '负债与退款',
            children: (
              <>
              <Row gutter={16}>
                <Col span={12}>
                  <Card title="递延收入（课时负债）" bordered={false}>
                    <Table rowKey="subjectId" size="small" pagination={false} dataSource={deferred.items || []}
                      columns={[{ title: '科目', dataIndex: 'subjectName' }, { title: '剩余课时', dataIndex: 'remainingHours', render: (v)=>Number(v).toFixed(2) }, { title: '价值(¥)', dataIndex: 'value', render: (v)=>Number(v).toFixed(2) }]}
                      footer={() => <div>合计：{Number(deferred.totalHours || 0).toFixed(2)} 课时 / ¥{Number(deferred.totalValue || 0).toFixed(2)}</div>}
                    />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="退款分析（期间）" bordered={false}>
                    <Row gutter={16}>
                      <Col span={12}><Statistic title="退款总额(¥)" value={Number(refund.total || 0).toFixed(2)} valueStyle={{ color: (refund.total||0)>0?'#cf1322':undefined }} /></Col>
                    </Row>
                    {Array.isArray(refund.timeseries) && refund.timeseries.length > 0 ? (
                      <Line data={refund.timeseries} xField="date" yField="amount" height={220} smooth />
                    ) : (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无退款" />
                    )}
                  </Card>
                </Col>
              </Row>
              </>
            ),
          },
          {
            key: 'followup',
            label: '跟进中心',
            children: (
              <>
              <Row gutter={16}>
                <Col span={8}>
                  <Card title="欠费中心" bordered={false} extra={<Space>
                    <Button onClick={()=>{
                      const data = arrears.map(i=>({ 学员:i.studentName, 科目:i.subjectName, 欠费: Number(i.arrearsAmount||0)}));
                      const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '欠费'); XLSX.writeFile(wb, '欠费中心.xlsx');
                    }}>导出</Button>
                    <span style={{ cursor:'pointer' }} onClick={()=>setOnlyPending(!onlyPending)}>{onlyPending?'显示全部':'仅未跟进'}</span>
                  </Space>}>
                    <Table rowKey="orderNo" size="small" pagination={{ pageSize: 8 }} dataSource={arrears.filter(r=>!onlyPending || !followMap[`arrears:${r.orderNo}`])}
                      columns={[
                        { title: '学员', dataIndex: 'studentName' },
                        { title: '科目', dataIndex: 'subjectName' },
                        { title: '欠费(¥)', dataIndex: 'arrearsAmount', render: (v)=> <span style={{ color: '#cf1322' }}>{Number(v).toFixed(2)}</span> },
                        { title: '订单号', dataIndex: 'orderNo' },
                        { title: '跟进', dataIndex: 'op', render: (_: any, r: any) => {
                          const key = `arrears:${r.orderNo}`;
                          const done = followMap[key];
                          return done ? (
                            <Space>
                              <span style={{ color: '#52c41a' }}>已跟进</span>
                              <a onClick={async ()=>{ const res = await request('/api/followup/records', { params: { key } }); setHistoryDrawer({ open: true, key, logs: res?.data || [] }); }}>历史</a>
                            </Space>
                          ) : (
                            <Space>
                              <a onClick={async ()=>{
                                await request('/api/followup/mark', { method: 'POST', data: { key, type: 'arrears' } });
                                setFollowMap(prev=>({ ...prev, [key]: true }));
                              }}>标记已跟进</a>
                              <a onClick={()=>{ setRemarkModal({ open: true, key, type: 'arrears' }); setRemarkText(''); }}>备注</a>
                            </Space>
                          );
                        } }
                      ]} />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card title="即将续费" bordered={false} extra={<Space>
                    <Button onClick={()=>{
                      const data = expiring.map(i=>({ 学员:i.studentName, 科目:i.subjectName, 剩余课时: Number(i.remainingHours||0)}));
                      const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '即将续费'); XLSX.writeFile(wb, '即将续费.xlsx');
                    }}>导出</Button>
                    <span style={{ cursor:'pointer' }} onClick={()=>setOnlyPending(!onlyPending)}>{onlyPending?'显示全部':'仅未跟进'}</span>
                  </Space>}>
                    <Table rowKey="studentName" size="small" pagination={{ pageSize: 8 }} dataSource={expiring.filter(r=>!onlyPending || !followMap[`expiring:${r.studentName}:${r.subjectName}`])}
                      columns={[
                        { title: '学员', dataIndex: 'studentName' },
                        { title: '科目', dataIndex: 'subjectName' },
                        { title: '剩余课时', dataIndex: 'remainingHours', render: (v)=> Number(v).toFixed(2) },
                        { title: '跟进', dataIndex: 'op', render: (_: any, r: any) => {
                          const key = `expiring:${r.studentName}:${r.subjectName}`;
                          const done = followMap[key];
                          return done ? (
                            <Space>
                              <span style={{ color: '#52c41a' }}>已跟进</span>
                              <a onClick={async ()=>{ const res = await request('/api/followup/records', { params: { key } }); setHistoryDrawer({ open: true, key, logs: res?.data || [] }); }}>历史</a>
                            </Space>
                          ) : (
                            <Space>
                              <a onClick={async ()=>{
                                await request('/api/followup/mark', { method: 'POST', data: { key, type: 'expiring' } });
                                setFollowMap(prev=>({ ...prev, [key]: true }));
                              }}>标记已跟进</a>
                              <a onClick={()=>{ setRemarkModal({ open: true, key, type: 'expiring' }); setRemarkText(''); }}>备注</a>
                            </Space>
                          );
                        } }
                      ]} />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card title="超课时" bordered={false} extra={<Space>
                    <Button onClick={()=>{
                      const data = exceeded.map(i=>({ 学员:i.studentName, 科目:i.subjectName, 超上课时: Number(i.exceededHours||0)}));
                      const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '超课时'); XLSX.writeFile(wb, '超课时.xlsx');
                    }}>导出</Button>
                    <span style={{ cursor:'pointer' }} onClick={()=>setOnlyPending(!onlyPending)}>{onlyPending?'显示全部':'仅未跟进'}</span>
                  </Space>}>
                    <Table rowKey="studentName" size="small" pagination={{ pageSize: 8 }} dataSource={exceeded.filter(r=>!onlyPending || !followMap[`exceeded:${r.studentName}:${r.subjectName}`])}
                      columns={[
                        { title: '学员', dataIndex: 'studentName' },
                        { title: '科目', dataIndex: 'subjectName' },
                        { title: '超上(课时)', dataIndex: 'exceededHours', render: (v)=> <span style={{ color: '#cf1322' }}>{Number(v).toFixed(2)}</span> },
                        { title: '跟进', dataIndex: 'op', render: (_: any, r: any) => {
                          const key = `exceeded:${r.studentName}:${r.subjectName}`;
                          const done = followMap[key];
                          return done ? (
                            <Space>
                              <span style={{ color: '#52c41a' }}>已跟进</span>
                              <a onClick={async ()=>{ const res = await request('/api/followup/records', { params: { key } }); setHistoryDrawer({ open: true, key, logs: res?.data || [] }); }}>历史</a>
                            </Space>
                          ) : (
                            <Space>
                              <a onClick={async ()=>{
                                await request('/api/followup/mark', { method: 'POST', data: { key, type: 'exceeded' } });
                                setFollowMap(prev=>({ ...prev, [key]: true }));
                              }}>标记已跟进</a>
                              <a onClick={()=>{ setRemarkModal({ open: true, key, type: 'exceeded' }); setRemarkText(''); }}>备注</a>
                            </Space>
                          );
                        } }
                      ]} />
                  </Card>
                </Col>
              </Row>


              <Modal
                open={remarkModal.open}
                title="添加备注"
                onCancel={()=>setRemarkModal({ open: false })}
                onOk={async ()=>{
                  if (!remarkModal.key || !remarkModal.type) return;
                  await request('/api/followup/mark', { method: 'POST', data: { key: remarkModal.key, type: remarkModal.type, remark: remarkText } });
                  setRemarkModal({ open: false }); setRemarkText('');
                }}
              >
                <Input.TextArea rows={4} value={remarkText} onChange={e=>setRemarkText(e.target.value)} placeholder="请输入备注..." />
              </Modal>
              <Drawer
                open={historyDrawer.open}
                onClose={()=>setHistoryDrawer({ open: false })}
                title="跟进历史"
                width={420}
              >
                <Table rowKey="id" size="small" pagination={false} dataSource={historyDrawer.logs || []}
                  columns={[{ title: '时间', dataIndex: 'created_at', render: (v:any)=> new Date(v).toLocaleString() }, { title: '备注', dataIndex: 'remark', render: (v:any)=> v || '-' }]} />
              </Drawer>
              </>
            ),
          },
        ]}
      />
    </PageContainer>
  );
}
