export default [
  {
    path: '/user',
    layout: false,
    routes: [
      { name: '登录', path: '/user/login', component: './user/login' },
      { component: './404' },
    ],
  },
  {
      path: '/share',
      layout: false,
      routes: [
          { path: '/share/attendance/:code', component: './Share/Attendance' },
      ],
  },
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
  { name: '仪表盘', icon: 'dashboard', path: '/dashboard', component: './Dashboard', access: 'canViewDashboard' },
  {
    name: '教务管理',
    icon: 'appstore',
    path: '/academic',
    access: 'canViewAcademic',
    routes: [
      { name: '教务图表', path: '/academic/stats', component: './Stats', access: 'canViewStats' },
      { name: '学员管理', path: '/academic/student', component: './Student', access: 'canViewStudent' },
      { path: '/academic/student/detail/:id', component: './Student/Detail', hideInMenu: true, name: '学员详情', access: 'canViewStudent' },
      { name: '教师管理', path: '/academic/teacher', component: './Teacher', access: 'canViewTeacher' },
      { path: '/academic/teacher/detail/:id', name: '教师详情', component: './Teacher/Detail', hideInMenu: true, access: 'canViewTeacher' },
      { name: '科目管理', path: '/academic/subject', component: './Subject', access: 'canViewSubject' },
      { name: '课程管理', path: '/academic/course', component: './Course', access: 'canViewCourse' },
      { path: '/academic/course/detail/:id', name: '课程详情', component: './Course/Detail', hideInMenu: true, access: 'canViewCourse' },
      { name: '课程日历', path: '/academic/calendar', component: './Calendar', access: 'canViewCourse' },
      { name: '签到记录', path: '/academic/attendance', component: './Attendance', access: 'canViewCourse' },
      { path: '/academic', redirect: '/academic/student' },
    ],
  },
  {
    name: '财务管理',
    icon: 'moneyCollect',
    path: '/finance',
    access: 'canViewFinance',
    routes: [
        { path: '/finance/analysis', name: '财务总览', component: './Finance', access: 'canViewOrder' },
        { path: '/finance/order', name: '订单管理', component: './Order', access: 'canViewOrder' },
        { path: '/finance/order/create', name: '新建订单', component: './Order/Create', hideInMenu: true, access: 'canViewOrder' },
        { path: '/finance/order/detail/:id', name: '订单详情', component: './Order/Detail', hideInMenu: true, access: 'canViewOrder' },
        { path: '/finance', redirect: '/finance/analysis' },
    ]
  },
  {
    name: '权限管理',
    path: '/access',
    icon: 'lock',
    access: 'canAccessAccess',
    routes: [
      {
        name: '角色管理',
        path: '/access/role',
        component: './Access/Role',
      },
      {
        name: '用户管理',
        path: '/access/user',
        component: './Access/User',
      },
    ],
  },
  { path: '/', redirect: '/dashboard' },
  { component: './404' },
];
