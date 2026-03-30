import { createRouter, createWebHashHistory } from 'vue-router'
import { isLoggedIn, isDevBypassEnabled, useAppCacheState } from './utils/storage'


// 导入页面组件
const Welcome = () => import('./pages/welcome/welcome.vue')
const Survey = () => import('./pages/Survey.vue')
const ProductIntro = () => import('./pages/ProductIntro.vue')
const Payment = () => import('./pages/Payment.vue')
const Login = () => import('./pages/Login.vue')
const Home = () => import('./pages/Home.vue')
const Plan = () => import('./pages/plan/plan.vue')
const Panic = () => import('./pages/panic/panic.vue')
const LegalPage = () => import('./pages/legal/LegalPage.vue')

const routes = [
  {
    path: '/',
    redirect: '/welcome'
  },
  {
    path: '/welcome',
    name: 'Welcome',
    component: Welcome
  },
  {
    path: '/survey',
    name: 'Survey',
    component: Survey
  },
  {
    path: '/product-intro',
    name: 'ProductIntro',
    component: ProductIntro
  },
  {
    path: '/payment',
    name: 'Payment',
    component: Payment
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/home',
    name: 'Home',
    component: Home
  },
  {
    path: '/plan',
    name: 'Plan',
    component: Plan
  },
  {
    path: '/panic',
    name: 'Panic',
    component: Panic
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('./pages/profile/profile.vue')
  },
  {
    path: '/withdraw',
    name: 'Withdraw',
    component: () => import('./pages/withdraw/withdraw.vue')
  },
  {
    path: '/legal/terms',
    name: 'LegalTerms',
    component: LegalPage,
    meta: {
      publicPage: true,
      legalType: 'terms'
    }
  },
  {
    path: '/legal/privacy',
    name: 'LegalPrivacy',
    component: LegalPage,
    meta: {
      publicPage: true,
      legalType: 'privacy'
    }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }

    return {
      top: 0,
      left: 0
    }
  }
})

// 全局路由拦截
const protectedRoutes = ['/home', '/plan', '/panic', '/profile', '/withdraw']

router.beforeEach((to, from, next) => {
  const { hasPaidAccess, surveyResult } = useAppCacheState()
  const loggedIn = isLoggedIn()
  const devBypass = isDevBypassEnabled()
  const hasCompletedSurvey = !!surveyResult.value?.completed
  const isProtected = protectedRoutes.includes(to.path)

  // 开发绕过模式: 直接放行到首页
  if (devBypass) {
    console.log('[Router] 开发绕过模式已启用，跳过路由守卫')
    return next()
  }

  // 1. 未完成问卷的强制拦截（排除一些允许的公开页面）
  // 必须允许 /survey 和 /welcome，否则死循环
  const allowWithoutSurvey = ['/welcome', '/survey', '/legal/terms', '/legal/privacy']
  if (!hasCompletedSurvey && !allowWithoutSurvey.includes(to.path)) {
    return next('/welcome')
  }

  // 2. 保护页面核心逻辑：
  if (isProtected) {
    if (!loggedIn) {
      return next('/login')
    }
    if (!hasPaidAccess.value) {
      return next('/payment')
    }
  }

  // 3. 已付费已登录状态防迷路：反向拦截
  const antiRoutes = ['/welcome', '/login', '/payment']
  if (loggedIn && hasPaidAccess.value && antiRoutes.includes(to.path)) {
    return next('/home')
  }

  next()
})

export default router
