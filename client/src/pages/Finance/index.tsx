import { PageContainer, ProCard, StatisticCard } from '@ant-design/pro-components';
import { useRequest } from '@umijs/max';
import { request } from '@umijs/max';
import { useState } from 'react';
import RcResizeObserver from 'rc-resize-observer';

export default function FinanceDashboard() {
  const [responsive, setResponsive] = useState(false);
  const { data, loading } = useRequest(() => {
    return request('/api/dashboard/financial');
  });

  return (
    <PageContainer>
      <RcResizeObserver
        key="resize-observer"
        onResize={(offset) => {
          setResponsive(offset.width < 596);
        }}
      >
        <ProCard
          title="财务概览"
          extra={new Date().getFullYear() + '年'}
          split={responsive ? 'horizontal' : 'vertical'}
          headerBordered
          bordered
          loading={loading}
        >
          <StatisticCard
            statistic={{
              title: '全年收入',
              value: data?.yearlyIncome || 0,
              prefix: '¥',
              precision: 2,
            }}
          />
          <StatisticCard
            statistic={{
              title: '总消耗课程',
              value: data?.totalConsumedCourses || 0,
              suffix: '节',
            }}
          />
          <StatisticCard
            statistic={{
              title: '总消耗课时费',
              value: data?.totalConsumedClassFees || 0,
              prefix: '¥',
              precision: 2,
            }}
          />
        </ProCard>
      </RcResizeObserver>
    </PageContainer>
  );
}
