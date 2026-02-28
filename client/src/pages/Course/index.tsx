import React, { useRef, useState, useEffect } from 'react';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { ProTable, DrawerForm, ProFormText, ProFormSelect, ProFormDigit, ProFormDatePicker, ProFormTimePicker, ProFormDependency } from '@ant-design/pro-components';
import { Button, message, Popconfirm } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { request, history } from '@umijs/max';

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

  useEffect(() => {
    const fetchData = async () => {
      const subjectData = await request('/api/subjects');
      setSubjects(subjectData.map((item: any) => ({ label: item.name, value: item.id })));
      const teacherData = await request('/api/teachers');
      setTeachers(teacherData.map((item: any) => ({ label: item.name, value: item.id })));
    };
    fetchData();
  }, []);

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
    </>
  );
};

export default CourseList;
