import React, { useRef, useState } from 'react';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { ProTable, DrawerForm, ProFormText, ProFormSelect, ProFormDatePicker, ProFormTextArea } from '@ant-design/pro-components';
import { Button, message, Popconfirm } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { request, history } from '@umijs/max';

type StudentItem = {
  id: number;
  name: string;
  nickname: string;
  gender: string;
  id_card: string;
  birth_date: string;
  age: number;
  address: string;
  emergency_contact: string;
  emergency_phone: string;
  registration_date: string;
  status: string;
  remark: string;
  deleted_at?: string;
};

const StudentList: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [currentRow, setCurrentRow] = useState<StudentItem | undefined>(undefined);

  const columns: ProColumns<StudentItem>[] = [
    {
      title: '姓名',
      dataIndex: 'name',
    },
    {
      title: '昵称',
      dataIndex: 'nickname',
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
      title: '身份证号',
      dataIndex: 'id_card',
    },
    {
      title: '出生日期',
      dataIndex: 'birth_date',
      valueType: 'date',
      search: false,
    },
    {
      title: '年龄',
      dataIndex: 'age',
      search: false,
      hideInForm: true,
    },
    {
      title: '紧急联系人',
      dataIndex: 'emergency_contact',
    },
    {
      title: '联系电话',
      dataIndex: 'emergency_phone',
    },
    {
      title: '注册时间',
      dataIndex: 'registration_date',
      valueType: 'date',
      search: false,
      hideInForm: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueEnum: {
        active: { text: '在读', status: 'Success' },
        inactive: { text: '停课', status: 'Error' },
        graduated: { text: '毕业', status: 'Default' },
      },
    },
    {
      title: '包含已删除',
      dataIndex: 'includeDeleted',
      valueType: 'switch',
      hideInTable: true,
      hideInForm: true,
    },
    {
      title: '操作',
      valueType: 'option',
      render: (text, record, _, action) => {
        const isDeleted = record.deleted_at;
        const actions = [
          <a
            key="detail"
            onClick={() => {
              history.push(`/academic/student/detail/${record.id}`);
            }}
          >
            详情
          </a>,
          <a
            key="editable"
            onClick={() => {
              setCurrentRow(record);
              setDrawerVisible(true);
            }}
          >
            编辑
          </a>,
        ];

        if (isDeleted) {
           actions.push(
             <Popconfirm
               key="restore"
               title="确定恢复吗？"
               onConfirm={async () => {
                 await request(`/api/students/${record.id}/restore`, { method: 'POST' });
                 message.success('恢复成功');
                 actionRef.current?.reload();
               }}
             >
               <a>恢复</a>
             </Popconfirm>
           );
        } else {
            actions.push(
                <Popconfirm
                key="delete"
                title="确定删除吗？"
                onConfirm={async () => {
                    await request(`/api/students/${record.id}`, { method: 'DELETE' });
                    message.success('删除成功');
                    actionRef.current?.reload();
                }}
                >
                <a>删除</a>
                </Popconfirm>
            );
        }
        return actions;
      },
    },
  ];

  return (
    <>
    <ProTable<StudentItem>
      columns={columns}
      actionRef={actionRef}
      cardBordered
      request={async (params) => {
        const { current, pageSize, ...search } = params;
        const msg = await request('/api/students', {
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
          await request(`/api/students/${row.id}`, { method: 'DELETE' });
          message.success('删除成功');
          actionRef.current?.reload();
        },
      }}
      columnsState={{
        persistenceKey: 'pro-table-singe-demos',
        persistenceType: 'localStorage',
      }}
      rowKey="id"
      search={{
        labelWidth: 'auto',
      }}
      options={{
        setting: {
          listsHeight: 400,
        },
      }}
      form={{
        // 由于配置了 transform，提交的参与与定义的不同这里需要转化一下
        syncToUrl: (values, type) => {
          if (type === 'get') {
            return {
              ...values,
              created_at: [values.startTime, values.endTime],
            };
          }
          return values;
        },
      }}
      pagination={{
        pageSize: 10,
      }}
      dateFormatter="string"
      headerTitle="学员列表"
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
    <DrawerForm<StudentItem>
      title={currentRow ? '编辑学员' : '新建学员'}
      open={drawerVisible}
      onOpenChange={setDrawerVisible}
      initialValues={currentRow}
      onFinish={async (values) => {
        if (currentRow) {
          await request(`/api/students/${currentRow.id}`, {
            method: 'PATCH',
            data: values,
          });
          message.success('更新成功');
        } else {
          await request('/api/students', {
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
      <ProFormText
        name="nickname"
        label="昵称"
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
        name="id_card"
        label="身份证号"
      />
      <ProFormDatePicker
        name="birth_date"
        label="出生日期"
      />
      <ProFormText
        name="address"
        label="家庭住址"
      />
      <ProFormText
        name="emergency_contact"
        label="紧急联系人"
      />
      <ProFormText
        name="emergency_phone"
        label="联系电话"
      />
      <ProFormDatePicker
        name="registration_date"
        label="注册时间"
      />
      <ProFormSelect
        name="status"
        label="状态"
        valueEnum={{
          active: '在读',
          inactive: '停课',
          graduated: '毕业',
        }}
        initialValue="active"
      />
      <ProFormTextArea
        name="remark"
        label="备注"
      />
    </DrawerForm>
    </>
  );
};

export default StudentList;
