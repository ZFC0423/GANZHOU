<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { loginApi } from '../../api/auth';
import { setToken } from '../../utils/auth';

const router = useRouter();
const loading = ref(false);
const formRef = ref();
const form = reactive({
  username: 'admin',
  password: 'Admin@123456'
});

const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
};

async function handleLogin() {
  const valid = await formRef.value.validate().catch(() => false);

  if (!valid) {
    return;
  }

  loading.value = true;

  try {
    const response = await loginApi(form);
    setToken(response.data.token);
    ElMessage.success('登录成功');
    router.push('/admin/dashboard');
  } catch (error) {
    // 请求提示由拦截器统一处理
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="admin-auth">
    <div class="admin-auth__panel">
      <div class="admin-auth__intro">
        <div class="admin-auth__kicker">Ganzhou Scroll Admin</div>
        <h1 class="admin-auth__title">赣州长卷后台</h1>
        <p class="admin-auth__desc">
          在这里维护首页章节、景点叙事、专题内容与 AI 运营能力，保证前后台呈现一致。
        </p>
      </div>

      <el-card class="admin-auth__card" shadow="never">
        <template #header>
          <div class="admin-auth__header">
            <div class="admin-auth__title-small">管理员登录</div>
            <div class="admin-auth__hint">默认演示账号已预填，可直接进入后台。</div>
          </div>
        </template>
        <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
          <el-form-item label="账号" prop="username">
            <el-input v-model="form.username" placeholder="请输入管理员账号" />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input v-model="form.password" type="password" show-password placeholder="请输入密码" />
          </el-form-item>
          <el-button type="primary" :loading="loading" class="admin-auth__submit" @click="handleLogin">
            {{ loading ? '正在登录...' : '进入后台' }}
          </el-button>
        </el-form>
      </el-card>
    </div>
  </div>
</template>
