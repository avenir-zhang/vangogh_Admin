import React, { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, DatePicker, Row, Col, Statistic, Table } from 'antd';
import { Column, Pie } from '@ant-design/plots';
import { request, useModel } from '@umijs/max';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const Stats: React.FC = () => {
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  
  const [dateRange, setDateRange] = useState<any>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  
  const [teacherStats, setTeacherStats] = useState<any[]>([]);
  const [subjectStats, setSubjectStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
        if (!dateRange || !dateRange[0]) return;
        
        const params = {
            start_date: dateRange[0].format('YYYY-MM-DD'),
            end_date: dateRange[1].format('YYYY-MM-DD'),
        };
        
        const teacherRes = await request('/api/dashboard/teacher-stats', { params });
        setTeacherStats(teacherRes.data || []);
        
        const subjectRes = await request('/api/dashboard/subject-stats', { params });
        setSubjectStats(subjectRes.data || []);
        
    } catch (error) {
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const isTeacherRole = currentUser?.user_role?.name === 'teacher';

  // Teacher Chart Config
  const teacherConfig: any = {
    data: teacherStats,
    xField: 'teacherName',
    yField: 'hours',
    label: {
      position: 'middle',
      style: {
        fill: '#FFFFFF',
        opacity: 0.6,
      },
    },
    xAxis: {
      label: {
        autoHide: true,
        autoRotate: false,
      },
    },
    meta: {
      teacherName: {
        alias: '教师',
      },
      hours: {
        alias: '授课课时',
      },
    },
  };

  // Subject Chart Config
  const subjectConfig: any = {
    appendPadding: 10,
    data: subjectStats,
    angleField: 'hours',
    colorField: 'subjectName',
    radius: 0.9,
    label: {
      type: 'inner',
      offset: '-30%',
      content: ({ percent }: any) => `${(percent * 100).toFixed(0)}%`,
      style: {
        fontSize: 14,
        textAlign: 'center',
      },
    },
    interactions: [
      {
        type: 'element-active',
      },
    ],
  };

  return (
    <PageContainer
        header={{
            title: '教务数据分析',
            extra: [
                <RangePicker 
                    key="date" 
                    value={dateRange} 
                    onChange={(dates) => {
                        if (dates) setDateRange(dates);
                    }} 
                />
            ]
        }}
    >
      <Row gutter={24}>
        <Col span={12}>
            <Card title={isTeacherRole ? "我的授课统计" : "教师授课统计"} bordered={false} loading={loading}>
                {isTeacherRole ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <Statistic 
                            title="本期授课总课时" 
                            value={teacherStats[0]?.hours || 0} 
                            precision={2} 
                            suffix="课时"
                            valueStyle={{ color: '#1890ff' }}
                        />
                        <div style={{ marginTop: 20, color: '#888' }}>
                            授课次数: {teacherStats[0]?.count || 0} 次
                        </div>
                    </div>
                ) : (
                    <Column {...teacherConfig} height={300} />
                )}
            </Card>
        </Col>
        <Col span={12}>
            <Card title="科目消耗分布" bordered={false} loading={loading}>
                <Pie {...subjectConfig} height={300} />
            </Card>
        </Col>
      </Row>
      
      <Row gutter={24} style={{ marginTop: 24 }}>
          <Col span={12}>
              <Card title="授课明细表" bordered={false}>
                  <Table
                    dataSource={teacherStats}
                    rowKey="teacherName"
                    pagination={false}
                    size="small"
                    columns={[
                        { title: '教师', dataIndex: 'teacherName' },
                        { title: '授课次数', dataIndex: 'count' },
                        { title: '授课课时', dataIndex: 'hours', render: (val) => Number(val).toFixed(2) },
                    ]}
                  />
              </Card>
          </Col>
          <Col span={12}>
              <Card title="科目明细表" bordered={false}>
                  <Table
                    dataSource={subjectStats}
                    rowKey="subjectName"
                    pagination={false}
                    size="small"
                    columns={[
                        { title: '科目', dataIndex: 'subjectName' },
                        { title: '消耗总课时', dataIndex: 'hours', render: (val) => Number(val).toFixed(2) },
                    ]}
                  />
              </Card>
          </Col>
      </Row>
    </PageContainer>
  );
};

export default Stats;
