import React, { useState, useEffect } from 'react';
import { ProForm, ProFormSelect, ProFormDigit, ProFormMoney, ProFormDatePicker, ProFormList, ProFormDependency } from '@ant-design/pro-components';
import { Card, message, Divider, Typography } from 'antd';
import { PageContainer } from '@ant-design/pro-components';
import { request, history } from '@umijs/max';

const CreateOrder: React.FC = () => {
  const [students, setStudents] = useState<{ label: string; value: number }[]>([]);
  const [subjects, setSubjects] = useState<{ label: string; value: number }[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  
  // 课程按科目分组
  const coursesBySubject = React.useMemo(() => {
      const grouped: Record<number, any[]> = {};
      courses.forEach(course => {
          const subjectId = course.subject?.id;
          if (subjectId) {
              if (!grouped[subjectId]) grouped[subjectId] = [];
              grouped[subjectId].push({ label: course.name, value: course.id });
          }
      });
      return grouped;
  }, [courses]);

  useEffect(() => {
    const fetchData = async () => {
      const studentData = await request('/api/students');
      setStudents(studentData.map((item: any) => ({ label: item.name, value: item.id })));
      const subjectData = await request('/api/subjects');
      setSubjects(subjectData.map((item: any) => ({ label: item.name, value: item.id })));
      const courseData = await request('/api/courses');
      setCourses(courseData);
    };
    fetchData();
  }, []);

  return (
    <PageContainer title="新建订单">
      <Card>
        <ProForm
          onFinish={async (values) => {
            const { student_id, items, ...common } = values;
            
            if (!items || items.length === 0) {
              message.error('请至少添加一个课程订单');
              return false;
            }

            try {
              // 构造提交数据结构：主订单信息 + 子订单明细
              const submitData = {
                  student_id,
                  ...common, // order_date, order_type, etc.
                  // 收集所有子订单的费用作为主订单的费用 (这里简化处理，假设前端不显示主订单总额，由后端计算)
                  // 或者前端也可以让用户输入一个总实付
                  // 目前前端 items 里每一项都有 paid_fee，我们需要把它们加起来吗？
                  // 根据新需求：后续缴费绑定到主订单。
                  // 我们假设：前端输入的 paid_fee 是针对每个子项的，我们在这里汇总成主订单的 paid_fee
                  paid_fee: items.reduce((sum: number, item: any) => sum + (Number(item.paid_fee) || 0), 0),
                  items: items, 
              };

              await request('/api/orders', {
                method: 'POST',
                data: submitData,
              });
              
              message.success('订单创建成功');
              history.push('/finance/order');
              return true;
            } catch (error) {
              console.error(error);
              message.error('创建失败，请重试');
              return false;
            }
          }}
          initialValues={{
            // 移除默认的 order_date，让用户自己选
            // order_date: Date.now(),
            items: [
                {
                    regular_courses: 0,
                    gift_courses: 0,
                    total_fee: 0,
                    paid_fee: 0,
                    order_type: 'new',
                }
            ], // 默认显示一行
          }}
        >
          <ProFormSelect
            name="student_id"
            label="学员"
            options={students}
            width="md"
            rules={[{ required: true, message: '请选择学员' }]}
          />
          
          <ProFormDatePicker
            name="order_date"
            label="订单日期"
            width="md"
            rules={[{ required: true, message: '请选择订单日期' }]}
            fieldProps={{
                format: 'YYYY-MM-DD',
            }}
          />

          <ProFormSelect
            name="order_type"
            label="订单类型"
            width="md"
            valueEnum={{
              new: '新报',
              renew: '续费',
              supplement: '补缴',
            }}
            rules={[{ required: true, message: '请选择订单类型' }]}
            initialValue="new"
          />
          <Divider>订单明细</Divider>

          <ProFormList
            name="items"
            creatorButtonProps={{
              position: 'bottom',
              creatorButtonText: '添加课程/赠品',
            }}
            itemRender={({ listDom, action }, { record }) => {
              return (
                <Card bordered style={{ marginBottom: 16 }} extra={action}>
                  {listDom}
                </Card>
              );
            }}
          >
            <ProFormSelect
                name="subject_id"
                label="科目"
                options={subjects}
                width="md"
                rules={[{ required: true, message: '请选择科目' }]}
            />
            
            {/* 移除具体课程选择 */}
            {/* <ProFormDependency name={['subject_id']}> ... </ProFormDependency> */}

            <ProForm.Group>
                <ProFormDigit
                    name="regular_courses"
                    label="正价课时"
                    width="sm"
                    min={0}
                    initialValue={0}
                    rules={[{ required: true, message: '请输入' }]}
                />
                <ProFormDigit
                    name="gift_courses"
                    label="赠送课时"
                    width="sm"
                    min={0}
                    initialValue={0}
                />
            </ProForm.Group>

            <ProForm.Group>
                <ProFormMoney
                    name="total_fee"
                    label="应交费用"
                    width="sm"
                    min={0}
                    initialValue={0}
                    rules={[{ required: true, message: '请输入' }]}
                />
                <ProFormMoney
                    name="paid_fee"
                    label="实交费用"
                    width="sm"
                    min={0}
                    initialValue={0}
                    rules={[{ required: true, message: '请输入' }]}
                />
            </ProForm.Group>

            <ProFormSelect
                name="order_type"
                label="类型"
                width="sm"
                valueEnum={{
                    new: '新报',
                    renew: '续费',
                    supplement: '补缴',
                }}
                initialValue="new"
                rules={[{ required: true, message: '请选择' }]}
            />
            
            <ProFormDatePicker
                name="expire_date"
                label="有效期至"
                width="md"
                fieldProps={{
                    format: 'YYYY-MM-DD',
                }}
            />
          </ProFormList>
        </ProForm>
      </Card>
    </PageContainer>
  );
};

export default CreateOrder;
