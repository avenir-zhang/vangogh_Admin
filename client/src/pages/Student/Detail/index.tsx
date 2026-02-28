import React, { useEffect, useState, useMemo } from 'react';
import { PageContainer, ProDescriptions, ProTable } from '@ant-design/pro-components';
import { Card, Button, message, Tabs, Tag, Space, Descriptions, Statistic, Row, Col } from 'antd';
import { useParams, history, request } from '@umijs/max';

const StudentDetail: React.FC = () => {
  const params = useParams<{ id: string }>();
  const studentId = params.id;
  const [student, setStudent] = useState<any>(null);
  const [studentCourses, setStudentCourses] = useState<any[]>([]);
  const [subjectStats, setSubjectStats] = useState<any>({});

  const fetchStudent = async () => {
    try {
      const data = await request(`/api/students/${studentId}`);
      setStudent(data);
    } catch (error) {
      message.error('获取学员详情失败');
    }
  };

  const fetchStudentCourses = async () => {
      try {
          const res = await request(`/api/students/${studentId}/courses`);
          setStudentCourses(res);
      } catch (error) {
          console.error(error);
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
      fetchStudentCourses();
      fetchSubjectStats();
    }
  }, [studentId]);

  // 按科目分组课程数据 (仅用于列表展示)
  const coursesBySubject = useMemo(() => {
      const grouped: Record<string, any[]> = {};

      studentCourses.forEach(sc => {
          const subjectName = sc.course?.subject?.name || '未知科目';
          if (!grouped[subjectName]) {
              grouped[subjectName] = [];
          }
          grouped[subjectName].push(sc);
      });

      return grouped;
  }, [studentCourses]);

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
                    {Object.keys(coursesBySubject).length === 0 && <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>暂无报名课程</div>}
                    
                    {Object.entries(coursesBySubject).map(([subjectName, courses]) => {
                         const data = subjectStats[subjectName] || { totalRegular: 0, totalGift: 0, consumed: 0, remaining: 0 };
                         return (
                         <Card 
                             key={subjectName} 
                             type="inner" 
                             title={<span style={{ fontWeight: 'bold' }}>{subjectName}</span>}
                             style={{ marginBottom: 20 }}
                         >
                             <Row gutter={16} style={{ marginBottom: 20 }}>
                                 <Col span={6}>
                                     <Statistic title="正价课时" value={data.totalRegular} />
                                 </Col>
                                 <Col span={6}>
                                     <Statistic title="赠送课时" value={data.totalGift} />
                                 </Col>
                                 <Col span={6}>
                                     <Statistic title="消耗课时" value={data.consumed} />
                                 </Col>
                                 <Col span={6}>
                                     <Statistic title="剩余课时" value={data.remaining} valueStyle={{ color: '#3f8600' }} />
                                 </Col>
                             </Row>
                             
                             <ProTable
                                 rowKey="id"
                                 search={false}
                                 toolBarRender={false}
                                 pagination={false}
                                 dataSource={courses}
                                 columns={[
                                     { title: '课程名称', dataIndex: ['course', 'name'], render: (_, r) => r.course?.name || '-' },
                                     // { title: '任课老师', dataIndex: ['course', 'teacher', 'name'], render: (_, r) => r.course?.teacher?.name || '-' }, // 移除老师
                                     { title: '订单编号', render: (_, r) => r.order?.order_no || '-' },
                                     { title: '正价课时', render: (_, r) => r.order?.regular_courses || 0 },
                                     { title: '赠送课时', render: (_, r) => r.order?.gift_courses || 0 },
                                     { title: '已消耗正价', render: (_, r) => r.order?.consumed_regular_courses || 0 },
                                     { title: '已消耗赠送', render: (_, r) => r.order?.consumed_gift_courses || 0 },
                                     { title: '剩余课时', dataIndex: 'remaining_courses' },
                                     { title: '过期时间', dataIndex: 'expire_date', valueType: 'date' },
                                     { title: '状态', dataIndex: 'status', valueEnum: {
                                     active: { text: '正常', status: 'Success' },
                                     expired: { text: '过期', status: 'Error' },
                                     finished: { text: '结课', status: 'Default' },
                                     }},
                                 ]}
                             />
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
                    { title: '订单号', dataIndex: 'order_no' },
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
                    { title: '子订单', dataIndex: ['order', 'order_no'], render: (_, r) => r.order?.order_no || '-' },
                    { title: '签到时间', dataIndex: 'attendance_date', valueType: 'date' },
                    { title: '扣除课时', render: (_, r) => r.status === 'present' ? '1' : '0' },
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
