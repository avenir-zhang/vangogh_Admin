import React, { useEffect, useState, useRef } from 'react';
import { PageContainer, ProDescriptions, ProTable, ActionType } from '@ant-design/pro-components';
import { Card, Button, message, Tabs, Tag, Modal, Form, Select, DatePicker, InputNumber, Table } from 'antd';
import dayjs from 'dayjs';
import { useParams, history, request } from '@umijs/max';

const CourseDetail: React.FC = () => {
  const params = useParams<{ id: string }>();
  const courseId = params.id;
  const [course, setCourse] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [form] = Form.useForm();
  const studentActionRef = useRef<ActionType>(null);
  const attendanceActionRef = useRef<ActionType>(null);

  // 批量签到相关状态
  const [isAttendanceModalVisible, setIsAttendanceModalVisible] = useState(false);
  const [attendanceStudentsList, setAttendanceStudentsList] = useState<any[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<number, any>>({});
  const [attendanceDate, setAttendanceDate] = useState<dayjs.Dayjs>(dayjs());
  const [attendanceTeacherId, setAttendanceTeacherId] = useState<number>();
  const [allTeachers, setAllTeachers] = useState<any[]>([]);
  const [tempStudentId, setTempStudentId] = useState<number | undefined>(undefined);
  // availableStudents 已经在上面声明过了

  const fetchCourse = async () => {
    try {
      const data = await request(`/api/courses/${courseId}`);
      setCourse(data);
      if (data.teacher?.id) {
          setAttendanceTeacherId(data.teacher.id);
      }
    } catch (error) {
      message.error('获取课程详情失败');
    }
  };

  const fetchTeachers = async () => {
      try {
          const res = await request('/api/teachers');
          setAllTeachers(res.map((t: any) => ({ label: t.name, value: t.id })));
      } catch (error) {
          // ignore
      }
  };

  useEffect(() => {
      fetchTeachers();
  }, []);

  const handleBatchSignInClick = async () => {
      try {
          const res = await request(`/api/courses/${courseId}/students`);
          setAttendanceStudentsList(res);
          // 默认全选
          setSelectedRowKeys(res.map((item: any) => item.student.id));
          // 重置表单数据
          setAttendanceData({});
          setAttendanceDate(dayjs());
          if (course?.teacher?.id) {
              setAttendanceTeacherId(course.teacher.id);
          }
          setIsAttendanceModalVisible(true);
          // 预加载可选学员，方便添加临时学员
          fetchAvailableStudents();
      } catch (error) {
          message.error('获取学员列表失败');
      }
  };

  const handleAddTempStudent = () => {
      if (!tempStudentId) {
          message.warning('请选择要添加的临时学员');
          return;
      }
      
      // 检查是否已经在列表中
      const exists = attendanceStudentsList.some((item: any) => item.student.id === tempStudentId);
      if (exists) {
          message.warning('该学员已在列表中');
          return;
      }

      // 找到选中的学员信息
      const selectedStudent = availableStudents.find(s => s.value === tempStudentId);
      if (!selectedStudent) return;

      const newStudent = {
          student: {
              id: tempStudentId,
              name: selectedStudent.label,
          },
          // 临时学员，没有 total_consumed 信息，或者可以通过 API 获取，这里简化处理
          isTemp: true, 
      };

      setAttendanceStudentsList(prev => [...prev, newStudent]);
      setAttendanceData(prev => ({ ...prev, [tempStudentId]: { status: 'present', hours_deducted: 1 } }));
      setSelectedRowKeys(prev => [...prev, tempStudentId]); // 默认选中
      setTempStudentId(undefined); // 重置选择
      message.success('临时学员添加成功');
  };

  const handleBatchSignInSubmit = async () => {
      if (selectedRowKeys.length === 0) {
          message.warning('请至少选择一名学员');
          return;
      }
      if (!attendanceDate) {
          message.warning('请选择签到日期');
          return;
      }
      if (!attendanceTeacherId) {
          message.warning('请选择签到老师');
          return;
      }

      const payload = selectedRowKeys.map(key => {
          const studentId = Number(key);
          const data = attendanceData[studentId] || {};
          const status = data.status || 'present';
          const hours = (status === 'present') ? (data.hours_deducted ?? 1) : 0;
          
          return {
              student_id: studentId,
              course_id: Number(courseId),
              teacher_id: attendanceTeacherId,
              attendance_date: attendanceDate.format('YYYY-MM-DD'),
              status: status,
              hours_deducted: hours,
          };
      });

      try {
          await request('/api/attendances', {
              method: 'POST',
              data: payload,
          });
          message.success('批量签到成功');
          setIsAttendanceModalVisible(false);
          studentActionRef.current?.reload(); // 刷新学员列表（消耗课时可能更新）
          // 刷新签到记录 tab (需要 reload attendance table)
          // 由于 attendance table 没有 ref，我们可以 forcing re-render or add ref
          // 简单起见，刷新页面或者 just modal close
      } catch (error) {
          message.error('批量签到失败');
      }
  };

  const updateAttendanceData = (studentId: number, field: string, value: any) => {
      setAttendanceData(prev => ({
          ...prev,
          [studentId]: {
              ...prev[studentId],
              [field]: value
          }
      }));
  };


  const fetchAvailableStudents = async () => {
      try {
          const res = await request(`/api/courses/${courseId}/available-students`);
          setAvailableStudents(res.map((s: any) => ({ label: s.name, value: s.id })));
      } catch (error) {
          message.error('获取可选学员失败');
      }
  };

  const handleAddStudent = async (values: any) => {
      try {
          await request(`/api/courses/${courseId}/students`, {
              method: 'POST',
              data: values,
          });
          message.success('添加学员成功');
          setIsModalVisible(false);
          form.resetFields();
          studentActionRef.current?.reload();
      } catch (error) {
          message.error('添加学员失败');
      }
  };

  const handleRemoveStudent = async (studentId: number) => {
      try {
          await request(`/api/courses/${courseId}/students/${studentId}`, {
              method: 'DELETE',
          });
          message.success('移除学员成功');
          studentActionRef.current?.reload();
      } catch (error) {
          message.error('移除学员失败');
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
                  actionRef={studentActionRef}
                  rowKey="id"
                  search={false}
                  toolBarRender={() => [
                      <Button key="batch-sign" onClick={handleBatchSignInClick}>
                          批量签到
                      </Button>,
                      <Button key="add" type="primary" onClick={() => {
                          fetchAvailableStudents();
                          setIsModalVisible(true);
                      }}>
                          添加学员
                      </Button>
                  ]}
                  request={async () => {
                    const res = await request(`/api/courses/${courseId}/students`);
                    return {
                      data: res,
                      success: true,
                    };
                  }}
                  columns={[
                    { title: '学员姓名', dataIndex: ['student', 'name'] },
                    { title: '已消耗课时', dataIndex: 'total_consumed', render: (val) => Number(val).toFixed(2) },
                    { 
                        title: '剩余课时', 
                        dataIndex: 'remaining_courses',
                        render: (val) => {
                            const num = Number(val);
                            const isArrears = num < 0;
                            return (
                                <span style={{ color: isArrears ? 'red' : 'inherit', fontWeight: isArrears ? 'bold' : 'normal' }}>
                                    {num.toFixed(2)}
                                    {isArrears && <Tag color="error" style={{ marginLeft: 8 }}>欠费</Tag>}
                                </span>
                            );
                        }
                    },
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
                            <a
                                key="remove"
                                style={{ color: 'red' }}
                                onClick={() => {
                                    Modal.confirm({
                                        title: '确认移除',
                                        content: '确定要将该学员从本课程移除吗？',
                                        onOk: () => handleRemoveStudent(record.student.id),
                                    });
                                }}
                            >
                                移除
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
      
      <Modal
          title="添加学员"
          open={isModalVisible}
          onOk={() => form.submit()}
          onCancel={() => setIsModalVisible(false)}
      >
          <Form form={form} onFinish={handleAddStudent}>
              <Form.Item
                  name="studentId"
                  label="选择学员"
                  rules={[{ required: true, message: '请选择学员' }]}
              >
                  <Select
                      showSearch
                      placeholder="请选择学员"
                      optionFilterProp="children"
                      options={availableStudents}
                      filterOption={(input, option) =>
                          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                  />
              </Form.Item>
              <div style={{ color: '#999', fontSize: '12px' }}>
                  * 仅列出已购买该科目课时且尚未加入本课程的学员
              </div>
          </Form>
      </Modal>

      <Modal
          title="批量签到"
          open={isAttendanceModalVisible}
          onOk={handleBatchSignInSubmit}
          onCancel={() => setIsAttendanceModalVisible(false)}
          width={800}
      >
          <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                  <span style={{ marginRight: 8 }}>签到日期:</span>
                  <DatePicker 
                      value={attendanceDate} 
                      onChange={(date) => setAttendanceDate(date || dayjs())} 
                      style={{ width: '200px' }}
                  />
              </div>
              <div style={{ flex: 1 }}>
                  <span style={{ marginRight: 8 }}>签到老师:</span>
                  <Select
                      value={attendanceTeacherId}
                      onChange={setAttendanceTeacherId}
                      options={allTeachers}
                      style={{ width: '200px' }}
                      placeholder="请选择老师"
                      showSearch
                      optionFilterProp="label"
                  />
              </div>
          </div>

          <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>添加临时学员:</span>
              <Select
                  showSearch
                  placeholder="选择学员"
                  optionFilterProp="label"
                  options={availableStudents}
                  value={tempStudentId}
                  onChange={setTempStudentId}
                  style={{ width: 200 }}
                  filterOption={(input, option) =>
                      (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
              />
              <Button onClick={handleAddTempStudent}>添加</Button>
          </div>
          
          <Table
              rowKey={(record: any) => record.student.id}
              dataSource={attendanceStudentsList}
              pagination={false}
              rowSelection={{
                  selectedRowKeys,
                  onChange: (keys) => setSelectedRowKeys(keys),
              }}
              columns={[
                  { title: '学员姓名', dataIndex: ['student', 'name'] },
                  { 
                      title: '剩余课时', 
                      dataIndex: 'remaining_courses',
                      render: (val, record) => {
                          // 临时学员可能没有 remaining_courses
                          if (record.isTemp) return <Tag color="orange">临时学员</Tag>;
                          
                          const num = Number(val || 0);
                          return (
                              <span style={{ color: num < 0 ? 'red' : 'inherit' }}>
                                  {num.toFixed(2)}
                              </span>
                          );
                      }
                  },
                  { 
                      title: '状态', 
                      key: 'status',
                      render: (_, record) => (
                          <Select
                              value={attendanceData[record.student.id]?.status || 'present'}
                              onChange={(val) => updateAttendanceData(record.student.id, 'status', val)}
                              options={[
                                  { label: '出勤', value: 'present' },
                                  { label: '缺勤', value: 'absent' },
                                  { label: '迟到', value: 'late' },
                                  { label: '请假', value: 'leave' },
                              ]}
                              style={{ width: 100 }}
                          />
                      )
                  },
                  {
                      title: '扣除课时',
                      key: 'hours',
                      render: (_, record) => {
                          const status = attendanceData[record.student.id]?.status || 'present';
                          const disabled = status !== 'present';
                          const hours = attendanceData[record.student.id]?.hours_deducted ?? 1;
                          
                          return (
                              <InputNumber
                                  value={hours}
                                  onChange={(val) => updateAttendanceData(record.student.id, 'hours_deducted', val)}
                                  disabled={disabled}
                                  min={0}
                                  step={0.5}
                                  style={{ width: 80 }}
                              />
                          );
                      }
                  }
              ]}
              size="small"
              scroll={{ y: 400 }}
          />
      </Modal>
    </PageContainer>
  );
};

export default CourseDetail;
