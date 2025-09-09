// RBAC 权限系统初始化脚本
const Permission = require('./permission');
const Role = require('./role');
const BackgroundUser = require('./backgroundUser');
const PrimaryNavigation = require('./primaryNavigation');
const SecondaryNavigation = require('./secondaryNavigation');

/**
 * 初始化权限数据
 */
async function initPermissions() {
  const permissions = [
    // 系统管理权限
    {
      name: '系统设置',
      code: 'SYSTEM_SETTING',
      description: '系统参数配置',
      group: 'system',
      type: 'menu',
      resource: '/system',
    },
    {
      name: '用户管理',
      code: 'USER_MANAGEMENT',
      description: '后台用户管理',
      group: 'user',
      type: 'menu',
      resource: '/users',
    },
    {
      name: '角色管理',
      code: 'ROLE_MANAGEMENT',
      description: '角色权限管理',
      group: 'user',
      type: 'menu',
      resource: '/roles',
    },
    {
      name: '权限管理',
      code: 'PERMISSION_MANAGEMENT',
      description: '权限配置管理',
      group: 'user',
      type: 'menu',
      resource: '/permissions',
    },

    // 导航管理权限
    {
      name: '导航管理',
      code: 'NAVIGATION_MANAGEMENT',
      description: '系统导航管理',
      group: 'navigation',
      type: 'menu',
      resource: '/navigation',
    },
    {
      name: '一级导航管理',
      code: 'PRIMARY_NAV_MANAGEMENT',
      description: '一级导航增删改查',
      group: 'navigation',
      type: 'menu',
      resource: '/navigation/primary',
    },
    {
      name: '二级导航管理',
      code: 'SECONDARY_NAV_MANAGEMENT',
      description: '二级导航增删改查',
      group: 'navigation',
      type: 'menu',
      resource: '/navigation/secondary',
    },

    // 内容管理权限
    {
      name: '内容管理',
      code: 'CONTENT_MANAGEMENT',
      description: '短剧内容管理',
      group: 'content',
      type: 'menu',
      resource: '/content',
    },
    {
      name: '分类管理',
      code: 'CLASSIFIER_MANAGEMENT',
      description: '短剧分类管理',
      group: 'content',
      type: 'menu',
      resource: '/content/classifiers',
    },
    {
      name: '合集管理',
      code: 'COLLECTION_MANAGEMENT',
      description: '短剧合集管理',
      group: 'content',
      type: 'menu',
      resource: '/content/collections',
    },
    {
      name: '作品管理',
      code: 'WORK_MANAGEMENT',
      description: '短剧作品管理',
      group: 'content',
      type: 'menu',
      resource: '/content/works',
    },
    {
      name: '评论管理',
      code: 'COMMENT_MANAGEMENT',
      description: '用户评论管理',
      group: 'content',
      type: 'menu',
      resource: '/content/comments',
    },
    {
      name: '活动管理',
      code: 'ACTIVITY_MANAGEMENT',
      description: '平台活动管理',
      group: 'content',
      type: 'menu',
      resource: '/content/activities',
    },

    // 数据统计权限
    {
      name: '数据统计',
      code: 'DATA_STATISTICS',
      description: '数据统计分析',
      group: 'data',
      type: 'menu',
      resource: '/statistics',
    },
    {
      name: '用户数据',
      code: 'USER_DATA',
      description: '用户行为数据',
      group: 'data',
      type: 'menu',
      resource: '/statistics/users',
    },
    {
      name: '播放数据',
      code: 'PLAY_DATA',
      description: '播放统计数据',
      group: 'data',
      type: 'menu',
      resource: '/statistics/plays',
    },
    {
      name: '收藏数据',
      code: 'COLLECT_DATA',
      description: '收藏统计数据',
      group: 'data',
      type: 'menu',
      resource: '/statistics/collects',
    },

    // 按钮和操作权限
    { name: '新增操作', code: 'CREATE_OPERATION', description: '新增数据权限', group: 'system', type: 'button' },
    { name: '编辑操作', code: 'UPDATE_OPERATION', description: '编辑数据权限', group: 'system', type: 'button' },
    { name: '删除操作', code: 'DELETE_OPERATION', description: '删除数据权限', group: 'system', type: 'button' },
    { name: '查看操作', code: 'VIEW_OPERATION', description: '查看数据权限', group: 'system', type: 'button' },
    { name: '导出操作', code: 'EXPORT_OPERATION', description: '数据导出权限', group: 'system', type: 'button' },
  ];

  for (const permData of permissions) {
    await Permission.findOneAndUpdate({ code: permData.code }, permData, { upsert: true, new: true });
  }

  console.log('权限数据初始化完成');
}

/**
 * 初始化导航菜单
 */
