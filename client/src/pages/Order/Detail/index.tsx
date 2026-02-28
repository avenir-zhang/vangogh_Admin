import React, { useEffect, useState } from 'react';
import { PageContainer, ProDescriptions, ProTable } from '@ant-design/pro-components';
import { Card, Button, message, Modal, InputNumber, Form } from 'antd';
import { useParams, request } from '@umijs/max';

const OrderDetail: React.FC = () => {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [isSupplementModalOpen, setIsSupplementModalOpen] = useState(false);
  const [supplementAmount, setSupplementAmount] = useState<number>(0);

  const fetchOrder = async () => {
    try {
      const data = await request(`/api/orders/${params.id}`);
      setOrder(data);
    } catch (error) {
      message.error('获取订单详情失败');
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchOrder();
    }
  }, [params.id]);

  const handleSupplement = async () => {
      if (supplementAmount <= 0) {
          message.error('请输入有效的补缴金额');
          return;
      }
      try {
          await request(`/api/orders/${order.id}/supplement`, {
              method: 'POST',
              data: { amount: supplementAmount }
          });
          message.success('补缴成功');
          setIsSupplementModalOpen(false);
          fetchOrder(); // 刷新详情
      } catch (error) {
          message.error('补缴失败');
      }
  };

  if (!order) {
    return <PageContainer loading />;
  }

  return (
    <PageContainer
      title={`订单详情 - ${order.order_no}`}
      extra={[
        order.debt_status === 'debt' && (
          <Button key="supplement" type="primary" onClick={() => setIsSupplementModalOpen(true)}>
            补缴欠费
          </Button>
        ),
      ]}
    >
      <Card bordered={false} title="基础信息" style={{ marginBottom: 24 }}>
        <ProDescriptions column={3} dataSource={order}>
          <ProDescriptions.Item label="学员" dataIndex={['student', 'name']} />
          <ProDescriptions.Item label="订单号" dataIndex="order_no" />
          <ProDescriptions.Item label="订单类型" dataIndex="order_type" valueEnum={{
            new: { text: '新报' },
            renew: { text: '续费' },
            supplement: { text: '补缴' },
          }} />
          <ProDescriptions.Item label="订单日期" dataIndex="order_date" valueType="date" />
          <ProDescriptions.Item label="到期日期" dataIndex="expire_date" valueType="date" />
          <ProDescriptions.Item label="欠费状态" dataIndex="debt_status" valueEnum={{
             normal: { text: '正常', status: 'Success' },
             debt: { text: '欠费', status: 'Error' },
          }} />
          <ProDescriptions.Item label="应交费用" dataIndex="total_fee" valueType="money" />
          <ProDescriptions.Item label="实交费用" dataIndex="paid_fee" valueType="money" />
          <ProDescriptions.Item label="欠费金额" dataIndex="debt_amount" valueType="money" />
        </ProDescriptions>
      </Card>

      <Card bordered={false} title="订单明细">
        <ProTable
            rowKey="id"
            search={false}
            toolBarRender={false}
            pagination={false}
            dataSource={order.children || []}
            columns={[
                { title: '子订单号', dataIndex: 'order_no' },
                { title: '科目', dataIndex: ['subject', 'name'], render: (_, r) => r.subject?.name || '-' },
                // { title: '课程', dataIndex: ['course', 'name'], render: (_, r) => r.course?.name || '-' }, // 移除课程显示
                { title: '正价课时', dataIndex: 'regular_courses' },
                { title: '赠送课时', dataIndex: 'gift_courses' },
                { title: '已消耗正价', dataIndex: 'consumed_regular_courses' },
                { title: '已消耗赠送', dataIndex: 'consumed_gift_courses' },
                { title: '应收金额', dataIndex: 'total_fee', valueType: 'money' },
                { title: '到期日期', dataIndex: 'expire_date', valueType: 'date', editable: true },
                {
                    title: '操作',
                    valueType: 'option',
                    render: (text, record, _, action) => [
                        <a
                            key="editable"
                            onClick={() => {
                                action?.startEditable?.(record.id);
                            }}
                        >
                            修改有效期
                        </a>,
                    ],
                },
            ]}
            editable={{
                type: 'single',
                onSave: async (key, row) => {
                    await request(`/api/orders/${row.id}/expire-date`, {
                        method: 'PATCH',
                        data: { expire_date: row.expire_date },
                    });
                    message.success('修改成功');
                    fetchOrder();
                },
            }}
        />
      </Card>

      <Modal
        title="补缴欠费"
        open={isSupplementModalOpen}
        onOk={handleSupplement}
        onCancel={() => setIsSupplementModalOpen(false)}
      >
          <Form layout="vertical">
              <Form.Item label="补缴金额" required>
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0.01}
                    max={Number(order.debt_amount)}
                    value={supplementAmount}
                    onChange={(val) => setSupplementAmount(Number(val))}
                    addonBefore="¥"
                  />
                  <div style={{ marginTop: 8, color: '#999' }}>
                      当前欠费: ¥{order.debt_amount}
                  </div>
              </Form.Item>
          </Form>
      </Modal>
    </PageContainer>
  );
};

export default OrderDetail;
