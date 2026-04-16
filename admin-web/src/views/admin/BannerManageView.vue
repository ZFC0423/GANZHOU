<script setup>
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import AdminShell from '../../components/AdminShell.vue';
import {
  createBannerApi,
  deleteBannerApi,
  getBannerListApi,
  updateBannerApi
} from '../../api/banner';
import { getToken } from '../../utils/auth';

const loading = ref(false);
const dialogVisible = ref(false);
const dialogMode = ref('create');
const formRef = ref();
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
});
const tableData = ref([]);
const uploadAction = `${import.meta.env.VITE_ADMIN_API_BASE || 'http://localhost:3000'}/api/admin/upload/image`;
const form = reactive({
  id: null,
  title: '',
  imageUrl: '',
  linkType: '',
  linkTarget: '',
  sort: 0,
  status: 1
});

const rules = {
  title: [{ required: true, message: '请输入轮播图标题', trigger: 'blur' }],
  imageUrl: [{ required: true, message: '请填写轮播图地址', trigger: 'blur' }]
};

function resetForm() {
  Object.assign(form, {
    id: null,
    title: '',
    imageUrl: '',
    linkType: '',
    linkTarget: '',
    sort: 0,
    status: 1
  });
}

const uploadHeaders = {
  Authorization: `Bearer ${getToken()}`
};

function handleBannerUploadSuccess(response) {
  form.imageUrl = response.data.url;
  ElMessage.success('轮播图上传成功');
}

function handleUploadError() {
  ElMessage.error('上传失败');
}

async function loadTable() {
  loading.value = true;

  try {
    const response = await getBannerListApi({
      page: pagination.page,
      pageSize: pagination.pageSize
    });

    tableData.value = response.data.list;
    pagination.total = response.data.total;
  } finally {
    loading.value = false;
  }
}

function openCreateDialog() {
  dialogMode.value = 'create';
  resetForm();
  dialogVisible.value = true;
}

function openEditDialog(row) {
  dialogMode.value = 'edit';
  Object.assign(form, row);
  dialogVisible.value = true;
}

async function submitForm() {
  const valid = await formRef.value.validate().catch(() => false);

  if (!valid) {
    return;
  }

  const payload = {
    title: form.title,
    imageUrl: form.imageUrl,
    linkType: form.linkType,
    linkTarget: form.linkTarget,
    sort: form.sort,
    status: form.status
  };

  try {
    if (dialogMode.value === 'create') {
      await createBannerApi(payload);
      ElMessage.success('轮播图已创建');
    } else {
      await updateBannerApi(form.id, payload);
      ElMessage.success('轮播图已更新');
    }

    dialogVisible.value = false;
    await loadTable();
  } catch (error) {
    // 请求拦截器已统一处理提示
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确认删除轮播图“${row.title}”吗？`, '删除确认', { type: 'warning' });
    await deleteBannerApi(row.id);
    ElMessage.success('轮播图已删除');
    await loadTable();
  } catch (error) {
    // 取消删除时不额外提示
  }
}

onMounted(loadTable);
</script>

<template>
  <AdminShell>
    <div class="admin-page admin-page--stack">
      <el-card>
        <div class="admin-toolbar">
          <div class="admin-toolbar__grow">
            <div class="admin-page-title">轮播图管理</div>
            <div class="admin-muted-text">
              轮播图主要服务旧版首页和后台素材管理。即使前台已经转向沉浸式首页，这里仍建议保持清晰的素材台账。
            </div>
          </div>
          <el-button @click="openCreateDialog">新建轮播图</el-button>
        </div>
      </el-card>

      <el-card>
        <el-table v-loading="loading" :data="tableData" border>
          <el-table-column prop="id" label="ID" width="70" />
          <el-table-column prop="title" label="标题" min-width="180" />
          <el-table-column prop="imageUrl" label="图片地址" min-width="220" />
          <el-table-column prop="sort" label="排序" width="100" />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'info'">
                {{ row.status === 1 ? '启用' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>
              <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="admin-pagination">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            layout="total, prev, pager, next"
            :total="pagination.total"
            @current-change="loadTable"
          />
        </div>
      </el-card>

      <el-dialog v-model="dialogVisible" :title="dialogMode === 'create' ? '新建轮播图' : '编辑轮播图'" width="640px">
        <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
          <el-form-item label="轮播标题" prop="title">
            <el-input v-model="form.title" />
          </el-form-item>
          <el-form-item label="图片地址" prop="imageUrl">
            <div class="admin-form-stack">
              <el-input v-model="form.imageUrl" placeholder="/uploads/... 或 /immersive/..." />
              <el-upload
                :action="uploadAction"
                :headers="uploadHeaders"
                :show-file-list="false"
                class="admin-form-stack__action"
                @success="handleBannerUploadSuccess"
                @error="handleUploadError"
              >
                <el-button>上传图片</el-button>
              </el-upload>
            </div>
          </el-form-item>
          <el-form-item label="链接类型">
            <el-input v-model="form.linkType" placeholder="例如：scenic / article / custom" />
          </el-form-item>
          <el-form-item label="链接目标">
            <el-input v-model="form.linkTarget" />
          </el-form-item>
          <el-form-item label="排序">
            <el-input-number v-model="form.sort" :min="0" />
          </el-form-item>
          <el-form-item label="启用状态">
            <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm">保存</el-button>
        </template>
      </el-dialog>
    </div>
  </AdminShell>
</template>
