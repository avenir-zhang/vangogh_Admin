import React, { useRef, useState, useEffect } from 'react';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { ProTable, DrawerForm, ProFormText, ProFormSelect, ProFormDigit, ProFormDatePicker, ProFormMoney } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Tabs, Tooltip } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { request, history } from '@umijs/max';

type OrderItem = {
  id: number;
  order_no: string;
  student: { id: number; name: string };
  subject: { id: number; name: string };
  student_id?: number;
  subject_id?: number;
  regular_courses: number;
  gift_courses: number;
  total_fee: number;
  paid_fee: number;
  debt_amount: number;
  debt_status: string;
  order_type: string;
  order_date: string;
  expire_date: string;
  status: string;
  children?: OrderItem[];
  consumed_regular_courses?: number;
  consumed_gift_courses?: number;
};

const OrderList: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [students, setStudents] = useState<{ label: string; value: number }[]>([]);
  const [subjects, setSubjects] = useState<{ label: string; value: number }[]>([]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [currentRow, setCurrentRow] = useState<OrderItem | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<string>('active');

  useEffect(() => {
    const fetchData = async () => {
      const studentData = await request('/api/students');
      setStudents(studentData.map((item: any) => ({ label: item.name, value: item.id })));
      const subjectData = await request('/api/subjects');
      setSubjects(subjectData.map((item: any) => ({ label: item.name, value: item.id })));
    };
    fetchData();

    // 检查 URL 参数
    const params = new URLSearchParams(window.location.search);
    const orderNo = params.get('orderNo');
    if (orderNo && actionRef.current) {
        // 如果有 orderNo，设置搜索条件
        // 注意：ProTable 的搜索表单需要通过 formRef 或 actionRef 设置值
        // 这里简单起见，我们可以直接在 request 中处理，或者利用 ProTable 的 defaultSearchValue（如果页面初次加载）
        // 但更好的体验是填入搜索框。
        // 由于 actionRef 无法直接设置搜索表单值，我们可以在 columns 的 initialValue 设置？
        // 或者使用 formRef。
    }
  }, []);

  // 使用 formRef 来控制搜索表单
  const formRef = useRef<any>();

  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const orderNo = params.get('orderNo');
      if (orderNo) {
          formRef.current?.setFieldsValue({ order_no: orderNo });
          formRef.current?.submit();
      }
  }, []);

  const columns: ProColumns<OrderItem>[] = [
    {
      title: '订单号',
      dataIndex: 'order_no',
      editable: false,
      hideInForm: true,
    },
    {
      title: '学员',
      dataIndex: 'student_id',
      valueType: 'select',
      fieldProps: { options: students },
      render: (_, record) => (
          <a onClick={() => history.push(`/academic/student/detail/${record.student?.id}`)}>
              {record.student?.name}
          </a>
      ),
    },
    {
      title: '科目',
      dataIndex: 'subject_id',
      valueType: 'select',
      fieldProps: { options: subjects },
      render: (_, record) => {
          // 主订单可能没有科目，显示其包含的子订单科目摘要
          if (record.children && record.children.length > 0) {
              const subjectNames = record.children.map((c: OrderItem) => c.subject?.name).filter(Boolean).join(', ');
              return subjectNames;
          }
          return record.subject?.name || '-';
      },
    },
    {
      title: '正价课时',
      dataIndex: 'regular_courses',
      valueType: 'digit',
      render: (_, record) => {
          // 汇总子订单课时
          if (record.children && record.children.length > 0) {
              return record.children.reduce((sum: number, c: OrderItem) => sum + (c.regular_courses || 0), 0);
          }
          return record.regular_courses;
      }
    },
    {
      title: '赠送课时',
      dataIndex: 'gift_courses',
      valueType: 'digit',
      render: (_, record) => {
          if (record.children && record.children.length > 0) {
              return record.children.reduce((sum: number, c: OrderItem) => sum + (c.gift_courses || 0), 0);
          }
          return record.gift_courses;
      }
    },
    {
      title: '应交费用',
      dataIndex: 'total_fee',
      valueType: 'money',
    },
    {
      title: '实交费用',
      dataIndex: 'paid_fee',
      valueType: 'money',
    },
    {
      title: '欠费金额',
      dataIndex: 'debt_amount',
      valueType: 'money',
      editable: false,
      hideInForm: true,
    },
    {
      title: '欠费状态',
      dataIndex: 'debt_status',
      valueEnum: {
        normal: { text: '正常', status: 'Success' },
        debt: { text: '欠费', status: 'Error' },
      },
      editable: false,
      hideInForm: true,
    },
    {
      title: '订单类型',
      dataIndex: 'order_type',
      valueEnum: {
        new: { text: '新报' },
        renew: { text: '续费' },
        supplement: { text: '补缴' },
      },
    },
    {
      title: '订单日期',
      dataIndex: 'order_date',
      valueType: 'date',
    },
    {
      title: '到期日期',
      dataIndex: 'expire_date',
      valueType: 'date',
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueEnum: activeTab === 'active' ? {
        active: { text: '正常', status: 'Success' },
        completed: { text: '完成', status: 'Default' },
      } : {
        cancelled: { text: '作废', status: 'Error' },
      },
    },
    {
      title: '操作',
      valueType: 'option',
      render: (text, record, _, action) => {
        // 如果订单已作废，只显示详情
        if (record.status === 'cancelled') {
             return [
                 <a
                    key="detail"
                    onClick={() => {
                        history.push(`/finance/order/detail/${record.id}`);
                    }}
                    >
                    详情
                </a>
             ];
        }

        return [
        <a
          key="detail"
          onClick={() => {
            history.push(`/finance/order/detail/${record.id}`);
          }}
        >
          详情
        </a>,
        // 订单创建后不建议随意修改，只允许补缴或作废
        // <a key="editable" ...> 编辑 </a>
        (() => {
            const hasConsumption = record.children?.some(c => 
                (Number(c.consumed_regular_courses) || 0) > 0 || 
                (Number(c.consumed_gift_courses) || 0) > 0
            );

            if (hasConsumption) {
                return (
                    <Tooltip key="delete" title="订单已发生消耗，无法作废">
                        <span style={{ color: 'rgba(0,0,0,0.25)', cursor: 'not-allowed' }}>作废</span>
                    </Tooltip>
                );
            }

            return (
                <Popconfirm
                key="delete"
                title="确定作废吗？"
                onConfirm={async () => {
                    await request(`/api/orders/${record.id}`, { 
                        method: 'PATCH',
                        data: { status: 'cancelled' }
                    });
                    message.success('订单已作废');
                    actionRef.current?.reload();
                }}
                >
                <a>作废</a>
                </Popconfirm>
            );
        })(),
      ]},
    },
  ];

  return (
    <div style={{ backgroundColor: '#fff', padding: 24 }}>
        <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
                { label: '有效订单', key: 'active' },
                { label: '作废订单', key: 'cancelled' },
            ]}
            style={{ marginBottom: 16 }}
        />
    <ProTable<OrderItem>
      columns={columns}
      actionRef={actionRef}
      formRef={formRef}
      cardBordered
      params={{ activeTab }}
      request={async (params) => {
        const { current, pageSize, ...search } = params;
        const queryParams: any = { ...search };
        if (activeTab === 'cancelled') {
            queryParams.status = 'cancelled';
        } else {
            queryParams.excludeStatus = 'cancelled';
        }

        const msg = await request('/api/orders', {
          params: queryParams,
        });
        return {
          data: msg,
          success: true,
        };
      }}
      editable={{
        type: 'multiple',
        onDelete: async (key, row) => {
          // 订单不能删除，只能作废（取消）
          await request(`/api/orders/${row.id}`, { 
              method: 'PATCH',
              data: { status: 'cancelled' }
          });
          message.success('订单已作废');
          actionRef.current?.reload();
        },
      }}
      rowKey="id"
      search={{
        labelWidth: 'auto',
      }}
      headerTitle="订单列表"
      toolBarRender={() => [
        <Button
          key="button"
          icon={<PlusOutlined />}
          onClick={() => {
            history.push('/finance/order/create');
          }}
          type="primary"
        >
          新建
        </Button>,
      ]}
    />
    <DrawerForm<OrderItem>
      title={currentRow ? '编辑订单' : '新建订单'}
      open={drawerVisible}
      onOpenChange={setDrawerVisible}
      initialValues={currentRow}
      onFinish={async (values) => {
        if (currentRow) {
          await request(`/api/orders/${currentRow.id}`, {
            method: 'PATCH',
            data: values,
          });
          message.success('更新成功');
        } else {
          await request('/api/orders', {
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
        name="subject_id"
        label="科目"
        options={subjects}
        rules={[{ required: true, message: '请选择科目' }]}
      />
      <ProFormDigit
        name="regular_courses"
        label="正价课时"
        min={0}
        rules={[{ required: true, message: '请输入正价课时' }]}
      />
      <ProFormDigit
        name="gift_courses"
        label="赠送课时"
        min={0}
        initialValue={0}
      />
      <ProFormMoney
        name="total_fee"
        label="应交费用"
        min={0}
        rules={[{ required: true, message: '请输入应交费用' }]}
      />
      <ProFormMoney
        name="paid_fee"
        label="实交费用"
        min={0}
        rules={[{ required: true, message: '请输入实交费用' }]}
      />
      <ProFormSelect
        name="order_type"
        label="订单类型"
        valueEnum={{
          new: '新报',
          renew: '续费',
          supplement: '补缴',
        }}
        rules={[{ required: true, message: '请选择订单类型' }]}
      />
      <ProFormDatePicker
        name="order_date"
        label="订单日期"
        rules={[{ required: true, message: '请选择订单日期' }]}
        fieldProps={{
            format: 'YYYY-MM-DD',
        }}
      />
      <ProFormDatePicker
        name="expire_date"
        label="到期日期"
        fieldProps={{
            format: 'YYYY-MM-DD',
        }}
      />
    </DrawerForm>
    </div>
  );
};

export default OrderList;
