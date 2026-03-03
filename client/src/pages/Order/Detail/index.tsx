import React, { useEffect, useState } from 'react';
import { PageContainer, ProDescriptions, ProTable } from '@ant-design/pro-components';
import { Card, Button, message, Modal, InputNumber, Form, Select, Popconfirm } from 'antd';
import { useParams, request, history } from '@umijs/max';

const OrderDetail: React.FC = () => {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [isSupplementModalOpen, setIsSupplementModalOpen] = useState(false);
  const [supplementAmount, setSupplementAmount] = useState<number>(0);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferTargetOrder, setTransferTargetOrder] = useState<any>(null);
  const [targetStudentId, setTargetStudentId] = useState<number | undefined>(undefined);
  const [targetSubjectId, setTargetSubjectId] = useState<number | undefined>(undefined);
  const [transferAmount, setTransferAmount] = useState<number | undefined>(undefined);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundTargetOrder, setRefundTargetOrder] = useState<any>(null);
  const [refundAmount, setRefundAmount] = useState<number | undefined>(undefined);
  const [refundCourses, setRefundCourses] = useState<number | undefined>(undefined);
  const [students, setStudents] = useState<{ label: string; value: number }[]>([]);
  const [subjects, setSubjects] = useState<{ label: string; value: number }[]>([]);

  const fetchStudents = async () => {
      const data = await request('/api/students');
      setStudents(data.map((item: any) => ({ label: item.name, value: item.id })));
  };

  const fetchSubjects = async () => {
      const data = await request('/api/subjects');
      setSubjects(data.map((item: any) => ({ label: item.name, value: item.id })));
  };

  useEffect(() => {
      fetchStudents();
      fetchSubjects();
  }, []);

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

  const handleTransfer = async () => {
      if (!targetStudentId) {
          message.error('请选择接收学员');
          return;
      }
      try {
          await request(`/api/orders/${transferTargetOrder.id}/transfer`, {
              method: 'POST',
              data: { 
                  targetStudentId,
                  subjectId: targetSubjectId,
                  amount: transferAmount
              }
          });
          message.success('转让成功');
          setIsTransferModalOpen(false);
          setTransferTargetOrder(null);
          setTargetStudentId(undefined);
          setTargetSubjectId(undefined);
          setTransferAmount(undefined);
          fetchOrder(); // 刷新详情
      } catch (error) {
          message.error('转让失败');
      }
  };

  const handleRefund = async () => {
      // 允许退费金额为0，但不能为 undefined 或小于 0
      if (refundAmount === undefined || refundAmount < 0) {
          message.error('请输入有效的退费金额');
          return;
      }
      if (!refundCourses || refundCourses <= 0) {
          message.error('请输入有效的退费课时数');
          return;
      }
      try {
          await request(`/api/orders/${refundTargetOrder.id}/refund`, {
              method: 'POST',
              data: { 
                  amount: refundAmount,
                  courses: refundCourses
              }
          });
          message.success('退费成功');
          setIsRefundModalOpen(false);
          setRefundTargetOrder(null);
          setRefundAmount(undefined);
          setRefundCourses(undefined);
          fetchOrder(); // 刷新详情
      } catch (error) {
          message.error('退费失败');
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
          <ProDescriptions.Item label="订单号" dataIndex="order_no" render={(text, record) => {
              if (record.order_type === 'transfer' && record.source_order_id) {
                  return (
                      <span>
                          {text}
                          <span style={{ marginLeft: 8, fontSize: 12, color: '#999' }}>
                              (来自订单: <a onClick={() => history.push(`/finance/order/detail/${record.source_order_id}`)}>查看原订单</a>)
                          </span>
                      </span>
                  );
              }
              if (record.status === 'transferred') {
                   // 查找该订单转让生成的子订单，但这需要后端返回额外信息，或者我们再查一次
                   // 这里简单起见，如果状态是 transferred，提示已转出
                   return (
                       <span>
                           {text} <span style={{ color: '#52c41a' }}>(已转出)</span>
                       </span>
                   );
              }
              return text;
          }} />
          <ProDescriptions.Item label="订单类型" dataIndex="order_type" valueEnum={{
            new: { text: '新报' },
            renew: { text: '续费' },
            supplement: { text: '补缴' },
            transfer: { text: '转让' },
            gift: { text: '赠送' },
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
                { title: '子订单号', dataIndex: 'order_no', render: (text, record) => {
                    if (record.order_type === 'transfer' && record.source_order_id) {
                        return (
                            <span>
                                {text}
                                <br/>
                                <span style={{ fontSize: 12, color: '#999' }}>
                                    来自: <a onClick={() => history.push(`/finance/order/detail/${record.source_order_id}`)}>原订单</a>
                                </span>
                            </span>
                        );
                    }
                    if (record.status === 'transferred') {
                        return (
                            <span>
                                {text} <span style={{ color: '#52c41a' }}>(已转出)</span>
                            </span>
                        );
                    }
                    return text;
                }},
                { title: '科目', dataIndex: ['subject', 'name'], render: (_, r) => r.subject?.name || '-' },
                { 
                    title: '类型', 
                    dataIndex: 'order_type',
                    valueEnum: {
                        new: { text: '新报' },
                        renew: { text: '续费' },
                        supplement: { text: '补缴' },
                        transfer: { text: '转让' },
                        gift: { text: '赠送' },
                    }
                },
                // { title: '课程', dataIndex: ['course', 'name'], render: (_, r) => r.course?.name || '-' }, // 移除课程显示
                { title: '正价课时', dataIndex: 'regular_courses' },
                { title: '赠送课时', dataIndex: 'gift_courses' },
                { title: '已消耗正价', dataIndex: 'consumed_regular_courses' },
                { title: '已消耗赠送', dataIndex: 'consumed_gift_courses' },
                { title: '应收金额', dataIndex: 'total_fee', valueType: 'money' },
                { title: '到期日期', dataIndex: 'expire_date', valueType: 'date' },
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
                        <a
                            key="transfer"
                            onClick={() => {
                                setTransferTargetOrder(record);
                                setIsTransferModalOpen(true);
                            }}
                        >
                            转让
                        </a>,
                        record.order_type === 'gift' ? (
                            <Popconfirm
                                key="revoke"
                                title="确定退课吗？这将清空剩余赠送课时。"
                                onConfirm={async () => {
                                    try {
                                        await request(`/api/orders/${record.id}/revoke-gift`, {
                                            method: 'POST',
                                        });
                                        message.success('退课成功');
                                        fetchOrder();
                                    } catch (error) {
                                        message.error('退课失败');
                                    }
                                }}
                            >
                                <a style={{ color: '#ff4d4f' }}>退课</a>
                            </Popconfirm>
                        ) : (
                            <a
                                key="refund"
                                onClick={() => {
                                    const regular = Number(record.regular_courses || 0);
                                    if (regular <= 0) {
                                        message.error('正价课时小于等于0，不允许退费');
                                        return;
                                    }
                                    if (record.order_type === 'transfer') {
                                        message.error('转让订单不允许退费');
                                        return;
                                    }
                                    setRefundTargetOrder(record);
                                    setIsRefundModalOpen(true);
                                }}
                                style={{
                                    color: (Number(record.regular_courses || 0) <= 0 || record.order_type === 'transfer') ? '#999' : undefined,
                                    cursor: (Number(record.regular_courses || 0) <= 0 || record.order_type === 'transfer') ? 'not-allowed' : 'pointer',
                                }}
                            >
                                退费
                            </a>
                        ),
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
      <Modal
        title="订单转让"
        open={isTransferModalOpen}
        onOk={handleTransfer}
        onCancel={() => setIsTransferModalOpen(false)}
      >
          <Form layout="vertical">
              <Form.Item label="转让给" required>
                  <Select
                    showSearch
                    placeholder="请选择学员"
                    optionFilterProp="children"
                    options={students}
                    value={targetStudentId}
                    onChange={setTargetStudentId}
                    filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                  />
              </Form.Item>
              <Form.Item label="折算科目 (选填)">
                  <Select
                    showSearch
                    placeholder="请选择科目 (默认原科目)"
                    optionFilterProp="children"
                    options={subjects}
                    value={targetSubjectId}
                    onChange={setTargetSubjectId}
                    filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    allowClear
                  />
              </Form.Item>
              <Form.Item label="折算课时数 (选填)">
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="请输入课时数 (默认原剩余课时)"
                    min={0}
                    value={transferAmount}
                    onChange={(val) => setTransferAmount(Number(val))}
                  />
                  <div style={{ marginTop: 8, color: '#999' }}>
                      将把该子订单剩余课时全部转出，目标学员将获得指定数量的指定科目课时。
                  </div>
              </Form.Item>
          </Form>
      </Modal>
      <Modal
        title="订单退费"
        open={isRefundModalOpen}
        onOk={handleRefund}
        onCancel={() => setIsRefundModalOpen(false)}
      >
          <Form layout="vertical">
              <Form.Item label="退费金额" required>
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="请输入退费金额"
                    min={0}
                    value={refundAmount}
                    onChange={(val) => setRefundAmount(Number(val))}
                    addonBefore="¥"
                  />
              </Form.Item>
              <Form.Item label="扣除课时 (正价)" required>
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="请输入扣除的正价课时数"
                    min={0.01}
                    max={Number(refundTargetOrder?.regular_courses || 0) - Number(refundTargetOrder?.consumed_regular_courses || 0)}
                    value={refundCourses}
                    onChange={(val) => setRefundCourses(Number(val))}
                  />
                  <div style={{ marginTop: 8, color: '#999' }}>
                      当前剩余正价课时: {Number(refundTargetOrder?.regular_courses || 0) - Number(refundTargetOrder?.consumed_regular_courses || 0)}
                  </div>
              </Form.Item>
          </Form>
      </Modal>
    </PageContainer>
  );
};

export default OrderDetail;
