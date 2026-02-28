import React, { useState, useEffect } from 'react';
import { Calendar, Badge, Card, Modal, Descriptions, Tooltip } from 'antd';
import type { Dayjs } from 'dayjs';
import { request } from '@umijs/max';
import dayjs from 'dayjs';

const CourseCalendar: React.FC = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);

  const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs());

  const fetchCourses = async (date: Dayjs) => {
    // 获取当月的课程
    const start_date = date.startOf('month').format('YYYY-MM-DD');
    const end_date = date.endOf('month').format('YYYY-MM-DD');
    const data = await request('/api/courses', {
      params: { start_date, end_date },
    });
    setCourses(data);
    setCurrentDate(date);
  };

  useEffect(() => {
    fetchCourses(dayjs());
  }, []);

  const getListData = (value: Dayjs) => {
    const listData: any[] = [];
    const dateStr = value.format('YYYY-MM-DD');
    
    // 定义一个颜色数组，用于循环分配给课程
    const colors = ['#f50', '#2db7f5', '#87d068', '#108ee9', '#722ed1', '#eb2f96', '#fa8c16', '#faad14', '#13c2c2', '#52c41a'];

    courses.forEach((course, index) => {
      // 课程必须有 subject 和 teacher 信息才展示（或者根据需求可选）
      // if (!course.subject || !course.teacher) return;

      const start = dayjs(course.start_date);
      const end = dayjs(course.end_date);
      
      // 判断日期是否在课程起止范围内
      if (value.isAfter(start.subtract(1, 'day')) && value.isBefore(end.add(1, 'day'))) {
        let shouldShow = false;
        
        if (course.schedule_type === 'daily') {
          shouldShow = true;
        } else if (course.schedule_type === 'weekly' || course.schedule_type === 'biweekly') {
          // 如果是每周或隔周，检查 schedule_days 是否包含当前周几
          if (course.schedule_days) {
            const currentDay = value.day().toString(); // 0-6
            let days: string[] = [];
            if (typeof course.schedule_days === 'string') {
                days = (course.schedule_days as string).split(',');
            } else if (Array.isArray(course.schedule_days)) {
                days = course.schedule_days;
            }
            
            if (days.includes(currentDay)) {
                // 对于隔周，还需要判断是否是上课周 (简单逻辑：根据开始日期算起)
                if (course.schedule_type === 'biweekly') {
                    const diffWeeks = value.diff(start, 'week');
                    if (diffWeeks % 2 === 0) {
                        shouldShow = true;
                    }
                } else {
                    shouldShow = true;
                }
            }
          }
        }

        if (shouldShow) {
          listData.push({
            type: 'success',
            content: `${course.name} - ${course.subject?.name || '未知科目'} (${course.teacher?.name || '未知教师'})`,
            course,
            color: colors[course.id % colors.length], // 根据课程ID分配颜色
          });
        }
      }
    });
    return listData;
  };

  const dateCellRender = (value: Dayjs) => {
    const listData = getListData(value);
    return (
      <ul className="events" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {listData.map((item, index) => (
          <li key={index} onClick={() => {
            setSelectedCourse(item.course);
            setIsModalOpen(true);
          }} style={{ marginBottom: 4, cursor: 'pointer' }}>
            <Tooltip title={item.content}>
              <div style={{ display: 'flex', alignItems: 'start' }}>
                <Badge color={item.color} />
                <span style={{ marginLeft: 8, fontSize: 12, lineHeight: '1.2' }}>{item.content}</span>
              </div>
            </Tooltip>
          </li>
        ))}
      </ul>
    );
  };

  const onPanelChange = (value: Dayjs, mode: string) => {
      // 只有在月份模式下切换才重新获取数据
      // 实际上 Calendar 只有 month 和 year 两种 mode，默认是 month
      // 如果从 month 切换到 year，或者在 month 模式下切换月份，都需要获取数据
      fetchCourses(value);
  };

  const onSelect = (value: Dayjs) => {
      // 检查是否切换了月份
      if (!value.isSame(currentDate, 'month')) {
          // fetchCourses(value); // 注释掉，因为 Calendar 切换月份时会自动触发 onPanelChange
      }
  };

  return (
    <Card>
      <Calendar dateCellRender={dateCellRender} onPanelChange={onPanelChange} onSelect={onSelect} />
      <Modal 
        title="课程详情" 
        open={isModalOpen} 
        onOk={() => setIsModalOpen(false)} 
        onCancel={() => setIsModalOpen(false)}
      >
        {selectedCourse && (
          <Descriptions column={1}>
            <Descriptions.Item label="课程名称">{selectedCourse.name}</Descriptions.Item>
            <Descriptions.Item label="科目">{selectedCourse.subject?.name}</Descriptions.Item>
            <Descriptions.Item label="任课老师">{selectedCourse.teacher?.name}</Descriptions.Item>
            <Descriptions.Item label="上课周期">
                {selectedCourse.schedule_type === 'weekly' ? '每周' : 
                 selectedCourse.schedule_type === 'daily' ? '每天' : 
                 selectedCourse.schedule_type === 'biweekly' ? '隔周' : selectedCourse.schedule_type}
            </Descriptions.Item>
            <Descriptions.Item label="上课日">
                {selectedCourse.schedule_days ? (() => {
                    let days: string[] = [];
                    if (typeof selectedCourse.schedule_days === 'string') {
                        days = (selectedCourse.schedule_days as string).split(',');
                    } else if (Array.isArray(selectedCourse.schedule_days)) {
                        days = selectedCourse.schedule_days;
                    }
                    const map: any = { '1': '周一', '2': '周二', '3': '周三', '4': '周四', '5': '周五', '6': '周六', '0': '周日' };
                    return days.map((d: string) => map[d]).join(', ');
                })() : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="上课时间">{selectedCourse.start_time} - {selectedCourse.end_time}</Descriptions.Item>
            <Descriptions.Item label="当前人数">{selectedCourse.current_students}/{selectedCourse.max_students}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </Card>
  );
};

export default CourseCalendar;
