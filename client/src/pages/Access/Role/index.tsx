import { PageContainer, ProTable, ProColumns, ModalForm, ProFormText, ProFormTextArea, ProFormCheckbox } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Form, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useRef, useState, useEffect } from 'react';
import { request } from '@umijs/max';

export default function RoleList() {
  const actionRef = useRef<any>();
  const [modalVisible, setModalVisible] = useState(false);
  const [currentRow, setCurrentRow] = useState<any>(null);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [initialValues, setInitialValues] = useState<any>({});
  const [form] = Form.useForm();

  useEffect(() => {
    request('/api/permissions').then((res) => {
      setPermissions(res || []);
    });
  }, []);

  // Group permissions
  const permissionGroups = permissions.reduce((acc, curr) => {
    const group = curr.group || 'other';
    if (!acc[group]) acc[group] = [];
    acc[group].push({ label: curr.name, value: curr.id });
    return acc;
  }, {} as Record<string, { label: string; value: number }[]>);

  const handleAdd = async (fields: any) => {
    try {
      await request('/api/roles', {
        method: 'POST',
        data: fields,
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
      await request(`/api/roles/${currentRow.id}`, {
        method: 'PATCH',
        data: fields,
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
      await request(`/api/roles/${id}`, {
        method: 'DELETE',
      });
      message.success('删除成功');
      actionRef.current?.reload();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const onFinish = async (values: any) => {
    const permissionIds: number[] = [];
    Object.keys(values).forEach((key) => {
      if (key.startsWith('perm_group_') && values[key]) {
        permissionIds.push(...values[key]);
      }
    });

    const payload = {
      name: values.name,
      display_name: values.display_name,
      description: values.description,
      permissionIds,
    };

    if (currentRow) {
      await handleUpdate(payload);
    } else {
      await handleAdd(payload);
    }
    return true;
  };

  const columns: ProColumns<any>[] = [
    { title: '角色名', dataIndex: 'display_name' },
    { title: '标识', dataIndex: 'name' },
    { title: '描述', dataIndex: 'description' },
    {
      title: '权限数',
      render: (_, record) => <Tag color="blue">{record.permissions?.length || 0}</Tag>
    },
    {
      title: '操作',
      valueType: 'option',
      render: (_, record) => [
        <a
          key="edit"
          onClick={() => {
            // Prepare initial values for permissions
            const init: any = {
                name: record.name,
                display_name: record.display_name,
                description: record.description,
            };
            
            // Map existing permissions to groups
            const existingPermIds = record.permissions?.map((p: any) => p.id) || [];
            Object.keys(permissionGroups).forEach(group => {
                // Find which permissions in this group are selected
                const groupPerms = permissionGroups[group];
                const selected = groupPerms.filter((p: any) => existingPermIds.includes(p.value)).map((p: any) => p.value);
                init[`perm_group_${group}`] = selected;
            });
            
            setInitialValues(init);
            setCurrentRow(record);
            setModalVisible(true);
            // Also set form values just in case
            form.setFieldsValue(init);
          }}
        >
          编辑
        </a>,
        <Popconfirm
          key="delete"
          title="确定删除吗？"
          onConfirm={() => handleDelete(record.id)}
          disabled={['super_admin', 'admin'].includes(record.name)} // Protect core roles
        >
          <a style={{ color: ['super_admin', 'admin'].includes(record.name) ? 'gray' : 'red' }}>删除</a>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <PageContainer>
      <ProTable
        headerTitle="角色列表"
        actionRef={actionRef}
        rowKey="id"
        search={false}
        toolBarRender={() => [
          <Button
            type="primary"
            key="primary"
            onClick={() => {
              setCurrentRow(null);
              setInitialValues({});
              form.resetFields();
              setModalVisible(true);
            }}
          >
            <PlusOutlined /> 新建
          </Button>,
        ]}
        request={async () => {
          const data = await request('/api/roles');
          return { data, success: true };
        }}
        columns={columns}
      />

      <ModalForm
        title={currentRow ? '编辑角色' : '新建角色'}
        open={modalVisible}
        onOpenChange={setModalVisible}
        form={form}
        onFinish={onFinish}
        initialValues={initialValues}
        modalProps={{
          destroyOnClose: true,
        }}
      >
        <ProFormText name="display_name" label="角色名称" required rules={[{ required: true }]} />
        <ProFormText name="name" label="角色标识" required rules={[{ required: true }]} disabled={!!currentRow} />
        <ProFormTextArea name="description" label="描述" />

        <div style={{ marginTop: 20 }}>
            <h3>权限配置</h3>
            {Object.keys(permissionGroups).map((group) => (
            <ProFormCheckbox.Group
                key={group}
                name={`perm_group_${group}`}
                label={group.toUpperCase()}
                options={permissionGroups[group]}
            />
            ))}
        </div>
      </ModalForm>
    </PageContainer>
  );
}
