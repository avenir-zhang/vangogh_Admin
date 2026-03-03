import { PageContainer, ProTable, ProColumns, ModalForm, ProFormText, ProFormSelect } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Tag, Form } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useRef, useState, useEffect } from 'react';
import { request } from '@umijs/max';

export default function UserList() {
  const actionRef = useRef<any>();
  const [modalVisible, setModalVisible] = useState(false);
  const [currentRow, setCurrentRow] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [form] = Form.useForm();

  useEffect(() => {
    request('/api/roles').then((res) => {
      setRoles(res);
    });
  }, []);

  const handleAdd = async (fields: any) => {
    try {
      await request('/api/users', {
        method: 'POST',
        data: {
            username: fields.username,
            password_hash: fields.password, // map to backend field
            role_id: fields.role_id,
        },
      });
      message.success('添加成功');
      setModalVisible(false);
      actionRef.current?.reload();
    } catch (error) {
      message.error('添加失败');
    }
  };

  const handleUpdate = async (fields: any) => {
    try {
      const payload: any = {
          role_id: fields.role_id,
      };
      if (fields.password) {
          payload.password_hash = fields.password;
      }
      
      await request(`/api/users/${currentRow.id}`, {
        method: 'PATCH',
        data: payload,
      });
      message.success('更新成功');
      setModalVisible(false);
      setCurrentRow(null);
      actionRef.current?.reload();
    } catch (error) {
      message.error('更新失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await request(`/api/users/${id}`, {
        method: 'DELETE',
      });
      message.success('删除成功');
      actionRef.current?.reload();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const columns: ProColumns<any>[] = [
    { title: '用户名', dataIndex: 'username' },
    { 
        title: '角色', 
        dataIndex: ['user_role', 'display_name'],
        render: (_, record) => record.user_role ? <Tag color="blue">{record.user_role.display_name}</Tag> : '-'
    },
    { title: '创建时间', dataIndex: 'created_at', valueType: 'dateTime' },
    {
      title: '操作',
      valueType: 'option',
      render: (_, record) => [
        <a
          key="edit"
          onClick={() => {
            setCurrentRow(record);
            form.setFieldsValue({
                username: record.username,
                role_id: record.role_id,
            });
            setModalVisible(true);
          }}
        >
          编辑
        </a>,
        <Popconfirm
          key="delete"
          title="确定删除吗？"
          onConfirm={() => handleDelete(record.id)}
          disabled={record.username === 'admin'} // Protect admin
        >
          <a style={{ color: record.username === 'admin' ? 'gray' : 'red' }}>删除</a>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <PageContainer>
      <ProTable
        headerTitle="用户列表"
        actionRef={actionRef}
        rowKey="id"
        search={false}
        toolBarRender={() => [
          <Button
            type="primary"
            key="primary"
            onClick={() => {
              setCurrentRow(null);
              form.resetFields();
              setModalVisible(true);
            }}
          >
            <PlusOutlined /> 新建用户
          </Button>,
        ]}
        request={async () => {
          const { data } = await request('/api/users').then(res => ({ data: res }));
          // or if backend returns array directly
          // const data = await request('/api/users');
          return { data, success: true };
        }}
        columns={columns}
      />

      <ModalForm
        title={currentRow ? '编辑用户' : '新建用户'}
        open={modalVisible}
        onOpenChange={setModalVisible}
        form={form}
        onFinish={async (values) => {
            if (currentRow) {
                await handleUpdate(values);
            } else {
                await handleAdd(values);
            }
            return true;
        }}
        modalProps={{
          destroyOnClose: true,
        }}
      >
        <ProFormText 
            name="username" 
            label="用户名" 
            required 
            rules={[{ required: true }]} 
            disabled={!!currentRow} 
        />
        <ProFormText.Password 
            name="password" 
            label={currentRow ? "重置密码 (留空则不修改)" : "密码"} 
            required={!currentRow}
            rules={currentRow ? [] : [{ required: true }]} 
        />
        <ProFormSelect
            name="role_id"
            label="角色"
            required
            rules={[{ required: true }]}
            options={roles.map(r => ({ label: r.display_name, value: r.id }))}
        />
      </ModalForm>
    </PageContainer>
  );
}
