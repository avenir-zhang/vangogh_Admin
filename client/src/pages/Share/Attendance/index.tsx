import React, { useState, useEffect, useMemo } from 'react';
import { useParams, request } from '@umijs/max';
import { Card, Input, Button, message, Table, Tag, Result, Tabs, Descriptions, Divider, Statistic, Row, Col, Alert } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const ShareAttendance: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const [loading, setLoading] = useState(true);
  const [needPassword, setNeedPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const fetchData = async (pwd?: string) => {
    setLoading(true);
    setError('');
    try {
        const res = await request(`/api/share/${code}`, {
            params: { password: pwd },
            skipErrorHandler: true
        }).catch(err => {
            if (err.response) {
                if (err.response.status === 404) {
                    setError('链接不存在或已失效');
                } else if (err.response.status === 401) {
                    if (pwd) message.error('密码错误');
                    setNeedPassword(true);
                } else {
                    setError('系统错误');
                }
            } else {
                setError('网络错误');
            }
            return null;
        });
        
        if (res && res.success && res.data) {
            if (res.data.needPassword) {
                setNeedPassword(true);
            } else {
                setNeedPassword(false);
                setData(res.data);
            }
        }
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    if (code) {
        fetchData();
    }
  }, [code]);

  const handlePasswordSubmit = () => {
      fetchData(password);
  };

  if (loading && !data && !needPassword) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }}>
            <Card loading style={{ width: 300 }} bordered={false} />
        </div>
      );
  }

  if (error) {
      return <Result status="error" title="访问失败" subTitle={error} />;
  }

  if (needPassword && !data) {
      return (
          <div style={{ maxWidth: 400, margin: '100px auto', padding: 20 }}>
              <Card title="请输入访问密码" bordered={false} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                      <Input.Password 
                        prefix={<LockOutlined />} 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        onPressEnter={handlePasswordSubmit}
                        placeholder="密码"
                      />
                      <Button type="primary" onClick={handlePasswordSubmit} loading={loading}>
                          查看
                      </Button>
                  </div>
              </Card>
          </div>
      );
  }

  if (!data) return null;

  const groupedAttendances: any = {};
  if (data?.attendances) {
    data.attendances.forEach((item: any) => {
        const subject = item.subjectName || '未分类';
        if (!groupedAttendances[subject]) {
            groupedAttendances[subject] = [];
        }
        groupedAttendances[subject].push(item);
    });
  }
  
  const groupedOrders: any = {};
  if (data?.orders) {
      data.orders.forEach((item: any) => {
          const subject = item.subjectName || '未分类';
          if (!groupedOrders[subject]) {
              groupedOrders[subject] = [];
          }
          groupedOrders[subject].push(item);
      });
  }

  const columns = [
    { title: '课程', dataIndex: 'courseName', key: 'courseName' },
    { title: '科目', dataIndex: 'subjectName', key: 'subjectName' },
    { title: '教师', dataIndex: 'teacherName', key: 'teacherName', render: (val: any) => val || '-' },
    { title: '签到时间', dataIndex: 'attendanceDate', key: 'attendanceDate', render: (val: any) => dayjs(val).format('YYYY-MM-DD') },
    { title: '扣除课时', dataIndex: 'hoursDeducted', key: 'hoursDeducted', render: (val: any) => Number(val || 0).toFixed(2) },
    { title: '状态', dataIndex: 'status', key: 'status', render: (val: any) => {
        const map: any = {
            present: <Tag color="success">出勤</Tag>,
            absent: <Tag color="error">缺勤</Tag>,
            late: <Tag color="warning">迟到</Tag>,
            leave: <Tag color="default">请假</Tag>,
        };
        return map[val] || val;
    }},
  ];
  
  const orderColumns = [
      { title: '订单号', dataIndex: 'orderNo', key: 'orderNo' },
      { title: '正价课时', dataIndex: 'regularCourses', key: 'regularCourses', render: (val: any) => Number(val).toFixed(2) },
      { title: '赠送课时', dataIndex: 'giftCourses', key: 'giftCourses', render: (val: any) => Number(val).toFixed(2) },
      { title: '剩余正价', dataIndex: 'consumedRegular', key: 'consumedRegular', render: (val: any, record: any) => (Number(record.regularCourses) - Number(val)).toFixed(2) },
      { title: '剩余赠送', dataIndex: 'consumedGift', key: 'consumedGift', render: (val: any, record: any) => (Number(record.giftCourses) - Number(val)).toFixed(2) },
      { title: '订单日期', dataIndex: 'orderDate', key: 'orderDate', render: (val: any) => dayjs(val).format('YYYY-MM-DD') },
      { title: '有效期', dataIndex: 'expireDate', key: 'expireDate', render: (val: any) => val ? dayjs(val).format('YYYY-MM-DD') : '永久' },
  ];

  const items = Object.keys(groupedAttendances).map(subject => {
      // Calculate Stats
      const orders = groupedOrders[subject] || [];
      const attendances = groupedAttendances[subject] || [];
      
      let totalRegular = 0;
      let totalGift = 0;
      
      // Calculate total bought from valid orders
      orders.forEach((o: any) => {
          totalRegular += Number(o.regularCourses || 0);
          totalGift += Number(o.giftCourses || 0);
      });
      
      // Calculate total consumed from actual attendance records
      let totalConsumed = 0;
      attendances.forEach((a: any) => {
          totalConsumed += Number(a.hoursDeducted || 0);
      });
      
      // Calculate remaining
      // Logic: Deduct from Regular first, then Gift. (Or whatever logic, as long as total is correct)
      // This ensures that if orders are missing/cancelled but attendance exists, we show negative.
      
      let remainingRegular = totalRegular - totalConsumed;
      let remainingGift = totalGift;
      
      // If regular is negative (consumed more than bought regular), deduct from gift
      if (remainingRegular < 0) {
          remainingGift += remainingRegular; // remainingRegular is negative
          remainingRegular = 0;
      }
      
      // Note: We don't have separate "Consumed Regular" and "Consumed Gift" stats easily 
      // without complex logic matching attendance to orders.
      // So we will display "Total Consumed" instead of breaking it down, 
      // OR we display calculated breakdowns based on our assumption.
      
      const calculatedConsumedRegular = totalRegular - remainingRegular;
      const calculatedConsumedGift = totalGift - remainingGift;

      const isArrears = remainingRegular < 0 || remainingGift < 0; 
      
      return {
        key: subject,
        label: subject,
        children: (
          <div>
              {isArrears && (
                  <Alert
                    message="课时不足提醒"
                    description="您的剩余课时已不足，请及时续费以免影响上课。"
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
              )}
              
              <Card size="small" title="课时统计" bordered={false} style={{ marginBottom: 16, background: '#fafafa' }}>
                  <Row gutter={16}>
                      <Col span={4}>
                          <Statistic title="总正价" value={totalRegular} precision={2} />
                      </Col>
                      <Col span={4}>
                          <Statistic title="总赠送" value={totalGift} precision={2} />
                      </Col>
                      <Col span={4}>
                          <Statistic title="已消耗" value={totalConsumed} precision={2} />
                      </Col>
                      <Col span={4}>
                          <Statistic 
                            title="剩余正价" 
                            value={remainingRegular} 
                            precision={2} 
                            valueStyle={{ color: remainingRegular < 0 ? '#cf1322' : '#1890ff' }}
                          />
                      </Col>
                      <Col span={4}>
                          <Statistic 
                            title="剩余赠送" 
                            value={remainingGift} 
                            precision={2} 
                            valueStyle={{ color: remainingGift < 0 ? '#cf1322' : '#52c41a' }}
                          />
                      </Col>
                  </Row>
              </Card>
              
              <Divider orientation={"left" as any}>签到记录</Divider>
              <Table
                  dataSource={groupedAttendances[subject]}
                  rowKey="id"
                  pagination={false}
                  columns={columns.filter(col => col.key !== 'subjectName')}
                  bordered
                  size="middle"
                  style={{ marginBottom: 24 }}
              />

              <Divider orientation={"left" as any}>有效订单</Divider>
              <Table
                  dataSource={orders}
                  rowKey="id"
                  pagination={false}
                  columns={orderColumns}
                  bordered
                  size="small"
                  style={{ marginBottom: 24 }}
              />
          </div>
        )
      };
  });

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto', background: '#f0f2f5', minHeight: '100vh' }}>
        <Card title={`${data.student?.name} 的签到记录`} bordered={false} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ marginBottom: 24 }}>
                <Tag color="blue" style={{ fontSize: 14, padding: '4px 8px' }}>学员: {data.student?.name}</Tag>
                {data.student?.nickname && <Tag color="cyan" style={{ fontSize: 14, padding: '4px 8px' }}>昵称: {data.student?.nickname}</Tag>}
            </div>
            
            <Tabs defaultActiveKey={Object.keys(groupedAttendances)[0]} items={items} />
        </Card>
    </div>
  );
};

export default ShareAttendance;
