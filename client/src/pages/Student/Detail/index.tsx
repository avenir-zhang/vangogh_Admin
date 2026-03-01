import React, { useEffect, useState } from 'react';
import { PageContainer, ProDescriptions, ProTable } from '@ant-design/pro-components';
import { Card, Button, message, Tabs, Tag, Space, Descriptions, Statistic, Row, Col } from 'antd';
import { useParams, history, request } from '@umijs/max';

const StudentDetail: React.FC = () => {
  const params = useParams<{ id: string }>();
  const studentId = params.id;
  const [student, setStudent] = useState<any>(null);
  const [subjectStats, setSubjectStats] = useState<any>({});

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

  useEffect(() => {
    if (studentId) {
      fetchStudent();
      fetchSubjectStats();
    }
  }, [studentId]);

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
                <div>
                    {Object.keys(subjectStats).length === 0 && <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>暂无报名课程</div>}
                    
                    {Object.keys(subjectStats).map((subjectName) => {
                         const data = subjectStats[subjectName] || { totalRegular: 0, totalGift: 0, consumed: 0, remaining: 0 };
                         const isArrears = data.remaining < 0;
                         
                         return (
                         <Card
                             key={subjectName} 
                             type="inner" 
                             title={
                                 <Space>
                                     <span style={{ fontWeight: 'bold' }}>{subjectName}</span>
                                     {isArrears && <Tag color="error">欠费</Tag>}
                                 </Space>
                             }
                             style={{ marginBottom: 20, border: isArrears ? '1px solid #ff4d4f' : undefined }}
                         >
                             <Row gutter={16} style={{ marginBottom: 20 }}>
                                 <Col span={6}>
                                     <Statistic title="正价课时" value={Number(data.totalRegular).toFixed(2)} />
                                 </Col>
                                 <Col span={6}>
                                     <Statistic title="赠送课时" value={Number(data.totalGift).toFixed(2)} />
                                 </Col>
                                 <Col span={6}>
                                     <Statistic title="消耗课时" value={Number(data.consumed).toFixed(2)} />
                                 </Col>
                                 <Col span={6}>
                                     <Statistic 
                                        title="剩余课时" 
                                        value={Number(data.remaining).toFixed(2)} 
                                        valueStyle={{ color: data.remaining < 0 ? 'red' : '#3f8600' }} 
                                        suffix={data.remaining < 0 ? <Tag color="error">欠费</Tag> : null}
                                     />
                                 </Col>
                             </Row>

                             <div style={{ marginTop: 16 }}>
                                 <div style={{ marginBottom: 8, fontWeight: 'bold' }}>关联订单明细</div>
                                 <ProTable
                                     rowKey="id"
                                     search={false}
                                     toolBarRender={false}
                                     options={false}
                                     pagination={false}
                                     dataSource={data.orders || []}
                                     columns={[
                                         { 
                                             title: '订单号', 
                                             dataIndex: 'order_no',
                                             render: (text, record) => (
                                                 <a onClick={() => history.push(`/finance/order/detail/${record.parent_id || record.id}`)}>{text}</a>
                                             )
                                         },
                                         { title: '正价', dataIndex: 'regular_courses', render: (val) => Number(val).toFixed(2) },
                                         { title: '赠送', dataIndex: 'gift_courses', render: (val) => Number(val).toFixed(2) },
                                         { title: '已用正价', dataIndex: 'consumed_regular_courses', render: (val) => Number(val).toFixed(2) },
                                         { title: '已用赠送', dataIndex: 'consumed_gift_courses', render: (val) => Number(val).toFixed(2) },
                                         { 
                                            title: '过期时间', 
                                            dataIndex: 'expire_date', 
                                            valueType: 'date',
                                            render: (text, record) => {
                                                if (!record.expire_date) return '-';
                                                const expire = new Date(record.expire_date);
                                                const now = new Date();
                                                const oneMonthLater = new Date();
                                                oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

                                                let color = 'green';
                                                 let statusText = '';
                                                 
                                                 if (expire < now) {
                                                     color = 'red';
                                                     statusText = '(已过期)';
                                                 } else if (expire <= oneMonthLater) {
                                                     color = 'gold'; // yellow/orange for warning
                                                     statusText = '(即将过期)';
                                                 }

                                                 return <span style={{ color }}>{text} {statusText}</span>;
                                             }
                                        },
                                         { title: '状态', dataIndex: 'status', valueEnum: {
                                             active: { text: '正常', status: 'Success' },
                                             completed: { text: '已完成', status: 'Default' },
                                             cancelled: { text: '已取消', status: 'Error' },
                                         }},
                                     ]}
                                     size="small"
                                     bordered
                                 />
                             </div>
                         </Card>
                     )})}
                </div>
              ),
            },
            {
              label: '订单记录',
              key: 'orders',
              children: (
                <ProTable
                  rowKey="id"
                  search={false}
                  toolBarRender={false}
                  request={async (params) => {
                    const res = await request(`/api/orders`, {
                        params: { ...params, student_id: studentId } // 这里实际上查询的是主订单列表
                    });
                    // 如果需要显示子订单，可能需要特定的 API，或者复用 OrderList 的逻辑
                    // 这里的 /api/orders 已经被我们修改为只返回主订单
                    return {
                      data: res,
                      success: true,
                    };
                  }}
                  columns={[
                    { 
                        title: '订单号', 
                        dataIndex: 'order_no',
                        render: (text, record) => (
                            <a onClick={() => history.push(`/finance/order/detail/${record.id}`)}>{text}</a>
                        )
                    },
                    { title: '类型', dataIndex: 'order_type', valueEnum: {
                        new: { text: '新报' },
                        renew: { text: '续费' },
                        supplement: { text: '补缴' },
                    }},
                    { title: '总金额', dataIndex: 'total_fee', valueType: 'money' },
                    { title: '欠费', dataIndex: 'debt_amount', valueType: 'money' },
                    { title: '订单日期', dataIndex: 'order_date', valueType: 'date' },
                    { title: '状态', dataIndex: 'status', valueEnum: {
                        active: { text: '正常', status: 'Success' },
                        cancelled: { text: '作废', status: 'Error' },
                    }},
                    {
                        title: '操作',
                        valueType: 'option',
                        render: (_, record) => (
                            <a onClick={() => history.push(`/finance/order/detail/${record.id}`)}>详情</a>
                        )
                    }
                  ]}
                />
              ),
            },
            {
              label: '签到记录',
              key: 'attendances',
              children: (
                <ProTable
                  rowKey="id"
                  search={false}
                  toolBarRender={false}
                  request={async (params) => {
                    const res = await request(`/api/attendances`, {
                        params: { ...params, student_id: studentId }
                    });
                    return {
                      data: res,
                      success: true,
                    };
                  }}
                  columns={[
                    { title: '课程', dataIndex: ['course', 'name'] },
                    { title: '科目', dataIndex: ['course', 'subject', 'name'] },
                    { title: '教师', dataIndex: ['teacher', 'name'], render: (_, r) => r.teacher?.name || '-' },
                    { 
                        title: '子订单', 
                        dataIndex: ['order', 'order_no'], 
                        render: (_, r) => r.order ? (
                            <a onClick={() => history.push(`/finance/order/detail/${r.order.parent_id || r.order.id}`)}>{r.order.order_no}</a>
                        ) : '-' 
                    },
                    { title: '签到时间', dataIndex: 'attendance_date', valueType: 'date' },
                    { title: '扣除课时', dataIndex: 'hours_deducted', render: (val) => Number(val || 0).toFixed(2) },
                    { title: '状态', dataIndex: 'status', valueEnum: {
                      present: { text: '出勤', status: 'Success' },
                      absent: { text: '缺勤', status: 'Error' },
                      late: { text: '迟到', status: 'Warning' },
                      leave: { text: '请假', status: 'Default' },
                    }},
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>
    </PageContainer>
  );
};

export default StudentDetail;
