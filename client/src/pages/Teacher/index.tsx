import React, { useRef, useState, useEffect } from 'react';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { ProTable, DrawerForm, ProFormText, ProFormSelect } from '@ant-design/pro-components';
import { Button, message, Popconfirm } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { request } from '@umijs/max';

type TeacherItem = {
  id: number;
  name: string;
  gender: string;
  phone: string;
  id_card: string;
  status: string;
  subjects: { id: number; name: string }[];
  subjectIds?: number[];
};

const TeacherList: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [subjects, setSubjects] = useState<{ label: string; value: number }[]>([]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [currentRow, setCurrentRow] = useState<TeacherItem | undefined>(undefined);

  useEffect(() => {
    const fetchSubjects = async () => {
      const data = await request('/api/subjects');
      setSubjects(data.map((item: any) => ({ label: item.name, value: item.id })));
    };
    fetchSubjects();
  }, []);

  const columns: ProColumns<TeacherItem>[] = [
    {
      title: '姓名',
      dataIndex: 'name',
    },
    {
      title: '性别',
      dataIndex: 'gender',
      valueEnum: {
        '男': { text: '男' },
        '女': { text: '女' },
      },
    },
    {
      title: '联系方式',
      dataIndex: 'phone',
    },
    {
      title: '身份证号',
      dataIndex: 'id_card',
    },
    {
      title: '授课科目',
      dataIndex: 'subjectIds',
      valueType: 'select',
      fieldProps: {
        mode: 'multiple',
        options: subjects,
      },
      render: (_, record) => record.subjects?.map((s) => s.name).join(', '),
      hideInForm: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueEnum: {
        active: { text: '在职', status: 'Success' },
        inactive: { text: '离职', status: 'Error' },
      },
    },
    {
      title: '操作',
      valueType: 'option',
      render: (text, record, _, action) => [
        <a
          key="editable"
          onClick={() => {
            // 需要把 subjects 转换为 subjectIds 供编辑回显
            const subjectIds = record.subjects?.map((s) => s.id);
            setCurrentRow({ ...record, subjectIds });
            setDrawerVisible(true);
          }}
        >
          编辑
        </a>,
        <Popconfirm
          key="delete"
          title="确定删除吗？"
          onConfirm={async () => {
            await request(`/api/teachers/${record.id}`, { method: 'DELETE' });
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
    <ProTable<TeacherItem>
      columns={columns}
      actionRef={actionRef}
      cardBordered
      request={async (params) => {
        const { current, pageSize, ...search } = params;
        const msg = await request('/api/teachers', {
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
          await request(`/api/teachers/${row.id}`, { method: 'DELETE' });
          message.success('删除成功');
          actionRef.current?.reload();
        },
      }}
      rowKey="id"
      search={{
        labelWidth: 'auto',
      }}
      headerTitle="教师列表"
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
    <DrawerForm<TeacherItem>
      title={currentRow ? '编辑教师' : '新建教师'}
      open={drawerVisible}
      onOpenChange={setDrawerVisible}
      initialValues={currentRow}
      onFinish={async (values) => {
        if (currentRow) {
          await request(`/api/teachers/${currentRow.id}`, {
            method: 'PATCH',
            data: values,
          });
          message.success('更新成功');
        } else {
          await request('/api/teachers', {
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
        label="姓名"
        rules={[{ required: true, message: '请输入姓名' }]}
      />
      <ProFormSelect
        name="gender"
        label="性别"
        valueEnum={{
          '男': '男',
          '女': '女',
        }}
        rules={[{ required: true, message: '请选择性别' }]}
      />
      <ProFormText
        name="phone"
        label="联系方式"
        rules={[{ required: true, message: '请输入联系方式' }]}
      />
      <ProFormText
        name="id_card"
        label="身份证号"
      />
      <ProFormSelect
        name="subjectIds"
        label="授课科目"
        mode="multiple"
        options={subjects}
        rules={[{ required: true, message: '请选择授课科目' }]}
      />
      <ProFormSelect
        name="status"
        label="状态"
        valueEnum={{
          active: '在职',
          inactive: '离职',
        }}
        initialValue="active"
      />
    </DrawerForm>
    </>
  );
};

export default TeacherList;
