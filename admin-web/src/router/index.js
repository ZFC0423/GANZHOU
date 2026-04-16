import { createRouter, createWebHistory } from 'vue-router';
import { getToken } from '../utils/auth';

const routes = [
  {
    path: '/',
    redirect: '/admin/login'
  },
  {
    path: '/admin/login',
    name: 'admin-login',
    component: () => import('../views/admin/LoginView.vue'),
    meta: {
      public: true,
      title: '管理员登录',
      subtitle: '进入赣州长卷后台工作区。'
    }
  },
  {
    path: '/admin/dashboard',
    name: 'admin-dashboard',
    component: () => import('../views/admin/DashboardView.vue'),
    meta: {
      title: '工作台',
      subtitle: '快速查看当前内容规模与常用入口。'
    }
  },
  {
    path: '/admin/home-recommend',
    name: 'admin-home-recommend',
    component: () => import('../views/admin/HomeRecommendView.vue'),
    meta: {
      title: '首页与章节配置',
      subtitle: '维护首页主视觉、章节语气和推荐编排。'
    }
  },
  {
    path: '/admin/scenic',
    name: 'admin-scenic-list',
    component: () => import('../views/admin/ScenicManageView.vue'),
    meta: {
      title: '景点管理',
      subtitle: '维护景点基础信息与前台叙事字段。'
    }
  },
  {
    path: '/admin/article',
    name: 'admin-article-list',
    component: () => import('../views/admin/ArticleManageView.vue'),
    meta: {
      title: '专题文章管理',
      subtitle: '维护专题内容、摘要、引语与展示状态。'
    }
  },
  {
    path: '/admin/banner',
    name: 'admin-banner',
    component: () => import('../views/admin/BannerManageView.vue'),
    meta: {
      title: '横幅素材管理',
      subtitle: '管理需要单独展示的横幅图片与跳转。'
    }
  },
  {
    path: '/admin/ai-copywriting',
    name: 'admin-ai-copywriting',
    component: () => import('../views/admin/AiCopywritingView.vue'),
    meta: {
      title: 'AI 文案生成',
      subtitle: '为景点和专题生成可编辑的运营文案。'
    }
  },
  {
    path: '/admin/ai-logs',
    name: 'admin-ai-logs',
    component: () => import('../views/admin/AiLogsView.vue'),
    meta: {
      title: 'AI 日志中心',
      subtitle: '查看 AI 问答、路线和文案生成记录。'
    }
  },
  {
    path: '/admin/ai-logs/chat',
    name: 'admin-ai-chat-logs',
    component: () => import('../views/admin/AiChatLogsView.vue'),
    meta: {
      title: 'AI 问答日志',
      subtitle: '查看用户问题、召回内容和最终回答。'
    }
  },
  {
    path: '/admin/ai-logs/trip',
    name: 'admin-ai-trip-logs',
    component: () => import('../views/admin/AiTripLogsView.vue'),
    meta: {
      title: 'AI 路线日志',
      subtitle: '查看行程输入、推荐结果与召回素材。'
    }
  },
  {
    path: '/admin/settings',
    name: 'admin-settings',
    component: () => import('../views/admin/SettingsView.vue'),
    meta: {
      title: '系统设置',
      subtitle: '维护基础配置与运行参数。'
    }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to, from, next) => {
  const token = getToken();

  if (!to.meta.public && !token) {
    next('/admin/login');
    return;
  }

  if (to.path === '/admin/login' && token) {
    next('/admin/dashboard');
    return;
  }

  next();
});

export default router;
