import React, { useRef, useState, useEffect } from 'react';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { ProTable, DrawerForm, ProFormSelect, ProFormDatePicker, ProFormTimePicker, ProFormTextArea } from '@ant-design/pro-components';
import { Button, message, Popconfirm } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { request } from '@umijs/max';

type AttendanceItem = {
  id: number;
  student: { id: number; name: string };
  course: { id: number; name: string };
  teacher: { id: number; name: string };
  student_id?: number;
  course_id?: number;
  teacher_id?: number;
  attendance_date: string;
  check_in_time: string;
  status: string;
  remark: string;
};

const AttendanceList: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [students, setStudents] = useState<{ label: string; value: number }[]>([]);
  const [courses, setCourses] = useState<{ label: string; value: number }[]>([]);
  const [teachers, setTeachers] = useState<{ label: string; value: number }[]>([]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [currentRow, setCurrentRow] = useState<AttendanceItem | undefined>(undefined);

  useEffect(() => {
    const fetchData = async () => {
      const studentData = await request('/api/students');
      setStudents(studentData.map((item: any) => ({ label: item.name, value: item.id })));
      const courseData = await request('/api/courses');
      setCourses(courseData.map((item: any) => ({ label: item.name, value: item.id })));
      const teacherData = await request('/api/teachers');
      setTeachers(teacherData.map((item: any) => ({ label: item.name, value: item.id })));
    };
    fetchData();
  }, []);

  const columns: ProColumns<AttendanceItem>[] = [
    {
      title: '学员',
      dataIndex: 'student_id',
      valueType: 'select',
      fieldProps: { options: students },
      render: (_, record) => record.student?.name,
    },
    {
      title: '课程',
      dataIndex: 'course_id',
      valueType: 'select',
      fieldProps: { options: courses },
      render: (_, record) => record.course?.name,
    },
    {
      title: '教师',
      dataIndex: 'teacher_id',
      valueType: 'select',
      fieldProps: { options: teachers },
      render: (_, record) => record.teacher?.name,
    },
    {
      title: '签到日期',
      dataIndex: 'attendance_date',
      valueType: 'date',
    },
    {
      title: '签到时间',
      dataIndex: 'check_in_time',
      valueType: 'time',
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueEnum: {
        present: { text: '出勤', status: 'Success' },
        absent: { text: '缺勤', status: 'Error' },
        late: { text: '迟到', status: 'Warning' },
        leave: { text: '请假', status: 'Default' },
      },
    },
    {
      title: '备注',
      dataIndex: 'remark',
    },
    {
      title: '操作',
      valueType: 'option',
      render: (text, record, _, action) => [
        <a
          key="editable"
          onClick={() => {
            setCurrentRow({
              ...record,
              student_id: record.student?.id,
              course_id: record.course?.id,
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
            await request(`/api/attendances/${record.id}`, { method: 'DELETE' });
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
    <ProTable<AttendanceItem>
      columns={columns}
      actionRef={actionRef}
      cardBordered
      request={async (params) => {
        const { current, pageSize, ...search } = params;
        const msg = await request('/api/attendances', {
          params: {
            ...search,
          },
        });
        return {
          data: msg,
          success: true,
        };
      }}
      editable={{
        type: 'multiple',
        onDelete: async (key, row) => {
          await request(`/api/attendances/${row.id}`, { method: 'DELETE' });
          message.success('删除成功');
          actionRef.current?.reload();
        },
      }}
      rowKey="id"
      search={{
        labelWidth: 'auto',
      }}
      headerTitle="签到记录"
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
          签到
        </Button>,
      ]}
    />
    <DrawerForm<AttendanceItem>
      title={currentRow ? '编辑签到' : '新建签到'}
      open={drawerVisible}
      onOpenChange={setDrawerVisible}
      initialValues={currentRow}
      onFinish={async (values) => {
        if (currentRow) {
          await request(`/api/attendances/${currentRow.id}`, {
            method: 'PATCH',
            data: values,
          });
          message.success('更新成功');
        } else {
          await request('/api/attendances', {
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
      <ProFormSelect
        name="student_id"
        label="学员"
        options={students}
        rules={[{ required: true, message: '请选择学员' }]}
      />
      <ProFormSelect
        name="course_id"
        label="课程"
        options={courses}
        rules={[{ required: true, message: '请选择课程' }]}
      />
      <ProFormSelect
        name="teacher_id"
        label="教师"
        options={teachers}
        rules={[{ required: true, message: '请选择教师' }]}
      />
      <ProFormDatePicker
        name="attendance_date"
        label="签到日期"
        rules={[{ required: true, message: '请选择签到日期' }]}
      />
      <ProFormTimePicker
        name="check_in_time"
        label="签到时间"
        rules={[{ required: true, message: '请选择签到时间' }]}
      />
      <ProFormSelect
        name="status"
        label="状态"
        valueEnum={{
          present: '出勤',
          absent: '缺勤',
          late: '迟到',
          leave: '请假',
        }}
        initialValue="present"
      />
      <ProFormTextArea
        name="remark"
        label="备注"
      />
    </DrawerForm>
    </>
  );
};

export default AttendanceList;
