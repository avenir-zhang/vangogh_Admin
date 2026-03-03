/**
 * @see https://umijs.org/docs/max/access#access
 * */
export default function access(
  initialState: { currentUser?: API.CurrentUser } | undefined,
) {
  const { currentUser } = initialState ?? {};
  // 检查 user_role 是否存在，并获取 permissions
  const permissions = currentUser?.user_role?.permissions?.map((p: any) => p.key) || [];
  
  // 核心管理员权限
  const isSuperAdmin = currentUser?.username === 'admin' || currentUser?.user_role?.name === 'super_admin';

  return {
    canAdmin: currentUser && currentUser.access === 'admin',
    
    // 权限管理
    canAccessAccess: isSuperAdmin || permissions.includes('access.view'),
    
    // 仪表盘
    canViewDashboard: isSuperAdmin || permissions.includes('dashboard.view'),
    
    // 教务管理
    canViewAcademic: isSuperAdmin || permissions.some((p: string) => ['student.view', 'teacher.view', 'subject.view', 'course.view', 'stats.view'].includes(p)),
    canViewStudent: isSuperAdmin || permissions.includes('student.view'),
    canViewTeacher: isSuperAdmin || permissions.includes('teacher.view'),
    canViewSubject: isSuperAdmin || permissions.includes('subject.view'),
    canViewCourse: isSuperAdmin || permissions.includes('course.view'),
    canViewStats: isSuperAdmin || permissions.includes('stats.view'),
    
    // 财务管理
    canViewFinance: isSuperAdmin || permissions.some((p: string) => ['order.view'].includes(p)),
    canViewOrder: isSuperAdmin || permissions.includes('order.view'),

    // 操作权限
    canCreateStudent: isSuperAdmin || permissions.includes('student.create'),
    canEditStudent: isSuperAdmin || permissions.includes('student.edit'),
    canDeleteStudent: isSuperAdmin || permissions.includes('student.delete'),
    
    canCreateTeacher: isSuperAdmin || permissions.includes('teacher.create'),
    canEditTeacher: isSuperAdmin || permissions.includes('teacher.edit'),
    canDeleteTeacher: isSuperAdmin || permissions.includes('teacher.delete'),
    
    canCreateSubject: isSuperAdmin || permissions.includes('subject.create'),
    canEditSubject: isSuperAdmin || permissions.includes('subject.edit'),
    canDeleteSubject: isSuperAdmin || permissions.includes('subject.delete'),
    
    canCreateCourse: isSuperAdmin || permissions.includes('course.create'),
    canEditCourse: isSuperAdmin || permissions.includes('course.edit'),
    canDeleteCourse: isSuperAdmin || permissions.includes('course.delete'),
    
    canCreateOrder: isSuperAdmin || permissions.includes('order.create'),
    canEditOrder: isSuperAdmin || permissions.includes('order.edit'),
    canDeleteOrder: isSuperAdmin || permissions.includes('order.delete'),
    
    // 订单详情页操作
    canSupplementOrder: isSuperAdmin || permissions.includes('order.supplement'),
    canTransferOrder: isSuperAdmin || permissions.includes('order.transfer'),
    canRevokeOrder: isSuperAdmin || permissions.includes('order.revoke'),
    canRefundOrder: isSuperAdmin || permissions.includes('order.refund'),
    canEditOrderExpire: isSuperAdmin || permissions.includes('order.edit_expire'),
    
    // 学员详情页操作
    canExportAttendance: isSuperAdmin || permissions.includes('student.export_attendance'),
  };
}