async function initNavigations() {
  // 清空现有导航数据，避免重复创建
  await PrimaryNavigation.deleteMany({});
  await SecondaryNavigation.deleteMany({});

  const navPermissions = await Permission.find({
    group: { $in: ['system', 'user', 'navigation', 'content', 'data'] },
    type: 'menu',
  });

  const findPermId = code => {
    const perm = navPermissions.find(p => p.code === code);
    if (!perm) throw new Error(`权限 ${code} 未找到，请检查initPermissions`);
    return perm._id;
  };

  // 创建一级导航
  const primaryNavs = [
    {
      title: '系统管理',
      link: '/system',
      icon: 'Setting',
      order: 100,
      permission: findPermId('SYSTEM_SETTING'),
    },
    {
      title: '内容管理',
      link: '/content',
      icon: 'Document',
      order: 200,
      permission: findPermId('CONTENT_MANAGEMENT'),
    },
    {
      title: '数据统计',
      link: '/statistics',
      icon: 'DataLine',
      order: 300,
      permission: findPermId('DATA_STATISTICS'),
    },
  ];

  const createdPrimaryNavs = await PrimaryNavigation.insertMany(primaryNavs);
  const getPrimaryNavId = title => {
    const nav = createdPrimaryNavs.find(n => n.title === title);
    if (!nav) throw new Error(`一级导航 ${title} 未找到`);
    return nav._id;
  };

  // 创建二级导航
  const secondaryNavs = [
    // 系统管理
    {
      title: '用户管理',
      link: '/users',
      parentNavigation: getPrimaryNavId('系统管理'),
      permission: findPermId('USER_MANAGEMENT'),
      order: 101,
    },
    {
      title: '角色管理',
      link: '/roles',
      parentNavigation: getPrimaryNavId('系统管理'),
      permission: findPermId('ROLE_MANAGEMENT'),
      order: 102,
    },
    {
      title: '权限管理',
      link: '/permissions',
      parentNavigation: getPrimaryNavId('系统管理'),
      permission: findPermId('PERMISSION_MANAGEMENT'),
      order: 103,
    },
    // 内容管理
    {
      title: '分类管理',
      link: '/content/classifiers',
      parentNavigation: getPrimaryNavId('内容管理'),
      permission: findPermId('CLASSIFIER_MANAGEMENT'),
      order: 201,
    },
    {
      title: '合集管理',
      link: '/content/collections',
      parentNavigation: getPrimaryNavId('内容管理'),
      permission: findPermId('COLLECTION_MANAGEMENT'),
      order: 202,
    },
    {
      title: '作品管理',
      link: '/content/works',
      parentNavigation: getPrimaryNavId('内容管理'),
      permission: findPermId('WORK_MANAGEMENT'),
      order: 203,
    },
    // 数据统计
    {
      title: '用户数据',
      link: '/statistics/users',
      parentNavigation: getPrimaryNavId('数据统计'),
      permission: findPermId('USER_DATA'),
      order: 301,
    },
    {
      title: '播放数据',
      link: '/statistics/plays',
      parentNavigation: getPrimaryNavId('数据统计'),
      permission: findPermId('PLAY_DATA'),
      order: 302,
    },
  ];

  await SecondaryNavigation.insertMany(secondaryNavs);

  console.log('导航菜单初始化完成');
}

/**
 * 初始化角色数据
 */
async function initRoles() {
  // 获取所有权限
  const allPermissions = await Permission.find({ status: 'active' });
  const permissionIds = allPermissions.map(p => p._id);

  const roles = [
    {
      name: '超级管理员',
      code: 'SUPER_ADMIN',
      description: '拥有系统所有权限',
      level: 1,
      permissions: permissionIds, // 所有权限
      isBuiltIn: true,
    },
    {
      name: '内容管理员',
      code: 'CONTENT_MANAGER',
      description: '负责内容创建和管理',
      level: 10,
      permissions: allPermissions.filter(p => p.group === 'content' || p.group === 'navigation').map(p => p._id),
      isBuiltIn: true,
    },
    {
      name: '数据分析员',
      code: 'DATA_ANALYST',
      description: '负责数据统计和分析',
      level: 20,
      permissions: allPermissions.filter(p => p.group === 'data' || p.code === 'VIEW_OPERATION').map(p => p._id),
      isBuiltIn: true,
    },
    {
      name: '审核员',
      code: 'MODERATOR',
      description: '负责内容审核',
      level: 30,
      permissions: allPermissions
        .filter(p => ['COMMENT_MANAGEMENT', 'VIEW_OPERATION', 'UPDATE_OPERATION'].includes(p.code))
        .map(p => p._id),
      isBuiltIn: true,
    },
  ];

  for (const roleData of roles) {
    await Role.findOneAndUpdate({ code: roleData.code }, roleData, { upsert: true, new: true });
  }

  console.log('角色数据初始化完成');
}

/**
 * 创建默认超级管理员账号
 */
async function createSuperAdmin() {
  const superAdminRole = await Role.findOne({ code: 'SUPER_ADMIN' });

  if (!superAdminRole) {
    throw new Error('超级管理员角色不存在，请先初始化角色');
  }

  const adminData = {
    account: 'admin',
    password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    name: '超级管理员',
    email: 'admin@shortplay.com',
    roles: [superAdminRole._id],
    status: 'active',
  };

  const existingAdmin = await BackgroundUser.findOne({ account: 'admin' });
  if (!existingAdmin) {
    await BackgroundUser.create(adminData);
    console.log('默认超级管理员账号创建完成');
    console.log('账号: admin, 密码: password');
  } else {
    console.log('超级管理员账号已存在');
  }
}

/**
 * 完整的RBAC初始化
 */
async function initRBACSystem() {
  try {
    console.log('开始初始化RBAC权限系统...');

    await initPermissions();
    await initNavigations(); // 添加导航初始化
    await initRoles();
    await createSuperAdmin();

    console.log('✅ RBAC权限系统初始化完成!');
  } catch (error) {
    console.error('❌ RBAC初始化失败:', error);
    throw error;
  }
}

module.exports = {
  initPermissions,
  initRoles,
  createSuperAdmin,
  initRBACSystem,
  initNavigations, // 导出新函数
};
