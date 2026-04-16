<script setup>
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import AdminShell from '../../components/AdminShell.vue';
import {
  createArticleApi,
  deleteArticleApi,
  getArticleDetailApi,
  getArticleListApi,
  updateArticleApi,
  updateArticleStatusApi
} from '../../api/article';

const loading = ref(false);
const dialogVisible = ref(false);
const dialogMode = ref('create');
const formRef = ref();
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
});
const filters = reactive({
  keyword: '',
  categoryCode: ''
});
const tableData = ref([]);
const categoryOptions = [
  { label: '城市风味', value: 3, code: 'food' },
  { label: '非遗客家', value: 4, code: 'heritage' },
  { label: '红色文化', value: 5, code: 'red_culture' }
];
const form = reactive({
  id: null,
  title: '',
  categoryId: 3,
  coverImage: '',
  summary: '',
  quote: '',
  content: '',
  source: '',
  author: '',
  tags: '',
  recommendFlag: 0,
  status: 1
});

const rules = {
  title: [{ required: true, message: '请输入文章标题', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择文章分类', trigger: 'change' }]
};

function resetForm() {
  Object.assign(form, {
    id: null,
    title: '',
    categoryId: 3,
    coverImage: '',
    summary: '',
    quote: '',
    content: '',
    source: '',
    author: '',
    tags: '',
    recommendFlag: 0,
    status: 1
  });
}

function buildPayload() {
  return {
    title: form.title,
    categoryId: form.categoryId,
    coverImage: form.coverImage,
    summary: form.summary,
    quote: form.quote,
    content: form.content,
    source: form.source,
    author: form.author,
    tags: form.tags,
    recommendFlag: form.recommendFlag,
    status: form.status
  };
}

async function loadTable() {
  loading.value = true;

  try {
    const response = await getArticleListApi({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: filters.keyword,
      categoryCode: filters.categoryCode
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

async function openEditDialog(row) {
  const response = await getArticleDetailApi(row.id);
  dialogMode.value = 'edit';
  Object.assign(form, {
    ...response.data,
    tags: (response.data.tags || []).join(',')
  });
  dialogVisible.value = true;
}

async function submitForm() {
  const valid = await formRef.value.validate().catch(() => false);

  if (!valid) {
    return;
  }

  const payload = buildPayload();

  try {
    if (dialogMode.value === 'create') {
      await createArticleApi(payload);
      ElMessage.success('文章已创建');
    } else {
      await updateArticleApi(form.id, payload);
      ElMessage.success('文章已更新');
    }

    dialogVisible.value = false;
    await loadTable();
  } catch (error) {
    // 请求拦截器已统一处理提示
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确认删除文章“${row.title}”吗？`, '删除确认', { type: 'warning' });
    await deleteArticleApi(row.id);
    ElMessage.success('文章已删除');
    await loadTable();
  } catch (error) {
    // 取消删除时不额外提示
  }
}

async function handleStatusChange(row, value) {
  try {
    await updateArticleStatusApi(row.id, { status: value ? 1 : 0 });
    ElMessage.success('状态已更新');
    await loadTable();
  } catch (error) {
    // 请求拦截器已统一处理提示
  }
}

function handleSearch() {
  pagination.page = 1;
  loadTable();
}

onMounted(loadTable);
</script>

<template>
  <AdminShell>
    <div class="admin-page admin-page--stack">
      <el-card>
        <div class="admin-toolbar">
          <div class="admin-toolbar__grow">
            <div class="admin-page-title">文章内容管理</div>
            <div class="admin-muted-text">
              这里维护前台专题文章、专题详情页和 AI 引用素材。标题、摘要、引语和正文都会直接影响前台叙事效果。
            </div>
          </div>
        </div>
      </el-card>

      <el-card>
        <div class="admin-toolbar">
          <el-input
            v-model="filters.keyword"
            class="admin-toolbar__grow"
            placeholder="按文章标题或摘要搜索"
            clearable
          />
          <el-select v-model="filters.categoryCode" class="admin-toolbar__select" placeholder="选择分类" clearable>
            <el-option v-for="item in categoryOptions" :key="item.code" :label="item.label" :value="item.code" />
          </el-select>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="openCreateDialog">新建文章</el-button>
        </div>

        <el-table v-loading="loading" :data="tableData" border>
          <el-table-column prop="id" label="ID" width="70" />
          <el-table-column prop="title" label="文章标题" min-width="220" />
          <el-table-column prop="categoryName" label="所属分类" width="140" />
          <el-table-column prop="recommendFlag" label="推荐" width="90">
            <template #default="{ row }">
              <el-tag :type="row.recommendFlag ? 'danger' : 'info'">
                {{ row.recommendFlag ? '推荐中' : '普通' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="120">
            <template #default="{ row }">
              <el-switch :model-value="row.status === 1" @change="(value) => handleStatusChange(row, value)" />
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

      <el-dialog v-model="dialogVisible" :title="dialogMode === 'create' ? '新建文章' : '编辑文章'" width="760px">
        <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
          <el-form-item label="文章标题" prop="title">
            <el-input v-model="form.title" />
          </el-form-item>
          <el-form-item label="文章分类" prop="categoryId">
            <el-select v-model="form.categoryId" class="admin-form-control">
              <el-option v-for="item in categoryOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="封面图片">
            <el-input v-model="form.coverImage" placeholder="/uploads/... 或 /immersive/..." />
          </el-form-item>
          <el-form-item label="摘要">
            <el-input
              v-model="form.summary"
              type="textarea"
              rows="3"
              placeholder="前台列表页与详情页开头会优先展示摘要。"
            />
          </el-form-item>
          <el-form-item label="引语">
            <el-input
              v-model="form.quote"
              type="textarea"
              rows="2"
              placeholder="一句有记忆点的引语，适合前台详情页做章节开场。"
            />
          </el-form-item>
          <el-form-item label="正文">
            <el-input v-model="form.content" type="textarea" rows="7" />
          </el-form-item>
          <el-form-item label="来源">
            <el-input v-model="form.source" />
          </el-form-item>
          <el-form-item label="作者">
            <el-input v-model="form.author" />
          </el-form-item>
          <el-form-item label="标签">
            <el-input v-model="form.tags" placeholder="多个标签请用英文逗号分隔" />
          </el-form-item>
          <el-form-item label="首页推荐">
            <el-switch v-model="form.recommendFlag" :active-value="1" :inactive-value="0" />
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
