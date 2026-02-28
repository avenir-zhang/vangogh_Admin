export default [
  {
    path: '/user',
    layout: false,
    routes: [
      { name: '登录', path: '/user/login', component: './user/login' },
      { component: './404' },
    ],
  },
  { path: '/welcome', name: '欢迎', icon: 'smile', component: './Welcome' },
  {
    path: '/admin',
    name: '管理页',
    icon: 'crown',
    access: 'canAdmin',
    routes: [
      { path: '/admin', redirect: '/admin/sub-page' },
      { path: '/admin/sub-page', name: '二级管理页', component: './Admin' },
    ],
  },
  { name: '仪表盘', icon: 'dashboard', path: '/dashboard', component: './Dashboard' },
  {
    name: '教务管理',
    icon: 'appstore',
    path: '/academic',
    routes: [
      { name: '学员管理', path: '/academic/student', component: './Student' },
      { path: '/academic/student/detail/:id', component: './Student/Detail', hideInMenu: true, name: '学员详情' },
      { name: '教师管理', path: '/academic/teacher', component: './Teacher' },
      { name: '科目管理', path: '/academic/subject', component: './Subject' },
      { name: '课程管理', path: '/academic/course', component: './Course' },
      { path: '/academic/course/detail/:id', name: '课程详情', component: './Course/Detail', hideInMenu: true },
      { name: '课程日历', path: '/academic/calendar', component: './Calendar' },
      { name: '签到记录', path: '/academic/attendance', component: './Attendance' },
      { path: '/academic', redirect: '/academic/student' },
    ],
  },
  {
    name: '财务管理',
    icon: 'pay-circle',
    path: '/finance',
    routes: [
        { path: '/finance/analysis', name: '财务总览', component: './Finance' },
        { path: '/finance/order', name: '订单管理', component: './Order' },
        { path: '/finance/order/create', name: '新建订单', component: './Order/Create', hideInMenu: true },
        { path: '/finance/order/detail/:id', name: '订单详情', component: './Order/Detail', hideInMenu: true },
        { path: '/finance', redirect: '/finance/analysis' },
    ]
  },
  { path: '/', redirect: '/dashboard' },
  { component: './404' },
];
