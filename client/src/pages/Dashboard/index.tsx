import { PageContainer, ProCard, StatisticCard } from '@ant-design/pro-components';
import { useRequest } from '@umijs/max';
import { request } from '@umijs/max';
import RcResizeObserver from 'rc-resize-observer';
import { useState } from 'react';
import { Statistic } from 'antd';

const { Statistic: ProStatistic } = StatisticCard;

export default function Dashboard() {
  const [responsive, setResponsive] = useState(false);

  const { data, loading } = useRequest(() => {
    return request('/api/dashboard/summary');
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
          title="数据概览"
          extra={new Date().toLocaleDateString()}
          split={responsive ? 'horizontal' : 'vertical'}
          headerBordered
          bordered
          loading={loading}
        >
          <ProCard split="horizontal">
            <ProCard split="vertical">
              <StatisticCard
                statistic={{
                  title: '在册学员',
                  value: data?.totalStudents || 0,
                  description: <ProStatistic title="占比" value="100%" />,
                }}
              />
              <StatisticCard
                statistic={{
                  title: '在读学员',
                  value: data?.activeStudents || 0,
                  description: <ProStatistic title="占比" value={data?.totalStudents ? ((data.activeStudents / data.totalStudents) * 100).toFixed(2) + '%' : '0%'} />,
                }}
              />
            </ProCard>
          </ProCard>
          <ProCard split="vertical">
            <StatisticCard
              statistic={{
                title: '欠费学员',
                value: data?.arrearsStudents || 0,
                status: 'error',
              }}
            />
            <StatisticCard
              statistic={{
                title: '本月消耗课时',
                value: data?.monthlyClassHours || 0,
              }}
            />
          </ProCard>
        </ProCard>
      </RcResizeObserver>
    </PageContainer>
  );
}
