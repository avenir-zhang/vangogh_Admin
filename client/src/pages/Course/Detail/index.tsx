import React, { useEffect, useState } from 'react';
import { PageContainer, ProDescriptions, ProTable } from '@ant-design/pro-components';
import { Card, Button, message, Tabs, Tag } from 'antd';
import { useParams, history, request } from '@umijs/max';

const CourseDetail: React.FC = () => {
  const params = useParams<{ id: string }>();
  const courseId = params.id;
  const [course, setCourse] = useState<any>(null);

  const fetchCourse = async () => {
    try {
      const data = await request(`/api/courses/${courseId}`);
      setCourse(data);
    } catch (error) {
      message.error('获取课程详情失败');
    }
  };

  useEffect(() => {
    if (courseId) {
      fetchCourse();
    }
  }, [courseId]);

  if (!course) {
    return <PageContainer loading />;
  }

  return (
    <PageContainer
      title={course.name}
      extra={[
        <Button key="back" onClick={() => history.push('/academic/course')}>返回列表</Button>,
      ]}
    >
      <Card bordered={false} style={{ marginBottom: 24 }}>
        <ProDescriptions column={3} dataSource={course}>
          <ProDescriptions.Item label="科目" dataIndex={['subject', 'name']} />
          <ProDescriptions.Item label="任课老师" dataIndex={['teacher', 'name']} />
          <ProDescriptions.Item label="状态" dataIndex="status" valueEnum={{
            active: { text: '进行中', status: 'Success' },
            finished: { text: '已结束', status: 'Default' },
            cancelled: { text: '已取消', status: 'Error' },
          }} />
          <ProDescriptions.Item label="上课周期" dataIndex="schedule_type" valueEnum={{
            weekly: '每周',
            daily: '每天',
            biweekly: '隔周',
          }} />
          <ProDescriptions.Item label="上课日" dataIndex="schedule_days" render={(val) => {
              if (!val) return '-';
              const days = (typeof val === 'string' ? val.split(',') : val) as string[];
              const map: any = { '1': '周一', '2': '周二', '3': '周三', '4': '周四', '5': '周五', '6': '周六', '0': '周日' };
              return days.map(d => map[d]).join(', ');
          }} />
          <ProDescriptions.Item label="上课时间">
              {course.start_time} - {course.end_time}
          </ProDescriptions.Item>
          <ProDescriptions.Item label="学生人数">
              {course.current_students} / {course.max_students}
          </ProDescriptions.Item>
          <ProDescriptions.Item label="开课日期" dataIndex="start_date" valueType="date" />
          <ProDescriptions.Item label="结课日期" dataIndex="end_date" valueType="date" />
        </ProDescriptions>
      </Card>

      <Card bordered={false}>
        <Tabs
          items={[
            {
              label: '学员列表',
              key: 'students',
              children: (
                <ProTable
                  rowKey="id"
                  search={false}
                  toolBarRender={false}
                  request={async () => {
                    const res = await request(`/api/courses/${courseId}/students`);
                    return {
                      data: res,
                      success: true,
                    };
                  }}
                  columns={[
                    { title: '学员姓名', dataIndex: ['student', 'name'] },
                    { title: '已消耗正价', dataIndex: 'total_consumed_regular' },
                    { title: '已消耗赠送', dataIndex: 'total_consumed_gift' },
                    {
                        title: '操作',
                        valueType: 'option',
                        render: (text, record, _, action) => [
                            <a
                                key="detail"
                                onClick={() => {
                                    history.push(`/academic/student/detail/${record.student.id}`);
                                }}
                            >
                                详情
                            </a>,
                        ],
                    },
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
                  request={async () => {
                    const res = await request(`/api/courses/${courseId}/attendances`);
                    return {
                      data: res,
                      success: true,
                    };
                  }}
                  columns={[
                    { title: '学员姓名', dataIndex: ['student', 'name'] },
                    { title: '签到时间', dataIndex: 'attendance_date', valueType: 'date' },
                    { title: '状态', dataIndex: 'status', valueEnum: {
                      present: { text: '出勤', status: 'Success' },
                      absent: { text: '缺勤', status: 'Error' },
                      late: { text: '迟到', status: 'Warning' },
                      leave: { text: '请假', status: 'Default' },
                    }},
                    { title: '操作人', dataIndex: ['teacher', 'name'], render: (_, r) => r.teacher?.name || '-' },
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

export default CourseDetail;
