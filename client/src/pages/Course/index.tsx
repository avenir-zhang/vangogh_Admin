import React, { useRef, useState, useEffect } from 'react';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { ProTable, DrawerForm, ProFormText, ProFormSelect, ProFormDigit, ProFormDatePicker, ProFormTimePicker, ProFormDependency } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Modal, DatePicker, Select, Table, InputNumber, Tag } from 'antd';
import { PlusOutlined, FormOutlined } from '@ant-design/icons';
import { request, history } from '@umijs/max';
import dayjs from 'dayjs';

type CourseItem = {
  id: number;
  name: string;
  subject: { id: number; name: string };
  teacher: { id: number; name: string };
  subject_id?: number;
  teacher_id?: number;
  schedule_type: string;
  schedule_days?: string;
  start_time: string;
  end_time: string;
  max_students: number;
  current_students: number;
  start_date: string;
  end_date: string;
  status: string;
};

const CourseList: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [subjects, setSubjects] = useState<{ label: string; value: number }[]>([]);
  const [teachers, setTeachers] = useState<{ label: string; value: number }[]>([]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [currentRow, setCurrentRow] = useState<CourseItem | undefined>(undefined);

  // 批量签到相关状态
  const [isAttendanceModalVisible, setIsAttendanceModalVisible] = useState(false);
  const [attendanceStudentsList, setAttendanceStudentsList] = useState<any[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<number, any>>({});
  const [attendanceDate, setAttendanceDate] = useState<dayjs.Dayjs>(dayjs());
  const [attendanceTeacherId, setAttendanceTeacherId] = useState<number>();
  const [currentCourseId, setCurrentCourseId] = useState<number>();
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [tempStudentId, setTempStudentId] = useState<number | undefined>(undefined);

  useEffect(() => {
    const fetchData = async () => {
      const subjectData = await request('/api/subjects');
      setSubjects(subjectData.map((item: any) => ({ label: item.name, value: item.id })));
      const teacherData = await request('/api/teachers');
      setTeachers(teacherData.map((item: any) => ({ label: item.name, value: item.id })));
    };
    fetchData();
  }, []);

  const fetchAvailableStudents = async (courseId: number) => {
      try {
          const res = await request(`/api/courses/${courseId}/available-students`);
          setAvailableStudents(res.map((s: any) => ({ label: s.name, value: s.id })));
      } catch (error) {
          message.error('获取可选学员失败');
      }
  };

  const handleBatchSignInClick = async (record: CourseItem) => {
      try {
          const courseId = record.id;
          setCurrentCourseId(courseId);
          const res = await request(`/api/courses/${courseId}/students`);
          setAttendanceStudentsList(res);
          // 默认全选
          setSelectedRowKeys(res.map((item: any) => item.student.id));
          // 重置表单数据
          setAttendanceData({});
          setAttendanceDate(dayjs());
          if (record.teacher?.id) {
              setAttendanceTeacherId(record.teacher.id);
          }
          setIsAttendanceModalVisible(true);
          // 预加载可选学员，方便添加临时学员
          fetchAvailableStudents(courseId);
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

  const updateAttendanceData = (studentId: number, field: string, value: any) => {
      setAttendanceData(prev => ({
          ...prev,
          [studentId]: {
              ...prev[studentId],
              [field]: value
          }
      }));
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
              course_id: Number(currentCourseId),
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
          actionRef.current?.reload();
      } catch (error) {
          message.error('批量签到失败');
      }
  };

  const columns: ProColumns<CourseItem>[] = [
    {
      title: '课程名称',
      dataIndex: 'name',
    },
    {
      title: '科目',
      dataIndex: 'subject_id',
      valueType: 'select',
      fieldProps: { options: subjects },
      render: (_, record) => record.subject?.name,
    },
    {
      title: '任课老师',
      dataIndex: 'teacher_id',
      valueType: 'select',
      fieldProps: { options: teachers },
      render: (_, record) => record.teacher?.name,
    },
    {
      title: '上课周期',
      dataIndex: 'schedule_type',
      valueEnum: {
        weekly: { text: '每周' },
        daily: { text: '每天' },
        biweekly: { text: '隔周' },
      },
    },
    {
      title: '上课日',
      dataIndex: 'schedule_days',
      valueType: 'select',
      valueEnum: {
        '1': '周一',
        '2': '周二',
        '3': '周三',
        '4': '周四',
        '5': '周五',
        '6': '周六',
        '0': '周日',
      },
      render: (_, record) => {
          if (!record.schedule_days) return '-';
          let days: string[] = [];
          if (typeof record.schedule_days === 'string') {
              days = (record.schedule_days as string).split(',');
          } else if (Array.isArray(record.schedule_days)) {
              days = record.schedule_days;
          }
          const map: any = { '1': '周一', '2': '周二', '3': '周三', '4': '周四', '5': '周五', '6': '周六', '0': '周日' };
          return days.map((d: string) => map[d]).join(', ');
      }
    },
    {
      title: '开始时间',
      dataIndex: 'start_time',
      valueType: 'time',
    },
    {
      title: '结束时间',
      dataIndex: 'end_time',
      valueType: 'time',
    },
    {
      title: '最大人数',
      dataIndex: 'max_students',
      valueType: 'digit',
    },
    {
      title: '当前人数',
      dataIndex: 'current_students',
      editable: false,
    },
    {
      title: '开课日期',
      dataIndex: 'start_date',
      valueType: 'date',
    },
    {
      title: '结课日期',
      dataIndex: 'end_date',
      valueType: 'date',
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueEnum: {
        active: { text: '进行中', status: 'Success' },
        finished: { text: '已结束', status: 'Default' },
        cancelled: { text: '已取消', status: 'Error' },
      },
    },
    {
      title: '操作',
      valueType: 'option',
      render: (text, record, _, action) => [
        <a
          key="signin"
          onClick={() => handleBatchSignInClick(record)}
        >
          签到
        </a>,
        <a
          key="detail"
          onClick={() => {
            history.push(`/academic/course/detail/${record.id}`);
          }}
        >
          详情
        </a>,
        <a
          key="editable"
          onClick={() => {
            setCurrentRow({
              ...record,
              subject_id: record.subject?.id,
              teacher_id: record.teacher?.id,
            });
            setDrawerVisible(true);
          }}
        >
          编辑
        </a>,
        <Popconfirm
          key="delete"
          title="确定删除吗？"
          onConfirm={async () => {
            await request(`/api/courses/${record.id}`, { method: 'DELETE' });
            message.success('删除成功');
            actionRef.current?.reload();
          }}
        >
          <a>删除</a>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <>
    <ProTable<CourseItem>
      columns={columns}
      actionRef={actionRef}
      cardBordered
      request={async (params) => {
        const msg = await request('/api/courses');
        return {
          data: msg,
          success: true,
        };
      }}
      editable={{
        type: 'multiple',
        onDelete: async (key, row) => {
          await request(`/api/courses/${row.id}`, { method: 'DELETE' });
          message.success('删除成功');
          actionRef.current?.reload();
        },
      }}
      rowKey="id"
      search={{
        labelWidth: 'auto',
      }}
      headerTitle="课程列表"
      toolBarRender={() => [
        <Button
          key="button"
          icon={<PlusOutlined />}
          onClick={() => {
            setCurrentRow(undefined);
            setDrawerVisible(true);
          }}
          type="primary"
        >
          新建
        </Button>,
      ]}
    />
    <DrawerForm<CourseItem>
      title={currentRow ? '编辑课程' : '新建课程'}
      open={drawerVisible}
      onOpenChange={setDrawerVisible}
      initialValues={currentRow}
      onFinish={async (values) => {
        if (currentRow) {
          await request(`/api/courses/${currentRow.id}`, {
            method: 'PATCH',
            data: values,
          });
          message.success('更新成功');
        } else {
          await request('/api/courses', {
            method: 'POST',
            data: values,
          });
          message.success('创建成功');
        }
        setDrawerVisible(false);
        actionRef.current?.reload();
        return true;
      }}
      drawerProps={{
        destroyOnClose: true,
      }}
    >
      <ProFormText
        name="name"
        label="课程名称"
        rules={[{ required: true, message: '请输入课程名称' }]}
      />
      <ProFormSelect
        name="subject_id"
        label="科目"
        options={subjects}
        rules={[{ required: true, message: '请选择科目' }]}
      />
      <ProFormSelect
        name="teacher_id"
        label="任课老师"
        options={teachers}
        rules={[{ required: true, message: '请选择任课老师' }]}
      />
      <ProFormSelect
        name="schedule_type"
        label="上课周期"
        valueEnum={{
          weekly: '每周',
          daily: '每天',
          biweekly: '隔周',
        }}
        rules={[{ required: true, message: '请选择上课周期' }]}
      />
      <ProFormDependency name={['schedule_type']}>
        {({ schedule_type }) => {
          if (schedule_type === 'weekly' || schedule_type === 'biweekly') {
            return (
              <ProFormSelect
                name="schedule_days"
                label="上课日"
                mode="multiple"
                valueEnum={{
                  '1': '周一',
                  '2': '周二',
                  '3': '周三',
                  '4': '周四',
                  '5': '周五',
                  '6': '周六',
                  '0': '周日',
                }}
                rules={[{ required: true, message: '请选择上课日' }]}
              />
            );
          }
          return null;
        }}
      </ProFormDependency>
      <ProFormTimePicker
        name="start_time"
        label="开始时间"
        rules={[{ required: true, message: '请选择开始时间' }]}
      />
      <ProFormDependency name={['start_time']}>
        {({ start_time }) => {
            return (
              <ProFormTimePicker
                name="end_time"
                label="结束时间"
                rules={[
                  { required: true, message: '请选择结束时间' },
                  {
                    validator: async (_, value) => {
                      if (!value || !start_time) return;
                      // ProFormTimePicker values are strings like "HH:mm:ss"
                      if (value < start_time) {
                        throw new Error('结束时间不能早于开始时间');
                      }
                    },
                  },
                ]}
              />
            );
        }}
      </ProFormDependency>
      <ProFormDigit
        name="max_students"
        label="最大人数"
        min={1}
        rules={[{ required: true, message: '请输入最大人数' }]}
      />
      <ProFormDatePicker
        name="start_date"
        label="开课日期"
        rules={[{ required: true, message: '请选择开课日期' }]}
      />
      <ProFormDatePicker
        name="end_date"
        label="结课日期"
        rules={[{ required: true, message: '请选择结课日期' }]}
      />
      <ProFormSelect
        name="status"
        label="状态"
        valueEnum={{
          active: '进行中',
          finished: '已结束',
          cancelled: '已取消',
        }}
        initialValue="active"
      />
    </DrawerForm>
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
                      options={teachers}
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
    </>
  );
};

export default CourseList;
