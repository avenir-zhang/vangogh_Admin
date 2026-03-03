import React, { useEffect, useState } from 'react';
import { PageContainer, ProDescriptions, ProTable, ModalForm, ProFormSelect, ProFormText } from '@ant-design/pro-components';
import { Card, Button, message, Tabs, Tag, Space, Descriptions, Statistic, Row, Col, Modal, Typography, DatePicker, Select, Table, Empty } from 'antd';
import dayjs from 'dayjs';
import { DownloadOutlined, ShareAltOutlined, CopyOutlined } from '@ant-design/icons';
import { useParams, history, request, useAccess } from '@umijs/max';
import * as XLSX from 'xlsx';
import AccessBtn from '@/components/AccessBtn';

const { Paragraph } = Typography;

const StudentDetail: React.FC = () => {
  const params = useParams<{ id: string }>();
  const studentId = params.id;
  const [student, setStudent] = useState<any>(null);
  const [subjectStats, setSubjectStats] = useState<any>({});
  const access = useAccess();
  const [attendances, setAttendances] = useState<any[]>([]);
  const [attLoading, setAttLoading] = useState(false);
  const [attDateRange, setAttDateRange] = useState<any>([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [attSubjectId, setAttSubjectId] = useState<number | undefined>(undefined);
  const [attStatus, setAttStatus] = useState<string | undefined>(undefined);
  const [subjectOptions, setSubjectOptions] = useState<{label: string, value: number}[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  
  // Share
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareLink, setShareLink] = useState<string>('');

  const fetchStudent = async () => {
    try {
      const data = await request(`/api/students/${studentId}`);
      setStudent(data);
    } catch (error) {
      message.error('获取学员详情失败');
    }
  };

  const fetchSubjectStats = async () => {
      try {
          const res = await request(`/api/students/${studentId}/subject-stats`);
          setSubjectStats(res);
      } catch (error) {
          console.error(error);
      }
  };

  const handleExportAttendances = async () => {
      try {
          const msg = await request(`/api/attendances`, { params: { current: 1, pageSize: 10000, student_id: studentId } });
          const data = msg || [];
          
          const exportData = data.map((item: any) => ({
              '学员姓名': item.student?.name || '-',
              '课程名称': item.course?.name || '-',
              '科目': item.course?.subject?.name || '-',
              '教师姓名': item.teacher?.name || '-',
              '子订单号': item.order?.order_no || '-',
              '签到日期': item.attendance_date,
              '状态': {
                  present: '出勤',
                  absent: '缺勤',
                  late: '迟到',
                  leave: '请假'
              }[item.status as string] || item.status,
              '扣除课时': Number(item.hours_deducted || 0),
          }));

          const ws = XLSX.utils.json_to_sheet(exportData);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "学员签到记录");
          XLSX.writeFile(wb, `学员签到记录_${student.name}_${new Date().getTime()}.xlsx`);
          message.success('导出成功');
      } catch (error) {
          message.error('导出失败');
      }
  };

  const fetchAttendanceList = async () => {
      try {
          setAttLoading(true);
          const params: any = { student_id: studentId };
          if (attSubjectId) params.subject_id = attSubjectId;
          if (attStatus) params.status = attStatus;
          if (attDateRange?.[0]) params.start_date = attDateRange[0].format('YYYY-MM-DD');
          if (attDateRange?.[1]) params.end_date = attDateRange[1].format('YYYY-MM-DD');
          const res = await request(`/api/attendances`, { params });
          setAttendances(res || []);
      } catch (e) {
          message.error('获取签到记录失败');
      } finally {
          setAttLoading(false);
      }
  };

  const handleCreateShareLink = async (values: any) => {
      try {
          const res = await request('/api/share/create/attendance', {
              method: 'POST',
              data: {
                  studentId: Number(studentId),
                  expireInDays: values.expireInDays === -1 ? undefined : values.expireInDays,
                  password: values.password,
              }
          });
          
          if (res.success && res.data) {
              const origin = window.location.origin;
              const fullLink = `${origin}${res.data.url}`;
              setShareLink(fullLink);
              message.success('生成成功');
              // Keep modal open to show link
              return false; // Prevent modal close
          }
      } catch (error) {
          message.error('生成失败');
      }
  };

  useEffect(() => {
    if (studentId) {
      fetchStudent();
      fetchSubjectStats();
      fetchAttendanceList();
      (async () => {
        try {
          setOrdersLoading(true);
          const res = await request(`/api/orders`, { params: { student_id: studentId } });
          setOrders(res || []);
        } finally { setOrdersLoading(false); }
      })();
    }
  }, [studentId]);

  useEffect(() => {
    // preload subjects for filter
    (async () => {
        const ss = await request('/api/subjects');
        setSubjectOptions((ss || []).map((s: any) => ({ label: s.name, value: s.id })));
    })();
  }, []);

  if (!student) {
    return <PageContainer loading />;
  }

  return (
    <PageContainer
      title={student.name}
      extra={[
        <Button key="edit" onClick={() => history.push('/academic/student')}>返回列表</Button>,
      ]}
    >
      <Card bordered={false} style={{ marginBottom: 24 }}>
        <ProDescriptions column={3} dataSource={student}>
          <ProDescriptions.Item label="姓名" dataIndex="name" />
          <ProDescriptions.Item label="昵称" dataIndex="nickname" />
          <ProDescriptions.Item label="性别" dataIndex="gender" />
          <ProDescriptions.Item label="联系电话" dataIndex="phone" />
          <ProDescriptions.Item label="紧急联系人" dataIndex="emergency_contact" />
          <ProDescriptions.Item label="紧急联系电话" dataIndex="emergency_phone" />
          <ProDescriptions.Item label="状态" dataIndex="status" valueEnum={{
            active: { text: '在读', status: 'Success' },
            inactive: { text: '停课', status: 'Error' },
            graduated: { text: '毕业', status: 'Default' },
          }} />
          <ProDescriptions.Item label="备注" dataIndex="remark" span={3} />
        </ProDescriptions>
      </Card>

      <Card bordered={false}>
        <Tabs
          items={[
            {
              label: '报名课程',
              key: 'courses',
              children: (
                (() => {
                  const keys = Object.keys(subjectStats || {});
                  if (keys.length === 0) return <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>暂无报名课程</div>;
                  const items = keys.map((subjectName) => {
                    const data = subjectStats[subjectName] || { totalRegular: 0, totalGift: 0, consumed: 0, remaining: 0, orders: [] };
                    const isArrears = data.remaining < 0;
                    return {
                      key: subjectName,
                      label: subjectName,
                      children: (
                        <Card type="inner" style={{ border: isArrears ? '1px solid #ff4d4f' : undefined }}>
                          <Row gutter={16} style={{ marginBottom: 20 }}>
                            <Col span={6}><Statistic title="正价课时" value={Number(data.totalRegular).toFixed(2)} /></Col>
                            <Col span={6}><Statistic title="赠送课时" value={Number(data.totalGift).toFixed(2)} /></Col>
                            <Col span={6}><Statistic title="消耗课时" value={Number(data.consumed).toFixed(2)} /></Col>
                            <Col span={6}>
                              <Statistic title="剩余课时" value={Number(data.remaining).toFixed(2)} valueStyle={{ color: data.remaining < 0 ? 'red' : '#3f8600' }} />
                              {isArrears ? <Tag color="error" style={{ marginLeft: 8 }}>欠费</Tag> : null}
                            </Col>
                          </Row>
                          <div style={{ marginTop: 16 }}>
                            <div style={{ marginBottom: 8, fontWeight: 'bold' }}>关联订单明细</div>
                            {(() => {
                              const baseOrders = Array.isArray(data.orders) ? data.orders : [];
                              const consumedFromOrders = baseOrders.reduce(
                                (s: number, o: any) => s + Number(o.consumed_regular_courses || 0) + Number(o.consumed_gift_courses || 0),
                                0,
                              );
                              const extra = Math.max(0, Number(data.consumed || 0) - consumedFromOrders);
                              const ordersWithExtra = extra > 0
                                ? [
                                    ...baseOrders,
                                    {
                                      id: `exceed-${subjectName}`,
                                      order_no: '超上（未匹配子订单）',
                                      regular_courses: 0,
                                      gift_courses: 0,
                                      consumed_regular_courses: extra,
                                      consumed_gift_courses: 0,
                                      expire_date: null,
                                      status: 'exceeded',
                                      __synthetic: true,
                                    },
                                  ]
                                : baseOrders;

                              const columns = [
                                {
                                  title: '订单号',
                                  dataIndex: 'order_no',
                                  render: (text: any, record: any) =>
                                    record.__synthetic ? (
                                      <span style={{ color: '#cf1322' }}>{text}</span>
                                    ) : (
                                      <a onClick={() => history.push(`/finance/order/detail/${record.parent_id || record.id}`)}>{text}</a>
                                    ),
                                },
                                { title: '正价', dataIndex: 'regular_courses', render: (val: any) => Number(val).toFixed(2) },
                                { title: '赠送', dataIndex: 'gift_courses', render: (val: any) => Number(val).toFixed(2) },
                                { title: '已用正价', dataIndex: 'consumed_regular_courses', render: (val: any) => {
                                  const n = Number(val || 0);
                                  return <span style={n > 0 ? { color: '#52c41a', fontWeight: 500 } : undefined}>{n.toFixed(2)}</span>;
                                } },
                                { title: '已用赠送', dataIndex: 'consumed_gift_courses', render: (val: any) => {
                                  const n = Number(val || 0);
                                  return <span style={n > 0 ? { color: '#722ed1', fontWeight: 500 } : undefined}>{n.toFixed(2)}</span>;
                                } },
                                {
                                  title: '过期时间',
                                  dataIndex: 'expire_date',
                                  valueType: 'date',
                                  render: (text: any, record: any) => {
                                    if (record.__synthetic) return '-';
                                    if (!record.expire_date) return '-';
                                    const expire = new Date(record.expire_date);
                                    const now = new Date();
                                    const oneMonthLater = new Date();
                                    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
                                    let color = 'green';
                                    let statusText = '';
                                    if (expire < now) { color = 'red'; statusText = '(已过期)'; }
                                    else if (expire <= oneMonthLater) { color = 'gold'; statusText = '(即将过期)'; }
                                    return <span style={{ color }}>{text} {statusText}</span>;
                                  },
                                },
                                {
                                  title: '状态',
                                  dataIndex: 'status',
                                  render: (v: string, record: any) =>
                                    record.__synthetic ? (
                                      <Tag color="error">超上</Tag>
                                    ) : (
                                      ({ active: '正常', completed: '已完成', cancelled: '已取消', transferred: '已转让' } as any)[v] || v
                                    ),
                                },
                              ];

                              return (
                                <ProTable
                                  rowKey="id"
                                  search={false}
                                  toolBarRender={false}
                                  options={false}
                                  pagination={false}
                                  dataSource={ordersWithExtra}
                                  columns={columns as any}
                                  size="small"
                                  bordered
                                />
                              );
                            })()}
                          </div>
                        </Card>
                      ),
                    };
                  });
                  return <Tabs items={items} />;
                })()
              ),
            },
            {
              label: '订单记录',
              key: 'orders',
              children: (
                <Card bordered={false}>
                  {(() => {
                    const groups: Record<string, any[]> = { active: [], completed: [], cancelled: [], transferred: [] };
                    orders.forEach((o) => {
                      const s = o.status || 'active';
                      if (!groups[s]) groups[s] = [];
                      groups[s].push(o);
                    });

                    const columns = [
                      { title: '订单号', dataIndex: 'order_no', render: (text: any, record: any) => (<a onClick={() => history.push(`/finance/order/detail/${record.id}`)}>{text}</a>) },
                      { title: '类型', dataIndex: 'order_type', render: (v: string) => ({ new: '新报', renew: '续费', supplement: '补缴', transfer: '转让', gift: '赠送' } as any)[v] || v },
                      { title: '总金额', dataIndex: 'total_fee', render: (v: any) => `¥${Number(v||0).toFixed(2)}` },
                      { title: '欠费', dataIndex: 'debt_amount', render: (v: any) => `¥${Number(v||0).toFixed(2)}` },
                      { title: '订单日期', dataIndex: 'order_date', render: (v: any) => v ? dayjs(v).format('YYYY-MM-DD') : '-' },
                      { title: '状态', dataIndex: 'status', render: (v: string) => ({ active: '正常', completed: '已完成', cancelled: '已取消', transferred: '已转让' } as any)[v] || v },
                      { title: '操作', dataIndex: 'op', render: (_: any, record: any) => (<a onClick={() => history.push(`/finance/order/detail/${record.id}`)}>详情</a>) },
                    ];

                    const items = [
                      { key: 'active', label: '正常', data: groups.active },
                      { key: 'completed', label: '已完成', data: groups.completed },
                      { key: 'cancelled', label: '已取消', data: groups.cancelled },
                      { key: 'transferred', label: '已转让', data: groups.transferred },
                    ].map((it) => ({
                      key: it.key,
                      label: it.label,
                      children: (
                        <Table
                          rowKey="id"
                          loading={ordersLoading}
                          columns={columns as any}
                          dataSource={it.data}
                          pagination={{ pageSize: 10 }}
                        />
                      ),
                    }));

                    return <Tabs items={items} />;
                  })()}
                </Card>
              ),
            },
            {
              label: '签到记录',
              key: 'attendances',
              children: (
                <Card bordered={false}>
                  <Space style={{ marginBottom: 16 }} wrap>
                    <DatePicker.RangePicker value={attDateRange} onChange={setAttDateRange as any} />
                    <Select
                      placeholder="按科目筛选"
                      allowClear
                      style={{ width: 200 }}
                      value={attSubjectId}
                      options={subjectOptions}
                      onChange={setAttSubjectId as any}
                    />
                    <Select
                      placeholder="按状态筛选"
                      allowClear
                      style={{ width: 200 }}
                      value={attStatus}
                      options={[
                        { label: '出勤', value: 'present' },
                        { label: '缺勤', value: 'absent' },
                        { label: '迟到', value: 'late' },
                        { label: '请假', value: 'leave' },
                      ]}
                      onChange={setAttStatus as any}
                    />
                    <Button type="primary" onClick={fetchAttendanceList} loading={attLoading}>查询</Button>
                    <AccessBtn key="export" access="canExportAttendance">
                      <Button icon={<DownloadOutlined />} onClick={handleExportAttendances}>导出</Button>
                    </AccessBtn>
                    <AccessBtn key="share" access="canExportAttendance">
                      <Button icon={<ShareAltOutlined />} onClick={() => { setShareLink(''); setShareModalVisible(true); }}>生成签到链接</Button>
                    </AccessBtn>
                  </Space>
                  {(() => {
                    const grouped: Record<string, any[]> = {};
                    (attendances || []).forEach((a: any) => {
                      const key = a.course?.subject?.name || '未分类';
                      if (!grouped[key]) grouped[key] = [];
                      grouped[key].push(a);
                    });
                    const keys = Object.keys(grouped);
                    if (keys.length === 0) return <Empty description="暂无签到记录" />;
                    const columns = [
                      { title: '课程', dataIndex: ['course', 'name'] },
                      { title: '教师', dataIndex: ['teacher', 'name'], render: (_: any, r: any) => r.teacher?.name || '-' },
                      { title: '子订单', dataIndex: ['order', 'order_no'], render: (_: any, r: any) => r.order ? (<a onClick={() => history.push(`/finance/order/detail/${r.order.parent_id || r.order.id}`)}>{r.order.order_no}</a>) : '-' },
                      { title: '签到时间', dataIndex: 'attendance_date', render: (v: any) => dayjs(v).format('YYYY-MM-DD') },
                      { title: '扣除课时', dataIndex: 'hours_deducted', render: (val: any) => Number(val || 0).toFixed(2) },
                      { title: '状态', dataIndex: 'status', render: (v: string) => ({ present: '出勤', absent: '缺勤', late: '迟到', leave: '请假' } as any)[v] || v },
                    ];
                    const items = keys.map((subject) => ({
                      key: subject,
                      label: subject,
                      children: (
                        <div>
                          <Row gutter={16} style={{ marginBottom: 12 }}>
                            <Col span={6}><Statistic title="科目课时小计" value={Number(grouped[subject].reduce((s: number, it: any) => s + Number(it.hours_deducted || 0), 0)).toFixed(2)} /></Col>
                          </Row>
                          <Table rowKey="id" loading={attLoading} columns={columns as any} dataSource={grouped[subject]} pagination={{ pageSize: 10 }} />
                        </div>
                      )
                    }));
                    return <Tabs items={items} />;
                  })()}
                </Card>
              ),
            },
          ]}
        />
      </Card>
      <ModalForm
        title="生成签到记录分享链接"
        open={shareModalVisible}
        onOpenChange={setShareModalVisible}
        onFinish={handleCreateShareLink}
        submitter={shareLink ? false : undefined}
      >
          {!shareLink ? (
              <>
                <ProFormSelect
                    name="expireInDays"
                    label="有效期"
                    initialValue={7}
                    options={[
                        { label: '7天', value: 7 },
                        { label: '30天', value: 30 },
                        { label: '永久有效', value: -1 },
                    ]}
                    required
                />
                <ProFormText.Password
                    name="password"
                    label="访问密码 (选填)"
                    placeholder="留空则无需密码"
                />
              </>
          ) : (
              <div style={{ textAlign: 'center' }}>
                  <div style={{ marginBottom: 16 }}>
                      <Tag color="success">链接生成成功</Tag>
                  </div>
                  <Paragraph copyable={{ text: shareLink }}>
                      {shareLink}
                  </Paragraph>
                  <div style={{ marginTop: 24 }}>
                      <Button type="primary" onClick={() => setShareModalVisible(false)}>关闭</Button>
                  </div>
              </div>
          )}
      </ModalForm>
    </PageContainer>
  );
};

export default StudentDetail;
