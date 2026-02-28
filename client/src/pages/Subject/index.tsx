import React, { useRef, useState } from 'react';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { ProTable, DrawerForm, ProFormText, ProFormDigit, ProFormSelect } from '@ant-design/pro-components';
import { Button, message, Popconfirm } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { request } from '@umijs/max';

type SubjectItem = {
  id: number;
  name: string;
  price: number;
  status: string;
};

const SubjectList: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [currentRow, setCurrentRow] = useState<SubjectItem | undefined>(undefined);

  const columns: ProColumns<SubjectItem>[] = [
    {
      title: '科目名称',
      dataIndex: 'name',
    },
    {
      title: '课程价格',
      dataIndex: 'price',
      valueType: 'money',
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueEnum: {
        active: { text: '启用', status: 'Success' },
        inactive: { text: '停用', status: 'Error' },
      },
    },
    {
      title: '操作',
      valueType: 'option',
      render: (text, record, _, action) => [
        <a
          key="editable"
          onClick={() => {
            setCurrentRow(record);
            setDrawerVisible(true);
          }}
        >
          编辑
        </a>,
        <Popconfirm
          key="delete"
          title="确定删除吗？"
          onConfirm={async () => {
            await request(`/api/subjects/${record.id}`, { method: 'DELETE' });
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
    <ProTable<SubjectItem>
      columns={columns}
      actionRef={actionRef}
      cardBordered
      request={async (params) => {
        const msg = await request('/api/subjects');
        return {
          data: msg,
          success: true,
        };
      }}
      editable={{
        type: 'multiple',
        onDelete: async (key, row) => {
          await request(`/api/subjects/${row.id}`, { method: 'DELETE' });
          message.success('删除成功');
          actionRef.current?.reload();
        },
      }}
      rowKey="id"
      search={false}
      headerTitle="科目列表"
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
    <DrawerForm<SubjectItem>
      title={currentRow ? '编辑科目' : '新建科目'}
      open={drawerVisible}
      onOpenChange={setDrawerVisible}
      initialValues={currentRow}
      onFinish={async (values) => {
        if (currentRow) {
          await request(`/api/subjects/${currentRow.id}`, {
            method: 'PATCH',
            data: values,
          });
          message.success('更新成功');
        } else {
          await request('/api/subjects', {
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
        label="科目名称"
        rules={[{ required: true, message: '请输入科目名称' }]}
      />
      <ProFormDigit
        name="price"
        label="课程价格"
        min={0}
        fieldProps={{ precision: 2 }}
        rules={[{ required: true, message: '请输入课程价格' }]}
      />
      <ProFormSelect
        name="status"
        label="状态"
        valueEnum={{
          active: '启用',
          inactive: '停用',
        }}
        initialValue="active"
      />
    </DrawerForm>
    </>
  );
};

export default SubjectList;
